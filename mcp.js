import {mcpUrl} from './core.js';

function responseBody(text,contentType) {
  if(!text.trim()) return null;
  if(contentType.includes('text/event-stream')) {
    const messages=text.split(/\r?\n\r?\n/).flatMap(block=>
      block.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trim())
    ).filter(Boolean);
    if(!messages.length) throw new Error('The MCP server returned an empty event stream.');
    return JSON.parse(messages.at(-1));
  }
  return JSON.parse(text);
}

export class McpClient {
  constructor(endpoint,bearer='') {
    this.endpoint=mcpUrl(endpoint);
    this.bearer=bearer.trim();
    this.sessionId='';
    this.nextId=1;
  }

  async request(method,params,notification=false) {
    const headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'};
    if(this.bearer) headers.Authorization=`Bearer ${this.bearer}`;
    if(this.sessionId) headers['Mcp-Session-Id']=this.sessionId;
    const body={jsonrpc:'2.0',method};
    if(!notification) body.id=this.nextId++;
    if(params!==undefined) body.params=params;
    const response=await fetch(this.endpoint,{method:'POST',headers,body:JSON.stringify(body),credentials:'include'});
    if(response.status===401 || response.status===403) throw new Error('MCP sign-in was rejected. Sign in to the MCP server or provide its bearer token.');
    if(!response.ok) throw new Error(`MCP server returned HTTP ${response.status}.`);
    this.sessionId=response.headers.get('Mcp-Session-Id') || this.sessionId;
    const payload=responseBody(await response.text(),response.headers.get('content-type') || '');
    if(payload?.error) throw new Error(payload.error.message || 'MCP request failed.');
    return payload?.result ?? null;
  }

  async connect() {
    await this.request('initialize',{
      protocolVersion:'2025-03-26',
      capabilities:{},
      clientInfo:{name:'gemini-copilot',version:'0.2.3'}
    });
    await this.request('notifications/initialized',undefined,true);
    const result=await this.request('tools/list',{});
    return result?.tools || [];
  }

  callTool(name,args) {
    return this.request('tools/call',{name,arguments:args});
  }
}
