import dotenv from 'dotenv';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {corpusPath,readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {diskGuard} from '../../lib/value/thesis/sources';
import {pool} from '../../lib/value/http';
import judgement from './stages/judgement';
import businessFit from './stages/business-fit';
import fetchFlags from './stages/flags-fetch';
import flags from './stages/flags';
import {publicBusiness} from '../../lib/value/flags/public';
import type {Analysis} from '../../lib/value/types';
dotenv.config({path:'.env.local',quiet:true});dotenv.config({path:corpusPath('.env.local'),quiet:true});
process.env.VALUE_NO_EODHD='1';
const stage='.integrate/staging';
const inventory=JSON.parse(readFileSync(`${stage}/inventory.json`,'utf8'));
const preferred=['KO.US','AAPL.US','GOOGL.US','MSFT.US','ORCL.US','META.US','NVDA.US','LULU.US','WKL.AS','ACN.US','JPM.US','CBG.LSE','AXP.US','BRK-B.US','7203.JP','RIGD.LSE','RACE.MI'];
const ids:string[]=inventory.entries.map((r:any)=>r.id).sort((a:string,b:string)=>(preferred.includes(a)?preferred.indexOf(a):-1)<0?preferred.includes(b)?1:a.localeCompare(b):preferred.includes(b)?preferred.indexOf(a)-preferred.indexOf(b):-1);
const progress:{done:string[];failed:Array<{id:string;error:string}>}=existsSync(`${stage}/backfill-progress.json`)?JSON.parse(readFileSync(`${stage}/backfill-progress.json`,'utf8')):{done:[],failed:[]};
const save=()=>writeFileSync(`${stage}/backfill-progress.json`,JSON.stringify(progress,null,2));
const rates:Record<string,number>={USD:1};
async function company(id:string){
 diskGuard();if(progress.done.includes(id))return;
 try{
  if(!readCorpusJson(`judgement/${id}.json`))await judgement({only:[id]});
  if(!readCorpusJson(`flags/${id}.json`)){await fetchFlags({only:[id]});await flags({only:[id]});}
  // Cached extraction can be absent when no full annual document is available.
  // Record that boundary; do not infer a clean bill of health.
  const a=readCorpusJson<Analysis>(`analysis/${id}.json`)!;
  const record=readCorpusJson<any>(`flags/${id}.json`);
  if(record){for(const currency of new Set<string>(record.flags.map((f:any)=>f.currency).filter(Boolean))){if(rates[currency])continue;const fx=readCorpusJson<any>(`raw/eodhd/universe/fx-${currency}.json`);if(fx?.data?.[0]?.close>0)rates[currency]=fx.data[0].close;}
   record.usdRates={...rates};writeCorpusJson(`flags/${id}.json`,record);a.businessDepth=publicBusiness(record,a);writeCorpusJson(`analysis/${id}.json`,a);
  }
  await businessFit({only:[id]});
  progress.done.push(id);progress.failed=progress.failed.filter(f=>f.id!==id);save();console.log(`BACKFILL ${progress.done.length}/${ids.length} ${id}`);
 }catch(e){const error=e instanceof Error?e.message:'Backfill failed';if(/DISK STOP/.test(error))throw e;progress.failed=progress.failed.filter(f=>f.id!==id);progress.failed.push({id,error});save();console.error(`BACKFILL FAILED ${id}: ${error}`);}
}
async function main(){
 for(let i=0;i<ids.length;i+=12){diskGuard();console.log(`BATCH ${i/12+1}: ${ids.slice(i,i+12).join(',')}`);await pool({items:ids.slice(i,i+12),concurrency:12,run:company});}
 console.log(JSON.stringify({done:progress.done.length,failed:progress.failed.length}));if(progress.failed.length)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
