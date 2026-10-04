import {describe,it,expect,vi} from 'vitest';
import {mcpPost,mcpTools,mcpDiscovery} from '@/lib/agents/mcp';
vi.mock('@/lib/agents/catalog',()=>({searchMarkdown:vi.fn(async(q:string)=>`# Search ${q}`)}));
vi.mock('@/lib/value/store',()=>({getDossier:vi.fn(async()=>null),getPrice:vi.fn(async()=>null)}));
const request=(body:unknown,headers:Record<string,string>={})=>new Request('https://gigainvestors.com/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream',...headers},body:JSON.stringify(body)});
const legacy=(method:string,params:unknown={})=>request({jsonrpc:'2.0',id:1,method,params},{'MCP-Protocol-Version':'2025-11-25'});
const modern=(method:string,params:Record<string,unknown>={})=>request({jsonrpc:'2.0',id:1,method,params:{...params,_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28','io.modelcontextprotocol/clientCapabilities':{}}}},{'MCP-Protocol-Version':'2026-07-28','Mcp-Method':method,...(typeof params.name==='string'?{'Mcp-Name':params.name}:{})});
describe('public read-only MCP',()=>{
 it('initializes legacy clients and exposes only the four free tools',async()=>{
  const initialized=await (await mcpPost(legacy('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'test',version:'1'}}))).json();
  expect(initialized.result.protocolVersion).toBe('2025-11-25');
  const listed=await (await mcpPost(legacy('tools/list'))).json();
  expect(listed.result.tools.map((t:{name:string})=>t.name)).toEqual(['search_companies','search_investors','get_company_summary','get_method']);
  expect(mcpTools.every(t=>t.annotations.readOnlyHint&&!t.annotations.destructiveHint)).toBe(true);
 });
 it('supports current per-request discovery and direct calls without sessions',async()=>{
  const discovered=await (await mcpPost(modern('server/discover'))).json();
  expect(discovered.result.supportedVersions).toContain('2026-07-28');
  expect(discovered.result.resultType).toBe('complete');
  const response=await mcpPost(modern('tools/call',{name:'search_companies',arguments:{query:'KO',limit:1}}));
  expect(response.headers.get('Mcp-Session-Id')).toBeNull();
  expect((await response.json()).result.content[0].text).toContain('KO');
 });
 it('returns method content and handles missing companies as tool errors',async()=>{
  expect((await (await mcpPost(legacy('tools/call',{name:'get_method'}))).json()).result.content[0].text).toContain('Every numerical cutoff');
  expect((await (await mcpPost(legacy('tools/call',{name:'get_company_summary',arguments:{id:'MISSING.US'}}))).json()).result.isError).toBe(true);
 });
 it('rejects invalid origins, oversized inputs, unknown tools and invalid arguments',async()=>{
  expect((await mcpPost(request({jsonrpc:'2.0',id:1,method:'ping'},{Origin:'https://evil.example'}))).status).toBe(403);
  expect((await mcpPost(request({padding:'x'.repeat(17000)}))).status).toBe(413);
  for(const params of [{name:'write'},{name:'search_companies',arguments:{query:'a',limit:100}},{name:'get_company_summary',arguments:{id:'../../etc'}}])expect((await (await mcpPost(legacy('tools/call',params))).json()).error.code).toBe(-32602);
 });
 it('validates current-version metadata and mirrored headers',async()=>{
  const req=modern('tools/list');req.headers.set('Mcp-Method','tools/call');
  expect((await (await mcpPost(req)).json()).error.code).toBe(-32020);
  const bad=legacy('tools/list');bad.headers.set('MCP-Protocol-Version','2099-01-01');
  expect((await (await mcpPost(bad)).json()).error.data.supported).toContain('2026-07-28');
 });
 it('accepts initialized notifications with an empty 202 response',async()=>{
  const r=await mcpPost(request({jsonrpc:'2.0',method:'notifications/initialized'}));expect(r.status).toBe(202);expect(await r.text()).toBe('');
 });
 it('documents both origins without pretending to provide the paid API',()=>{
  expect(mcpDiscovery('value').url).toBe('https://value.gigainvestors.com/mcp');
  expect(mcpDiscovery('main').paidApi.status).toContain('placeholder');
 });
});

it('allows browser responses only for the configured public origins',async()=>{
 const req=legacy('ping');req.headers.set('Origin','https://gigainvestors.com');
 expect((await mcpPost(req)).headers.get('Access-Control-Allow-Origin')).toBe('https://gigainvestors.com');
});
