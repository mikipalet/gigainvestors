/** Repair legacy unsigned net-business cash flow only where it reached a held value. */
import {readdirSync} from 'node:fs';
import {corpusPath,readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {yearsFromYahoo} from '../../lib/value/completeness/second-sources';
import {createLimiter,pool} from '../../lib/value/http';
import type {Fundamentals,Year} from '../../lib/value/types';
async function main(){
 const jobs:Array<{file:string;fundamentals:Fundamentals;source:string}>=[];
 const bad=(y:Year)=>y.provenance?.acquisitions?.field==='annualNetBusinessPurchaseAndSale'&&y.provenance.acquisitions.method==='reported';
 for(const file of readdirSync(corpusPath('fundamentals')).filter(f=>f.endsWith('.json'))){
  const fundamentals=readCorpusJson<Fundamentals>(`fundamentals/${file}`)!;
  const y=fundamentals.years.find(bad);if(y)jobs.push({file,fundamentals,source:y.provenance!.acquisitions.source.split('?')[0]});
 }
 const limit=createLimiter({perSecond:1});let changed=0,done=0;
 await pool({items:jobs,concurrency:4,run:async({file,fundamentals:f,source})=>{
  const url=source+'?'+new URLSearchParams({type:'annualNetBusinessPurchaseAndSale',period1:'1262304000',period2:String(Math.floor(Date.now()/1000))});
  let fresh:Year[]=[];
  for(let attempt=0;;attempt++)try{
   const res=await limit(()=>fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(20000)}));
   if(!res.ok)throw new Error(`HTTP ${res.status}`);fresh=yearsFromYahoo(await res.json(),f.currency,source);break;
  }catch(e){if(attempt>=2)throw new Error(`${file}: ${e}`);}
  for(const y of f.years.filter(bad)){
   const correct=fresh.find(s=>s.end===y.end);
   if(!correct||correct.acquisitions===null)throw new Error(`No signed acquisition observation for ${file} ${y.end}`);
   if(y.acquisitions!==correct.acquisitions)changed++;
   y.acquisitions=correct.acquisitions;y.provenance!.acquisitions=correct.provenance!.acquisitions;
  }
  writeCorpusJson(`fundamentals/${file}`,f);
  const cache=readCorpusJson<Year[]>(`completeness/yahoo/${file}`)??[];
  for(const y of cache.filter(bad)){const correct=fresh.find(s=>s.end===y.end);y.acquisitions=correct?.acquisitions??null;if(correct?.provenance?.acquisitions)y.provenance!.acquisitions=correct.provenance.acquisitions;else delete y.provenance!.acquisitions;}
  writeCorpusJson(`completeness/yahoo/${file}`,cache);if(++done%100===0)console.log(`Yahoo sign correction: ${done}/${jobs.length}`);
 }});
 // Unused legacy cache values have no signed evidence; remove those optional values.
 let discarded=0;
 for(const file of readdirSync(corpusPath('completeness/yahoo')).filter(f=>f.endsWith('.json'))){
  const ys=readCorpusJson<Year[]>(`completeness/yahoo/${file}`)!;let dirty=false;
  for(const y of ys.filter(bad)){y.acquisitions=null;delete y.provenance!.acquisitions;dirty=true;discarded++;}
  if(dirty)writeCorpusJson(`completeness/yahoo/${file}`,ys);
 }
 writeCorpusJson('completeness/yahoo-sign-correction.json',{companies:jobs.length,changed,unusedCacheValuesDiscarded:discarded});console.log({companies:jobs.length,changed,discarded});
}
main().catch(e=>{console.error(e);process.exitCode=1;});
