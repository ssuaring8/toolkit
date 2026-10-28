import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webUrl,mcpUrl,buildPrompt,parseActionPlan,chooseSearchTool,searchArguments} from '../core.js';
test('navigation permits web URLs but rejects script, file and credentials',()=>{
 assert.equal(webUrl('https://example.com/a'),'https://example.com/a');
 for(const url of ['javascript:alert(1)','file:///etc/passwd','chrome://settings','https://u:p@example.com'])assert.throws(()=>webUrl(url));
});
test('prompt includes sources, request and instruction boundary',()=>{
 const p=buildPrompt('Compare sources',[{url:'https://example.com',text:'source text'}]);
 assert.match(p,/Compare sources/);assert.match(p,/source text/);assert.match(p,/untrusted reference/);assert.match(p,/copilot-actions/);assert.match(p,/https:\/\/example.com/);
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
test('Confluence search tool and arguments are inferred',()=>{
 const tools=[{name:'get_page',inputSchema:{properties:{id:{type:'string'}}}},{name:'search_confluence',inputSchema:{properties:{cql:{type:'string'}}}}];
 const tool=chooseSearchTool(tools);assert.equal(tool.name,'search_confluence');assert.deepEqual(searchArguments(tool,'space=HELP'),{cql:'space=HELP'});
});
