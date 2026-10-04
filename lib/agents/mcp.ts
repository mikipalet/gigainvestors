import {z} from 'zod';
import {searchMarkdown} from './catalog';
import {methodMarkdown} from './method';
import {companyMarkdown} from './company';
import {getDossier,getPrice} from '@/lib/value/store';
import {apiUrl,PUBLIC_URLS,siteUrl,type Site} from './urls';
export const MCP_VERSIONS=['2026-07-28','2025-11-25','2025-06-18','2025-03-26'];
const info={name:'gigainvestors-discovery',version:'1.0.0'};
const capabilities={tools:{listChanged:false}};
const instructions=`Free read-only discovery from published site data. Cite canonical URLs and as-of dates. Paid detail belongs to the separately implemented x402 API at ${apiUrl()}.`;
const annotations={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
const searchInput=z.object({query:z.string().trim().min(1).max(100),limit:z.number().int().min(1).max(20).optional()}).strict();
const companyInput=z.object({id:z.string().regex(/^[a-z0-9&.-]{1,24}\.[a-z]{1,5}$/i).max(30)}).strict();
const emptyInput=z.object({}).strict();
const definitions=[
 {name:'search_companies',description:'Find published company pages by name or ticker; at most 20 results.',schema:searchInput},
 {name:'search_investors',description:'Find tracked investors by name, firm or investor code; at most 20 results.',schema:searchInput},
 {name:'get_company_summary',description:'Read a public company summary as Markdown with canonical citation, verdict and dates. ID is a listing ID such as KO.US; no paid detail.',schema:companyInput},
 {name:'get_method',description:'Read the published method, numerical cutoffs, glossary, source and history caveats.',schema:emptyInput},
];
export const mcpTools=definitions.map(({schema,...tool})=>({...tool,inputSchema:z.toJSONSchema(schema),annotations}));
export function mcpDiscovery(site:Site){return {name:info.name,version:info.version,transport:'streamable-http',url:siteUrl('main','/mcp'),authentication:'none',readOnly:true,protocolVersions:MCP_VERSIONS,tools:mcpTools,instructions,documentation:siteUrl('main','/llms.txt'),paidApi:{url:apiUrl(),status:'Integration placeholder: api-1 / merge-1 owns paid detail and OpenAPI'}};}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const error=(id:unknown,code:number,message:string,status=400,data?:unknown)=>Response.json({jsonrpc:'2.0',id:id??null,error:{code,message,...(data?{data}:{})}},{status,headers:{'Cache-Control':'no-store'}});
function validOrigin(request:Request){
 const origin=request.headers.get('origin');
 if(!origin)return true;
 // Never trust an arbitrary Host/forwarded-host as an allowed browser origin.
 const allowed=[PUBLIC_URLS.main,PUBLIC_URLS.value];
 if(process.env.NODE_ENV!=='production')allowed.push('http://localhost:3097','http://127.0.0.1:3097');
 return allowed.includes(origin);
}
async function boundedBody(request:Request){
 if(Number(request.headers.get('content-length')??0)>16384)throw new Error('too_large');
 const reader=request.body?.getReader();if(!reader)return '';
 const chunks:Uint8Array[]=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();throw new Error('too_large');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return new TextDecoder().decode(bytes);
}
async function handleMcpPost(request:Request):Promise<Response>{
 if(!validOrigin(request))return error(null,-32600,'Origin is not allowed',403);
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return error(null,-32600,'Content-Type must be application/json',415);
 const accept=request.headers.get('accept')??'';
 if(!accept.includes('application/json')||!accept.includes('text/event-stream'))return error(null,-32600,'Accept must include application/json and text/event-stream',406);
 let raw:string;try{raw=await boundedBody(request);}catch{return error(null,-32600,'Request exceeds 16 KiB',413);}
 let body:unknown;try{body=JSON.parse(raw);}catch{return error(null,-32700,'Parse error');}
 if(!object(body)||body.jsonrpc!=='2.0'||typeof body.method!=='string'||('id'in body&&typeof body.id!=='string'&&typeof body.id!=='number')||('params'in body&&!object(body.params)))return error(null,-32600,'Invalid JSON-RPC request');
 const {id,method}=body,params=object(body.params)?body.params:{};
 const meta=object(params._meta)?params._meta:{};
 const headerVersion=request.headers.get('mcp-protocol-version');
 const version=headerVersion??(typeof meta['io.modelcontextprotocol/protocolVersion']==='string'?meta['io.modelcontextprotocol/protocolVersion']:'2025-03-26');
 if(!MCP_VERSIONS.includes(version))return error(id,-32022,'Unsupported protocol version',400,{supported:MCP_VERSIONS,requested:version});
 const modern=version==='2026-07-28';
 if(modern){
  if(meta['io.modelcontextprotocol/protocolVersion']!==version||!object(meta['io.modelcontextprotocol/clientCapabilities']))return error(id,-32602,'Required protocol metadata is missing or invalid');
  if(headerVersion!==version||request.headers.get('mcp-method')!==method||(method==='tools/call'&&request.headers.get('mcp-name')!==params.name))return error(id,-32020,'MCP header mismatch');
 }
 if(id===undefined){
  if(!modern&&['notifications/initialized','notifications/cancelled'].includes(method))return new Response(null,{status:202});
  return error(null,-32600,'Unsupported notification');
 }
 const result=(value:Record<string,unknown>)=>Response.json({jsonrpc:'2.0',id,result:{...value,...(modern?{resultType:'complete',_meta:{'io.modelcontextprotocol/serverInfo':info}}:{})}},{headers:{'Cache-Control':'no-store'}});
 if(method==='initialize'&&!modern){
  if(typeof params.protocolVersion!=='string'||!object(params.capabilities)||!object(params.clientInfo))return error(id,-32602,'Invalid initialize parameters');
  const negotiated=MCP_VERSIONS.slice(1).includes(params.protocolVersion)?params.protocolVersion:'2025-11-25';
  return result({protocolVersion:negotiated,capabilities,serverInfo:info,instructions});
 }
 if(method==='server/discover'&&modern)return result({supportedVersions:MCP_VERSIONS,capabilities,instructions});
 if(method==='ping')return result({});
 if(method==='tools/list')return result({tools:mcpTools});
 if(method!=='tools/call')return error(id,-32601,'Method not found',modern?404:200);
 const definition=definitions.find(d=>d.name===params.name);
 if(!definition)return error(id,-32602,'Unknown tool');
 const parsed=definition.schema.safeParse(params.arguments??{});
 if(!parsed.success)return error(id,-32602,'Invalid tool arguments');
 try {
  let text:string;
  if(definition.name==='get_method')text=methodMarkdown();
  else if(definition.name==='get_company_summary'){
   const {id:companyId}=companyInput.parse(parsed.data);
   const dossier=await getDossier(companyId.toUpperCase());
   if(!dossier)return result({content:[{type:'text',text:'Company not found. Use search_companies for published listing IDs.'}],isError:true});
   text=companyMarkdown(dossier,await getPrice(dossier.id,dossier.company.country),true);
  }else{
   const {query,limit}=searchInput.parse(parsed.data);
   text=await searchMarkdown(query,definition.name==='search_companies'?'companies':'investors',limit??10);
  }
  return result({content:[{type:'text',text}],isError:false});
 }catch{return result({content:[{type:'text',text:'Published data could not be read. Retry later.'}],isError:true});}
}
export function mcpOptions(request:Request){
 if(!validOrigin(request))return new Response(null,{status:403});
 const origin=request.headers.get('origin');
 return new Response(null,{status:204,headers:{Allow:'POST, OPTIONS','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Accept, MCP-Protocol-Version, Mcp-Method, Mcp-Name',...(origin?{'Access-Control-Allow-Origin':origin,Vary:'Origin'}:{})}});
}
export function mcpUnsupported(){return new Response(null,{status:405,headers:{Allow:'POST, OPTIONS'}});}

export async function mcpPost(request:Request):Promise<Response>{
 const response=await handleMcpPost(request),origin=request.headers.get('origin');
 if(origin&&validOrigin(request)){response.headers.set('Access-Control-Allow-Origin',origin);response.headers.set('Vary','Origin');}
 return response;
}
