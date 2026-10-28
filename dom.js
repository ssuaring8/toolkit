// Serialized by chrome.scripting: keep this function self-contained.
export function readPage() {
  const root = document.querySelector('main,article,[role="main"]') || document.body;
  const copy = root.cloneNode(true);
  copy.querySelectorAll('script,style,noscript,input,textarea,select,[contenteditable], [hidden], [aria-hidden="true"]').forEach(e=>e.remove());
  const links = [...root.querySelectorAll('a[href]')].filter(a=>a.getClientRects().length).map(a=>({text:a.innerText.trim().slice(0,160),url:a.href})).filter(a=>/^https?:/.test(a.url)).slice(0,60);
  return {title:document.title,url:location.href,text:(copy.innerText || copy.textContent || '').replace(/\n{3,}/g,'\n\n').slice(0,12000),links};
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
