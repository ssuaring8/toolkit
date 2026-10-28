import {readPage,geminiBridge,interactPage} from './dom.js';
import {webUrl,buildPrompt,parseActionPlan,chooseSearchTool,searchArguments} from './core.js';
import {McpClient} from './mcp.js';

const $=id=>document.getElementById(id);
let pages=[],actionPlan=[],mcpTools=[];
let mcpClient=null,mcpResult=null;
const status=text=>$('status').textContent=text;
function task(id,fn){$(id).addEventListener('click',async()=>{try{$(id).disabled=true;await fn();}catch(error){status(error.message);}finally{$(id).disabled=id==='run-plan'&&!actionPlan.length;}});}
function targetTabId(){const option=$('target').selectedOptions[0];if(!option)throw new Error('Refresh tabs and choose a target tab.');return Number(option.value);}
function updateContextLabel(){$('context').textContent=`${pages.length} source(s) captured · ${pages.reduce((sum,page)=>sum+page.text.length,0).toLocaleString()} characters`;}

async function refresh(){
 const tabs=await chrome.tabs.query({currentWindow:true});
 $('tabs').replaceChildren();$('target').replaceChildren();$('tabs').className='tab-list';
 for(const tab of tabs.filter(item=>/^https?:/.test(item.url||'')&&!item.url.startsWith('https://gemini.google.com/'))){
  const option=document.createElement('option');option.value=tab.id;option.textContent=tab.title||tab.url;option.dataset.url=tab.url;$('target').append(option);
  const label=document.createElement('label');label.className='tab';
  const box=document.createElement('input');box.type='checkbox';box.value=tab.id;box.dataset.url=tab.url;
  const span=document.createElement('span');span.textContent=tab.title||tab.url;
  const small=document.createElement('small');small.textContent=`Tab ${tab.id} · ${new URL(tab.url).hostname}`;
  span.append(small);label.append(box,span);$('tabs').append(label);
 }
 $('current-url').value=$('target').selectedOptions[0]?.dataset.url||'';
}
async function gemini(create=false){const tabs=await chrome.tabs.query({url:'https://gemini.google.com/*'});if(tabs.length)return tabs.find(tab=>tab.active)||tabs[0];if(create)return chrome.tabs.create({url:'https://gemini.google.com/app'});throw new Error('Open Gemini and sign in first.');}
async function bridge(action,text=''){const tab=await gemini();const [result]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:geminiBridge,args:[action,text]});return result.result;}
async function runDomAction(action){
 const tab=await chrome.tabs.get(action.tabId);if(!/^https?:/.test(tab.url||''))throw new Error(`Tab ${action.tabId} is no longer a web page.`);
 const origin=`${new URL(tab.url).origin}/*`;if(!await chrome.permissions.contains({origins:[origin]}))throw new Error(`Read tab ${action.tabId} again before controlling it.`);
 const [result]=await chrome.scripting.executeScript({target:{tabId:action.tabId},func:interactPage,args:[action.type,action.selector,action.value||'']});return result.result;
}
async function runAction(action){
 if(action.type==='open_url'){await chrome.tabs.create({url:action.url});return `Opened ${action.url}`;}
 const tab=await chrome.tabs.get(action.tabId);
 if(action.type==='focus'){await chrome.tabs.update(action.tabId,{active:true});return `Focused tab ${action.tabId}`;}
 if(action.type==='back'){await chrome.tabs.goBack(action.tabId);return `Went back in tab ${action.tabId}`;}
 if(action.type==='forward'){await chrome.tabs.goForward(action.tabId);return `Went forward in tab ${action.tabId}`;}
 if(action.type==='reload'){await chrome.tabs.reload(action.tabId);return `Reloaded tab ${action.tabId}`;}
 if(['click','fill','scroll'].includes(action.type)){
  const snapshot=pages.find(page=>page.tabId===action.tabId);
  if(!snapshot || tab.url!==snapshot.url)throw new Error(`Tab ${action.tabId} changed. Read it again before running DOM actions.`);
  if(!snapshot.elements?.some(element=>element.selector===action.selector))throw new Error(`Gemini used a selector that was not captured from tab ${action.tabId}.`);
 }
 if(['click','fill'].includes(action.type)){
  const detail=action.type==='fill'?`Fill ${action.selector} with “${action.value}”`:`Click ${action.selector}`;
  if(!confirm(`${detail} on tab ${action.tabId}?\n\nThis could submit a form, send a message, or make a purchase. Continue only if you intend it.`))return 'Skipped by user';
 }
 return runDomAction(action);
}

