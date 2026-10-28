import {readPage,geminiBridge,interactPage} from './dom.js';
import {webUrl,buildPrompt} from './core.js';
const $=id=>document.getElementById(id);
let pages=[];
const status=text=>$('status').textContent=text;
function task(id,fn){$(id).addEventListener('click',async()=>{try{$(id).disabled=true;await fn();}catch(e){status(e.message);}finally{$(id).disabled=false;}});}
async function refresh(){
  const tabs=await chrome.tabs.query({currentWindow:true});
  $('tabs').replaceChildren();$('target').replaceChildren();$('tabs').className='tab-list';
  for(const tab of tabs.filter(t=>/^https?:/.test(t.url||'')&&!t.url.startsWith('https://gemini.google.com/'))){
    const option=document.createElement('option');option.value=tab.id;option.textContent=tab.title||tab.url;option.dataset.url=tab.url;$('target').append(option);
    const label=document.createElement('label');label.className='tab';
    const box=document.createElement('input');box.type='checkbox';box.value=tab.id;box.dataset.url=tab.url;
    const span=document.createElement('span');span.textContent=tab.title||tab.url;
    const small=document.createElement('small');small.textContent=new URL(tab.url).hostname;
    span.append(small);label.append(box,span);$('tabs').append(label);
  }
}
async function gemini(create=false){
  const tabs=await chrome.tabs.query({url:'https://gemini.google.com/*'});
  if(tabs.length)return tabs.find(t=>t.active)||tabs[0];
  if(create)return chrome.tabs.create({url:'https://gemini.google.com/app'});
  throw new Error('Open Gemini and sign in first.');
}
async function bridge(action,text){const tab=await gemini();const [result]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:geminiBridge,args:[action,text||'']});return result.result;}
task('refresh',refresh);
task('read',async()=>{
  pages=[];const selected=[...$('tabs').querySelectorAll('input:checked')];
  if(!selected.length)throw new Error('Select at least one tab.');
  if(selected.length>8)throw new Error('Select at most 8 tabs per request.');
  // Request permissions directly within the button gesture, before other awaits.
  const origins=[...new Set(selected.map(b=>new URL(b.dataset.url).origin+'/*'))];
  if(!await chrome.permissions.request({origins}))throw new Error('Page access was not granted.');
  const results=await Promise.allSettled(selected.map(async b=>{
    const tab=await chrome.tabs.get(Number(b.value));
    if(new URL(tab.url).origin!==new URL(b.dataset.url).origin)throw new Error('Tab navigated. Refresh and select it again.');
    const [r]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:readPage});return r.result;
  }));
  pages=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
  const failures=results.filter(r=>r.status==='rejected');
  $('context').textContent=`${pages.length} page(s) captured · ${pages.reduce((s,p)=>s+p.text.length,0).toLocaleString()} characters`;
  status(failures.length?`${failures.length} tab(s) could not be read: ${failures.map(r=>r.reason.message).join('; ')}`:'Context captured. Review your request before preparing it.');
});
task('open',()=>gemini(true));
task('prepare',async()=>{
  const q=$('question').value.trim();if(!q)throw new Error('Enter a request first.');
  const prompt=buildPrompt(q,pages);$('preview').value=prompt;
  const result=await bridge('prepare',prompt);const tab=await gemini();await chrome.tabs.update(tab.id,{active:true});status(result);
});
task('copy',async()=>{if(!$('preview').value)throw new Error('Prepare a prompt first.');await navigator.clipboard.writeText($('preview').value);status('Prompt copied.');});
task('reply',async()=>{$('answer').textContent=await bridge('read');status('Latest response imported. It may still be streaming; read again when finished.');});
task('navigate',async()=>{await chrome.tabs.create({url:webUrl($('url').value)});status('Page opened. Refresh tabs to add its context.');});
refresh().catch(e=>status(e.message));

task('execute',async()=>{
 const option=$('target').selectedOptions[0];if(!option)throw new Error('Refresh tabs and choose a target.');
 const id=Number(option.value),action=$('action').value,selector=$('selector').value.trim();
 if(!selector)throw new Error('Enter a CSS selector.');
 if(!confirm(`Run ${action} on ${option.textContent}?\nSelector: ${selector}\n${action==='click'?'Clicks can send forms, messages, or make purchases. Confirm only if you intend this action.':''}`))return;
 if(!await chrome.permissions.request({origins:[new URL(option.dataset.url).origin+'/*']}))throw new Error('Site access required.');
 const tab=await chrome.tabs.get(id);if(tab.url!==option.dataset.url)throw new Error('Tab navigated. Refresh before acting.');
 const [r]=await chrome.scripting.executeScript({target:{tabId:id},func:interactPage,args:[action,selector,$('value').value]});status(r.result);
});
