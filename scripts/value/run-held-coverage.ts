/** Controller-relaunched checkpoint runner. Never publishes or schedules itself. */
import {existsSync,readFileSync,statfsSync,mkdirSync,symlinkSync,realpathSync,writeFileSync,unlinkSync,rmdirSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import {corpusDir,readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {callsUsedToday,bulkLastDay} from '../../lib/value/eodhd';
import {parseBulkPrices,freshPrice} from './stages/prices';
import {readPrices} from '../../lib/value/price-files';
import {budgetUsage} from '../../lib/value/budget';
import {PIPELINE_VERSION} from '../../lib/value/analyze-company';
import {QUESTIONS_VERSION} from '../../lib/value/jev/questions';
import {normalizeEodhd} from '../../lib/value/normalize-eodhd';
import type {Analysis,Fundamentals,ReportMeta,PriceMap} from '../../lib/value/types';
import type {HeldMembership} from '../../lib/value/held-universe';
import analyze from './stages/analyze';
import fundamentals from './stages/fundamentals';
import reports from './stages/reports';
import priceHistory from './stages/price-history';

const base=process.env.VALUE_BASE_CORPUS??path.join(os.homedir(),'value-corpus');
process.env.VALUE_CORPUS_DIR??=path.join(os.homedir(),'data/value-cover');
dotenv.config({path:path.join(base,'.env.local'),quiet:true});
dotenv.config({path:process.env.VALUE_ENV_FILE??path.resolve(__dirname,'../../.env.local'),quiet:true});
process.env.VALUE_ANALYZE_CONCURRENCY??='8';
// The nightly runner owns at least 40,000 of the account's 100,000 calls.
const coverageCap=Math.min(60_000,Number(process.env.VALUE_EODHD_HARD_CAP??60_000));
if(!Number.isSafeInteger(coverageCap)||coverageCap<=0)throw Error('Invalid coverage budget cap');
process.env.VALUE_EODHD_HARD_CAP=String(coverageCap);
let releaseAccountLock=()=>{};

function disk(){const s=statfsSync('/');if(s.bavail*s.bsize<4*1024**3)throw Error('Disk below 4 GiB; commit and stop');}
function activeDailyRunner():boolean{
 try{const pid=Number(readFileSync(path.join(base,'daily-runner.lock/pid'),'utf8'));if(!Number.isInteger(pid)||pid<=0)return true;process.kill(pid,0);return true;}
 catch(error){return !['ENOENT','ESRCH'].includes((error as NodeJS.ErrnoException).code??'');}
}
function cachedPrices():PriceMap{
 const prices=readPrices(path.join(corpusDir(),'publish-repo/prices'));
 for(const [id,quote]of Object.entries(readPrices(path.join(corpusDir(),'prices')))){
  const old=prices[id];
  if(!old||old[2]==='seed'||quote[2]!=='seed'&&quote[1]>old[1])prices[id]=quote;
 }
 return prices;
}
async function main(){
 disk();
 if(path.resolve(corpusDir())===path.resolve(base))throw Error('An isolated coverage corpus is required');
 const ids=readCorpusJson<string[]>('held-membership/additions.json');
 if(!ids?.length)throw Error('Run prepare-held-coverage.py, held-membership, then prepare again');
 const membership=readCorpusJson<HeldMembership>('held-membership/latest.json')!;
 const selected=new Set(membership.companies.map(c=>c.id));
 const additions=ids.filter(id=>selected.has(id));
 // All requests share the conservative account ledger, including controller relaunches.
 const usage=path.join(corpusDir(),'usage');
 if(!existsSync(usage)){mkdirSync(path.join(base,'usage'),{recursive:true});symlinkSync(path.join(base,'usage'),usage,'dir');}
 if(realpathSync(usage)!==realpathSync(path.join(base,'usage')))throw Error('Coverage must share the account usage ledger');
 const used=await callsUsedToday();
 let cacheOnly=process.argv.includes('--cache-only')||used>=coverageCap||activeDailyRunner();
 if(!cacheOnly){
  const lock=path.join(base,'daily-runner.lock'),pidFile=path.join(lock,'pid');
  try{
   mkdirSync(lock);writeFileSync(pidFile,String(process.pid)+'\n');
   releaseAccountLock=()=>{if(readFileSync(pidFile,'utf8').trim()===String(process.pid)){unlinkSync(pidFile);rmdirSync(lock);}};
  }catch{cacheOnly=true;}
 }
 if(cacheOnly)process.env.VALUE_NO_EODHD='1';
 const results:Record<string,unknown>={};
 const checkpoint=()=>writeCorpusJson('held-membership/progress.json',{at:new Date().toISOString(),pipeline:PIPELINE_VERSION,questions:QUESTIONS_VERSION,quota:budgetUsage(),cacheOnly,results});
 // Cached raw responses can be normalized without spending another ten calls.
 for(const id of additions){
  if(readCorpusJson<Fundamentals>(`fundamentals/${id}.json`))continue;
  const raw=readCorpusJson(`raw/eodhd/${id}.json`);if(!raw)continue;
  const normalized=normalizeEodhd(raw,id);
  writeCorpusJson(`fundamentals/${id}.json`,normalized.fundamentals);
  const company=membership.companies.find(c=>c.id===id)!;
  writeCorpusJson(`companies/${id}.json`,{...company,...normalized.patch});
 }
 let missing=additions.filter(id=>!readCorpusJson(`fundamentals/${id}.json`));
 if(!cacheOnly&&missing.length){await fundamentals({only:missing});missing=missing.filter(id=>!readCorpusJson(`fundamentals/${id}.json`));}
 results.missingFundamentals=missing;checkpoint();
 const ready=additions.filter(id=>!missing.includes(id));
 const quotes=cachedPrices();
 let pricePending=ready.filter(id=>!quotes[id]||quotes[id][2]==='seed'||!freshPrice(quotes[id]));
 if(!cacheOnly&&pricePending.length&&budgetUsage().used+100<=coverageCap){
  const companies=membership.companies.filter(c=>pricePending.includes(c.id));
  const updates=parseBulkPrices({rows:await bulkLastDay('US'),companies});
  // Write only new identities. The baseline quotes remain frozen at publication.
  for(const country of new Set(companies.map(c=>c.country))){
   const file=`prices/${country}.json`,prices=readCorpusJson<Record<string,unknown>>(file)??{};
   for(const c of companies.filter(c=>c.country===country))if(updates[c.id]&&freshPrice(updates[c.id]))prices[c.id]=updates[c.id];
   writeCorpusJson(file,prices);
  }
 }
 const currentPrices=cachedPrices();
 results.pricePending=ready.filter(id=>!currentPrices[id]||currentPrices[id][2]==='seed'||!freshPrice(currentPrices[id]));checkpoint();
 const noReport=ready.filter(id=>{const r=readCorpusJson<ReportMeta>(`reports/${id}/meta.json`);return !r?.sections.length||r.kind==='description';});
 // EDGAR does not consume EODHD quota. Failed report fetches remain retryable.
 if(noReport.length){try{await reports({only:noReport});}catch{results.reportFailures=noReport;}}
 if(!cacheOnly)await priceHistory({only:ready.filter(id=>!readCorpusJson(`prices-history/${id}.json`))});
 results.missingPriceHistory=ready.filter(id=>!readCorpusJson(`prices-history/${id}.json`));checkpoint();
 const done=readCorpusJson<{ids:string[];pipeline:string;questions:string}>('held-membership/analyzed-checkpoint.json');
 const completed=new Set(done?.pipeline===PIPELINE_VERSION&&done.questions===QUESTIONS_VERSION?done.ids:[]);
 // analyze owns the input fingerprint: changed prices/filings must invalidate a
 // prior checkpoint, while identical input is skipped without new Jev reading.
 const jobs=ready;
 for(let offset=0;offset<jobs.length;offset+=50){
  disk();const batch=jobs.slice(offset,offset+50);
  let success=false;
  try{await analyze({only:batch});success=true;}catch{console.warn('Analysis batch incomplete; failed IDs retained for retry');}
  for(const id of batch){const a=readCorpusJson<Analysis>(`analysis/${id}.json`);if(success&&a?.versions.pipeline===PIPELINE_VERSION&&a.versions.questions===QUESTIONS_VERSION)completed.add(id);else completed.delete(id);}
  writeCorpusJson('held-membership/analyzed-checkpoint.json',{pipeline:PIPELINE_VERSION,questions:QUESTIONS_VERSION,ids:[...completed].sort()});
  console.log(`coverage analysis: ${completed.size}/${ready.length}; fundamentals pending ${missing.length}`);
  results.analyzed=completed.size;checkpoint();
 }
 results.analysisPending=ready.filter(id=>!completed.has(id));
 results.analyzed=completed.size;
 results.filingPending=ready.filter(id=>{const r=readCorpusJson<ReportMeta>(`reports/${id}/meta.json`);return !r||r.kind==='description';});
 checkpoint();
 console.log(JSON.stringify({additions:additions.length,analyzed:completed.size,missingFundamentals:missing.length,cacheOnly}));
 if(cacheOnly||missing.length||completed.size<ready.length||[results.pricePending,results.missingPriceHistory,results.filingPending].some(value=>Array.isArray(value)&&value.length))process.exitCode=75;
}
main().finally(()=>releaseAccountLock()).catch(error=>{
 let message=error instanceof Error?error.message:'unknown error';
 for(const [key,value]of Object.entries(process.env))if(/KEY|TOKEN|SECRET|PASSWORD/.test(key)&&value)message=message.replaceAll(value,'[REDACTED]');
 console.error(`Coverage run stopped: ${message}`);process.exitCode=1;
});
