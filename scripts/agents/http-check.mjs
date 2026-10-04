import assert from 'node:assert/strict';
import {request as httpRequest} from 'node:http';
// Native HTTP preserves Host for local multi-domain testing (fetch can replace it).
function fetch(url,options={}){return new Promise((resolve,reject)=>{const req=httpRequest(url,{method:options.method??'GET',headers:options.headers},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));});req.on('error',reject);req.end(options.body);});}
const base=process.argv[2]??'http://127.0.0.1:3097';
const hosts=['gigainvestors.com','value.gigainvestors.com'];let checks=0;
async function get(host,path,accept){const response=await fetch(base+path,{headers:{host,...(accept?{Accept:accept}:{})},redirect:'manual'});assert.equal(response.status,200,`${host}${path}: ${response.status}`);checks++;return response;}
for(const host of hosts){
 const guide=await (await get(host,'/llms.txt')).text();assert.match(guide,/## API/);assert.match(guide,/INTEGRATION PLACEHOLDER/);assert.match(guide,/## MCP/);assert.match(guide,/hello@gigainvestors.com/);assert.equal((guide.match(/^\d+\. /gm)??[]).length,10);
 const full=await(await get(host,'/llms-full.txt')).text();assert.match(full,/## Glossary/);assert.match(full,/## Page index/);assert.match(full,/Every numerical cutoff/);
 const robots=await(await get(host,'/robots.txt')).text();assert.match(robots,/User-Agent: GPTBot/i);assert.match(robots,/Disallow: \/api\//);assert.ok(robots.includes(`https://${host}/sitemap.xml`));
 const sitemap=await(await get(host,'/sitemap.xml')).text();assert.match(sitemap,/<sitemapindex/);for(const loc of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)){const url=new URL(loc[1]);assert.equal(url.hostname,host);const part=await(await get(host,url.pathname)).text();assert.match(part,/<urlset/);assert.ok(!part.includes('undefined'));}
 const discovery=await(await get(host,'/mcp.json')).json();assert.equal(discovery.url,`https://${host}/mcp`);assert.equal(discovery.tools.length,4);
 const samples=host.startsWith('value.')?['/','/ko.us','/method','/?q=2018Q3','/year/2011','/forward']:['/','/BRK','/s/KO','/about','/privacy','/newsletter','/newsletter/2026-q2','/munger'];
 for(const path of samples){
  const url=new URL(`https://${host}${path}`);const mdPath=url.pathname.endsWith('/')?url.pathname+'index.md':url.pathname+'.md';
  const response=await get(host,mdPath+url.search);assert.match(response.headers.get('content-type'),/text\/markdown/);const body=await response.text();assert.match(body,/^# /);assert.ok(!body.includes('NaN'));
  const accepted=await(await get(host,path,'text/markdown')).text();assert.equal(accepted,body,`Accept and .md differ: ${host}${path}`);
  const html=await(await get(host,path)).text();assert.match(html,/<link[^>]+type="text\/markdown"/);assert.match(html,/<title>[^<]+<\/title>/);assert.match(html,/<meta name="description" content="[^\"]+"/);
  for(const script of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs))assert.ok(JSON.parse(script[1]));
 }
 const r=await fetch(base+'/mcp',{method:'POST',headers:{host,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-11-25'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'search_companies',arguments:{query:'KO',limit:2}}})});assert.equal(r.status,200);assert.equal((await r.json()).result.isError,false);checks++;
}
console.log(`${checks} HTTP artefact/alternate/MCP checks passed across both domains.`);
