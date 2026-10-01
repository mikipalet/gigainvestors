import {statfsSync} from 'node:fs';
import {createLimiter} from './http';
import {LOGO_USER_AGENT} from './logo-sources';
export function checkLogoDisk(){const d=statfsSync('/');if(d.bavail*d.bsize<5e9)throw Error('Disk below 5 GB; stopping');}
/** Bounded downloads; Wikimedia requests start at most once per second, with at most two in flight. */
export function logoRequest():typeof fetch{
 const limit=createLimiter({perSecond:8}),wikiLimit=createLimiter({perSecond:1});const wikiQueues=[Promise.resolve(),Promise.resolve()];let wikiSlot=0;let wikiBlockedUntil=0;
 return async(input,init)=>{
  checkLogoDisk();const url=String(input),wiki=/(?:^|\.)(?:wikimedia|wikidata|wikipedia)\.org$/.test(new URL(url).hostname);
  const run=async()=>{
   if(wiki&&Date.now()<wikiBlockedUntil)throw Error('Wikimedia Retry-After cooldown');
   const headers=new Headers(init?.headers);if(!headers.has('User-Agent'))headers.set('User-Agent',LOGO_USER_AGENT);
   const r=await fetch(url,{...init,headers,signal:AbortSignal.timeout(url.includes('/sparql?')?60000:/\.pdf(?:[?#]|$)/i.test(url)?45000:10000)});
   if(wiki&&(r.status===429||r.status===503)){
    const value=r.headers.get('retry-after'),seconds=Number(value);
    const delay=value&&Number.isFinite(seconds)?seconds*1000:value?Date.parse(value)-Date.now():60000;
    wikiBlockedUntil=Date.now()+Math.max(60000,Number.isFinite(delay)?delay:60000);
   }
   const max=url.includes('/sparql?')?20_000_000:(/\.pdf(?:[?#]|$)/i.test(url)||r.headers.get('content-type')?.includes('application/pdf'))?64_000_000:2_000_000;
   if(Number(r.headers.get('content-length'))>max){await r.body?.cancel();throw Error('Logo response too large');}
   const reader=r.body?.getReader(),chunks:Uint8Array[]=[];let size=0;
   if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('Logo response too large');}chunks.push(value);}
   const response=new Response([204,205,304].includes(r.status)?null:Buffer.concat(chunks),{status:r.status,headers:r.headers});Object.defineProperty(response,'url',{value:r.url||url});return response;
  };
  if(!wiki)return limit(run);
  const slot=wikiSlot++%wikiQueues.length;const pending=wikiQueues[slot].then(()=>wikiLimit(run));wikiQueues[slot]=pending.then(()=>{},()=>{});return pending;
 };
}
