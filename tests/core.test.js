import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webUrl,mcpUrl,buildPrompt,parseActionPlan,fallbackOpenPlan,chooseSearchTool,searchArguments} from '../core.js';
test('navigation permits web URLs but rejects script, file and credentials',()=>{
 assert.equal(webUrl('https://example.com/a'),'https://example.com/a');
 for(const url of ['javascript:alert(1)','file:///etc/passwd','chrome://settings','https://u:p@example.com'])assert.throws(()=>webUrl(url));
});
test('prompt includes sources, request and instruction boundary',()=>{
 const p=buildPrompt('Compare sources',[{url:'https://example.com',text:'source text'}]);
 assert.match(p,/Compare sources/);assert.match(p,/source text/);assert.match(p,/untrusted reference/);assert.match(p,/COPILOT_ACTIONS_START/);assert.match(p,/https:\/\/example.com/);
});
test('MCP URL requires HTTPS except for localhost',()=>{
 assert.equal(mcpUrl('https://mcp.example.com/mcp'),'https://mcp.example.com/mcp');
 assert.equal(mcpUrl('http://localhost:3000/mcp'),'http://localhost:3000/mcp');
 assert.throws(()=>mcpUrl('http://mcp.example.com/mcp'));
});
test('action plans are parsed and unsafe URLs are rejected',()=>{
 const plan=parseActionPlan('ok\n```copilot-actions\n[{"type":"focus","tabId":7},{"type":"open_url","url":"https://example.com"}]\n```');
 assert.deepEqual(plan,[{type:'focus',tabId:7},{type:'open_url',url:'https://example.com/'}]);
 assert.throws(()=>parseActionPlan('```copilot-actions\n[{"type":"open_url","url":"javascript:alert(1)"}]\n```'));
});
test('action plans accept the explicit Gemini marker and an actions object',()=>{
 const text='COPILOT_ACTIONS_START\n{"actions":[{"type":"reload","tabId":4}]}\nCOPILOT_ACTIONS_END';
 assert.deepEqual(parseActionPlan(text),[{type:'reload',tabId:4}]);
});
test('action plans normalize common Gemini field variations',()=>{
 const text='COPILOT_ACTIONS_START\n```json\n[{"type":"open_tab","href":"https://example.com"},{"type":"activate_tab","tab_id":"9"}]\n```\nCOPILOT_ACTIONS_END';
 assert.deepEqual(parseActionPlan(text),[{type:'open_url',url:'https://example.com/'},{type:'focus',tabId:9}]);
});
test('open-task fallback extracts a reviewed link when no action block exists',()=>{
 assert.deepEqual(fallbackOpenPlan('Open the recommended page','Try [Example](https://example.com/path).'),[{type:'open_url',url:'https://example.com/path'}]);
 assert.deepEqual(fallbackOpenPlan('Summarize this','https://example.com'),[]);
});
test('Confluence search tool and arguments are inferred',()=>{
 const tools=[{name:'get_page',inputSchema:{properties:{id:{type:'string'}}}},{name:'search_confluence',inputSchema:{properties:{cql:{type:'string'}}}}];
 const tool=chooseSearchTool(tools);assert.equal(tool.name,'search_confluence');assert.deepEqual(searchArguments(tool,'space=HELP'),{cql:'space=HELP'});
});
