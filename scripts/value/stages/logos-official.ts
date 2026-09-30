import {loadCompanies} from '../../../lib/value/companies';
import {readCorpusJson,writeCorpusJson} from '../../../lib/value/corpus';
import {generalInfoFor} from '../../../lib/value/enrichment';
import {websiteIndex,wikidataWebsite} from '../../../lib/value/wikidata-websites';
import {validLogo,iconHash} from '../../../lib/value/logo-validation';
import {pool,createLimiter} from '../../../lib/value/http';
import type {Analysis} from '../../../lib/value/types';
/** Last resort for DDG misses/16px icons: only icons declared by the official website. */
export default async function official(options:{only?:string[];limit?:number}={}){
 const websites=await websiteIndex(),deadline=Date.now()+7*60_000,limit=createLimiter({perSecond:8});
 const companies=loadCompanies(options).map(c=>({c,passes:Object.values(readCorpusJson<Analysis>(`analysis/${c.id}.json`)?.tests??{}).filter(t=>t.result==='pass').length})).filter(({c,passes})=>passes>=4&&!readCorpusJson<{logo?:string}>(`enrichment-v7/logos/${c.id}.json`)?.logo).sort((a,b)=>b.passes-a.passes);
 let recovered=0,attempted=0,deferred=0;
 const request=(url:string)=>limit(()=>fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(7000)}));
 const fallback=await request('https://icons.duckduckgo.com/ip3/value-logo-missing.invalid.ico');const hash=iconHash(new Uint8Array(await fallback.arrayBuffer()));
 await pool({items:companies,concurrency:8,run:async({c,passes})=>{
  if(Date.now()>deadline){deferred++;return;}attempted++;
  const general=generalInfoFor(c),site=general.WebURL??wikidataWebsite(c,websites);if(!site)return;
  try{
   const url=new URL(site.includes('://')?site:`https://${site}`);if(!['http:','https:'].includes(url.protocol))return;url.protocol='https:';
   const response=await request(url.href);if(!response.ok){await response.body?.cancel();return;}
   const html=(await response.text()).slice(0,1500000);
   const links=[...html.matchAll(/<link\b[^>]*>/gi)].flatMap(([tag])=>{
    const rel=tag.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1],href=tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    return rel&&href&&/(?:^|\s)(?:icon|apple-touch-icon|apple-touch-icon-precomposed)(?:\s|$)/i.test(rel)?[{href:new URL(href,response.url||url).href,priority:/apple/.test(rel)?0:1}]:[];
   }).sort((a,b)=>a.priority-b.priority).slice(0,5);
   for(const {href}of [...links,{href:new URL('/favicon.ico',response.url||url).href},{href:new URL('/apple-touch-icon.png',response.url||url).href}]){if(!/^https?:/.test(href))continue;const r=await request(href);if(!r.ok||!r.headers.get('content-type')?.startsWith('image/')){await r.body?.cancel();continue;}const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length<2000000&&await validLogo(bytes,hash)){writeCorpusJson(`enrichment-v7/logos/${c.id}.json`,{logo:href,source:'official-icon',website:url.href,validated:true,verifiedAt:new Date().toISOString()});recovered++;console.log(c.id,href);break;}}
  }catch{}
 }});const stats={attempted,recovered,deferred,at:new Date().toISOString()};writeCorpusJson('enrichment-v7/logo-official-report.json',stats);console.log(stats);
}
