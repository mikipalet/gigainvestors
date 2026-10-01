import {statfsSync} from 'node:fs';
import {loadCompanies} from '../../../lib/value/companies';
import {readCorpusJson,writeCorpusJson} from '../../../lib/value/corpus';
import {resolveLogo,generalInfoFor,issuerWebsite,type Enrichment} from '../../../lib/value/enrichment';
import {websiteIndex,wikidataWebsite} from '../../../lib/value/wikidata-websites';
import {pool,createLimiter} from '../../../lib/value/http';
import type {Analysis} from '../../../lib/value/types';
/** Verify priority issuers first; bounded residual work is resumable on the next run. */
export default async function logos(options:{only?:string[];limit?:number;force?:boolean}={}) {
 const companies=loadCompanies(options),limit=createLimiter({perSecond:8}),deadline=Date.now()+10*60_000;
 const ranked=companies.map(company=>{const a=readCorpusJson<Analysis>(`analysis/${company.id}.json`);const pass=Object.values(a?.tests??{}).filter(t=>t.result==='pass').length;return {company,priority:pass>=4};}).sort((a,b)=>Number(b.priority)-Number(a.priority));
 const stats={checked:0,recovered:0,unavailable:0,cached:0,deferred:0};
 const websites=await websiteIndex().catch(()=>[]);
 // Fetch shared defaults once, but retain a fresh Response for each validator.
 const cache=new Map<string,Promise<{bytes:ArrayBuffer;status:number;type:string}>>();
 const request:typeof fetch=async(url,init)=>{
  const key=String(url);
  if(process.env.VALUE_NO_EODHD==='1' && new URL(key).hostname.endsWith('eodhd.com'))throw new Error('EODHD network disabled for this run');
  let pending=cache.get(key);
  if(!pending){pending=limit(async()=>{const r=await fetch(url,{...init,headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(8000)});return {bytes:await r.arrayBuffer(),status:r.status,type:r.headers.get('content-type')??''};});cache.set(key,pending);}
  const r=await pending;return new Response(r.bytes,{status:r.status,headers:{'content-type':r.type}});
 };
 await pool({items:ranked,concurrency:10,run:async({company,priority})=>{
  const file=`enrichment-v7/logos/${company.id}.json`;
  const previous=readCorpusJson<{validated?:boolean;logo?:string}>(file);
  if(previous?.validated&&(previous.logo||!options.force)){stats.cached++;return;}
  if(!priority&&Date.now()>deadline){stats.deferred++;return;}
  const disk=statfsSync('/');if(disk.bavail*disk.bsize<5e9)throw new Error('Disk below 5 GB; stopping');
  const patch=readCorpusJson<Enrichment>(`enrichment-v7/companies/${company.id}.json`);
  if(patch?.logoSource==='eodhd'&&!priority&&!options.force){stats.cached++;return;}
  const general=generalInfoFor(company);
  const existing=patch?.logo??company.logo;
  if(!general.LogoURL&&existing?.startsWith('https://eodhd.com/'))general.LogoURL=existing;
  if(!general.WebURL&&existing?.startsWith('https://icons.duckduckgo.com/ip3/'))general.WebURL='https://'+existing.split('/').at(-1)!.replace(/\.ico$/,'');
  if(!general.WebURL&&company.source==='esef')general.WebURL=await issuerWebsite(company)??undefined;
  if(!general.WebURL)general.WebURL=wikidataWebsite(company,websites)??undefined;
  if(process.env.VALUE_NO_EODHD==='1')delete general.LogoURL;
  const resolved=await resolveLogo(general,request);
  // Explicit null retires stale unverified favicons; initials remain the honest fallback.
  if(!resolved.retryable&&!(readCorpusJson<{source?:string}>(file)?.source==='official-icon'))writeCorpusJson(file,{...resolved,validated:true,verifiedAt:new Date().toISOString()});
  else if(!previous?.logo)writeCorpusJson(file,{logo:patch?.logo??null,source:patch?.logoSource??null,validated:false,retryable:true,verifiedAt:new Date().toISOString()});
  if(resolved.logo)stats.recovered++;else stats.unavailable++;
  if(++stats.checked%250===0)console.log(JSON.stringify(stats));
 }});
 writeCorpusJson(`enrichment-v7/logo-runs/${Date.now()}.json`,stats);console.log(stats);return stats;
}
