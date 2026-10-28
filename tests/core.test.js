import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webUrl,buildPrompt} from '../core.js';
test('navigation permits web URLs but rejects script, file and credentials',()=>{
 assert.equal(webUrl('https://example.com/a'),'https://example.com/a');
 for(const url of ['javascript:alert(1)','file:///etc/passwd','chrome://settings','https://u:p@example.com'])assert.throws(()=>webUrl(url));
});
test('prompt includes sources, request and instruction boundary',()=>{
 const p=buildPrompt('Compare sources',[{url:'https://example.com',text:'source text'}]);
 assert.match(p,/Compare sources/);assert.match(p,/source text/);assert.match(p,/untrusted reference/);assert.match(p,/https:\/\/example.com/);
});
