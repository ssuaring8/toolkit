// Serialized by chrome.scripting: keep this function self-contained.
export function readPage() {
  const root = document.querySelector('main,article,[role="main"]') || document.body;
  const copy = root.cloneNode(true);
  copy.querySelectorAll('script,style,noscript,input,textarea,select,[contenteditable], [hidden], [aria-hidden="true"]').forEach(e=>e.remove());
  const links = [...root.querySelectorAll('a[href]')].filter(a=>a.getClientRects().length).map(a=>({text:a.innerText.trim().slice(0,160),url:a.href})).filter(a=>/^https?:/.test(a.url)).slice(0,60);
  function selectorFor(el) {
    if(el.id) {
      const selector=`#${CSS.escape(el.id)}`;
      if(document.querySelectorAll(selector).length===1)return selector;
    }
    for(const attr of ['data-testid','name','aria-label']) {
      const value=el.getAttribute(attr);
      if(value) {
        const selector=`${el.tagName.toLowerCase()}[${attr}="${CSS.escape(value)}"]`;
        if(document.querySelectorAll(selector).length===1)return selector;
      }
    }
    const parts=[];
    for(let node=el;node && node!==document.body;node=node.parentElement) {
      const tag=node.tagName.toLowerCase();
      const siblings=[...node.parentElement.children].filter(item=>item.tagName===node.tagName);
      parts.unshift(`${tag}:nth-of-type(${siblings.indexOf(node)+1})`);
      const selector=`body > ${parts.join(' > ')}`;
      if(document.querySelectorAll(selector).length===1)return selector;
    }
    return '';
  }
  const elements=[...document.querySelectorAll('a[href],button,input,textarea,select,[role="button"]')]
    .filter(el=>el.getClientRects().length && !el.disabled && !(el instanceof HTMLInputElement && ['password','hidden'].includes(el.type)))
    .slice(0,100)
    .map(el=>({
      selector:selectorFor(el),
      tag:el.tagName.toLowerCase(),
      type:el.getAttribute('type') || '',
      text:(el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0,160),
      href:el instanceof HTMLAnchorElement && /^https?:/.test(el.href) ? el.href : undefined
    })).filter(item=>item.selector);
  return {title:document.title,url:location.href,text:(copy.innerText || copy.textContent || '').replace(/\n{3,}/g,'\n\n').slice(0,12000),links,elements};
}
export function geminiBridge(action, text) {
  if (location.origin !== 'https://gemini.google.com') throw new Error('Wrong origin');
  if(action==='read') {
    const replies=[...document.querySelectorAll('model-response')];
    const last=replies.at(-1);
    if(!last) throw new Error('No Gemini response found yet. Wait for the reply, then retry.');
    return last.innerText;
  }
  const editor=document.querySelector('rich-textarea [contenteditable="true"],[contenteditable="true"][role="textbox"]');
  if(!editor) throw new Error('Gemini editor unavailable. Sign in and open a chat in Gemini.');
  if(editor.innerText.trim()) throw new Error('Gemini already contains a draft. Clear it first to avoid overwriting it.');
  editor.focus();
  // execCommand preserves the editor undo/input machinery used by rich-textarea.
  document.execCommand('insertText',false,text);
  editor.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));
  if(!editor.innerText.includes(text.slice(0,40))) throw new Error('Could not fill Gemini editor; paste the prompt manually.');
  return 'Prompt prepared. Review and press Send in Gemini.';
}
export function interactPage(action, selector, value) {
  if(!['click','fill','scroll'].includes(action))throw new Error('Unsupported action');
  const nodes=[...document.querySelectorAll(selector)];
  if(nodes.length!==1)throw new Error('Selector must match exactly one element.');
  const el=nodes[0];
  if(!el.getClientRects().length || el.disabled)throw new Error('Element is hidden or disabled.');
  if(action==='scroll'){el.scrollIntoView({behavior:'smooth',block:'center'});return 'Scrolled to element.';}
  if(action==='click'){el.click();return 'Click dispatched. Read the page again to verify the result.';}
  if(!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement))throw new Error('Only plain text inputs and textareas can be filled.');
  if(el instanceof HTMLInputElement && !['text','search','url','email','tel'].includes(el.type))throw new Error('Sensitive or unsupported field type.');
  if(el.readOnly)throw new Error('Field is read-only.');
  const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);
  el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
  return 'Field filled. Nothing submitted.';
}

export function showControlTest() {
  const existing=document.getElementById('__gemini_copilot_test');
  if(existing)existing.remove();
  const badge=document.createElement('div');
  badge.id='__gemini_copilot_test';
  badge.textContent='Gemini Copilot can control this page';
  Object.assign(badge.style,{position:'fixed',top:'16px',right:'16px',zIndex:'2147483647',padding:'12px 16px',borderRadius:'10px',background:'#26345f',color:'white',font:'600 14px system-ui',boxShadow:'0 5px 24px #0008'});
  document.documentElement.append(badge);
  window.scrollBy({top:Math.min(240,document.documentElement.scrollHeight-window.innerHeight),behavior:'smooth'});
  setTimeout(()=>badge.remove(),3000);
  return 'Browser control works: the page displayed a confirmation badge.';
}