$('target').addEventListener('change',()=>{$('current-url').value=$('target').selectedOptions[0]?.dataset.url||'';});
task('refresh',refresh);
task('read',async()=>{
 pages=[];const selected=[...$('tabs').querySelectorAll('input:checked')];
 if(!selected.length)throw new Error('Select at least one tab.');if(selected.length>8)throw new Error('Select at most 8 tabs per request.');
 const origins=[...new Set(selected.map(box=>`${new URL(box.dataset.url).origin}/*`))];if(!await chrome.permissions.request({origins}))throw new Error('Page access was not granted.');
 const results=await Promise.allSettled(selected.map(async box=>{const tab=await chrome.tabs.get(Number(box.value));if(new URL(tab.url).origin!==new URL(box.dataset.url).origin)throw new Error('Tab navigated. Refresh and select it again.');const [result]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:readPage});return {...result.result,tabId:tab.id};}));
 pages=results.filter(result=>result.status==='fulfilled').map(result=>result.value);const failures=results.filter(result=>result.status==='rejected');updateContextLabel();
 status(failures.length?`${failures.length} tab(s) could not be read: ${failures.map(result=>result.reason.message).join('; ')}`:'Context captured. Prompt Gemini with the browser task you want completed.');
});
task('open',()=>gemini(true));
task('account',()=>chrome.tabs.create({url:`https://accounts.google.com/AccountChooser?continue=${encodeURIComponent('https://gemini.google.com/app')}`}));
task('prepare',async()=>{const question=$('question').value.trim();if(!question)throw new Error('Enter a browser task first.');const prompt=buildPrompt(question,pages);$('preview').value=prompt;const result=await bridge('prepare',prompt);const tab=await gemini();await chrome.tabs.update(tab.id,{active:true});status(result);});
task('copy',async()=>{if(!$('preview').value)throw new Error('Prepare a prompt first.');await navigator.clipboard.writeText($('preview').value);status('Prompt copied.');});
task('reply',async()=>{const reply=await bridge('read');$('answer').textContent=reply;actionPlan=parseActionPlan(reply);$('plan').textContent=actionPlan.length?JSON.stringify(actionPlan,null,2):'Gemini did not include a copilot-actions plan. Ask it to provide browser actions.';$('run-plan').disabled=!actionPlan.length;status(actionPlan.length?`Loaded ${actionPlan.length} Gemini browser action(s). Review and run the plan.`:'Latest response imported without browser actions.');});
task('run-plan',async()=>{if(!actionPlan.length)throw new Error('Import a Gemini response containing copilot-actions first.');const outcomes=[];for(const action of actionPlan)outcomes.push(await runAction(action));actionPlan=[];$('run-plan').disabled=true;$('plan').textContent=outcomes.join('\n');await refresh();status('Gemini action plan finished. Read affected tabs again before asking for the next step.');});

task('navigate',async()=>{await chrome.tabs.create({url:webUrl($('url').value)});status('Page opened. Refresh tabs to add its context.');});
task('focus',async()=>{await chrome.tabs.update(targetTabId(),{active:true});status('Target tab shown.');});
task('back',async()=>{await chrome.tabs.goBack(targetTabId());status('Target tab went back.');await refresh();});
task('forward',async()=>{await chrome.tabs.goForward(targetTabId());status('Target tab went forward.');await refresh();});
task('reload',async()=>{await chrome.tabs.reload(targetTabId());status('Target tab reloaded.');});
task('go',async()=>{await chrome.tabs.update(targetTabId(),{url:webUrl($('current-url').value)});status('Target tab is navigating.');await refresh();});
task('execute',async()=>{const option=$('target').selectedOptions[0];if(!option)throw new Error('Refresh tabs and choose a target.');const action={type:$('action').value,tabId:Number(option.value),selector:$('selector').value.trim(),value:$('value').value};if(!action.selector)throw new Error('Enter a CSS selector.');if(!confirm(`Run ${action.type} on ${option.textContent}?\nSelector: ${action.selector}\n${action.type==='click'?'This click could submit information or make a purchase.':''}`))return;const origin=`${new URL(option.dataset.url).origin}/*`;if(!await chrome.permissions.request({origins:[origin]}))throw new Error('Site access required.');status(await runDomAction(action));});

task('mcp-signin',()=>chrome.tabs.create({url:webUrl($('mcp-endpoint').value)}));
task('mcp-connect',async()=>{const endpoint=$('mcp-endpoint').value.trim();const origin=`${new URL(endpoint).origin}/*`;if(!await chrome.permissions.request({origins:[origin]}))throw new Error('MCP server access was not granted.');mcpClient=new McpClient(endpoint,$('mcp-token').value);mcpTools=await mcpClient.connect();$('mcp-tool').replaceChildren();for(const tool of mcpTools){const option=document.createElement('option');option.value=tool.name;option.textContent=tool.name;$('mcp-tool').append(option);}const suggested=chooseSearchTool(mcpTools);if(suggested)$('mcp-tool').value=suggested.name;status(`Connected to MCP server. Found ${mcpTools.length} tool(s).`);});
task('mcp-search',async()=>{if(!mcpClient)throw new Error('Connect to the MCP server first.');const query=$('mcp-query').value.trim();if(!query)throw new Error('Enter a Confluence search query.');const tool=mcpTools.find(item=>item.name===$('mcp-tool').value);if(!tool)throw new Error('Choose an MCP tool.');mcpResult=await mcpClient.callTool(tool.name,searchArguments(tool,query));$('mcp-output').textContent=JSON.stringify(mcpResult,null,2);status(`Confluence MCP tool ${tool.name} completed.`);});
task('mcp-context',async()=>{if(!mcpResult)throw new Error('Run an MCP search first.');pages.push({title:`Confluence MCP: ${$('mcp-tool').value}`,url:$('mcp-endpoint').value,text:JSON.stringify(mcpResult,null,2).slice(0,12000),links:[],elements:[]});updateContextLabel();status('MCP result added to Gemini context.');});

refresh().catch(error=>status(error.message));
