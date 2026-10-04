/** Offline, staging-only LTM replay. Never calls the live analyze/publish CLI. */
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync,statfsSync,realpathSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {ltmFlapping} from './ltm-stability';
import {qualityLtmAt,qualityLtmHistoryAt} from '../../lib/value/quality-ltm';
import {cachedQualityQuarters} from '../../lib/value/cached-quality-quarters';
import {runNumericTests} from '../../lib/value/tests';
import {alignHistoryShares} from '../../lib/value/history-split-basis';
import {completeCachedSplits} from '../../lib/value/completeness/cached-years';
import {deriveYears} from '../../lib/value/derive';
import {calendarQuarters,quarterEnd} from '../../lib/value/time-travel';
import {availableOn} from '../../lib/value/quarterly-inputs';
import {filingDates} from './stages/history-snapshots';
import {combine} from '../../lib/value/jev/combine';
import {PIPELINE_VERSION} from '../../lib/value/analyze-company';
import {QUALITY_TESTS,type Dossier,type Fundamentals,type Year,type TestKey} from '../../lib/value/types';

const stage=path.resolve('.ttm-1'),corpus=path.join(stage,'corpus'),live=path.join(os.homedir(),'value-corpus','publish-repo');
process.env.VALUE_CORPUS_DIR=corpus;process.env.VALUE_NO_EODHD='1';
globalThis.fetch=async()=>{throw Error('Offline LTM audit: network forbidden');};
export function disk(){const s=statfsSync('/');if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP: commit work and stop (less than 4 GiB free)');}
const read=<T=any>(file:string):T=>JSON.parse(readFileSync(file,'utf8'));
const cached=<T=any>(file:string):T|null=>existsSync(path.join(corpus,file))?read(path.join(corpus,file)):null;
const write=(name:string,data:unknown)=>{disk();const file=path.join(stage,name);mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,JSON.stringify(data,null,2)+'\n');};
const keys=QUALITY_TESTS as Exclude<TestKey,'price'>[];
const cohort=['WMT.US','COST.US','TGT.US','KR.US','DAL.US','MAR.US','BKNG.US','BNY.US','BMO.TO','BBDC3.SA','AAPL.US','MSFT.US','ADBE.US','GOOGL.US','CAT.US','DE.US','XOM.US','SLF.TO','BBVA.MC','6981.JP'];
async function main(){
 disk();for(const dir of [corpus,path.join(corpus,'analysis'),path.join(corpus,'analysis','inputs')])if(realpathSync(dir)!==dir)throw Error('Private staging write directory required: '+dir);
 const dossiers:Record<string,Dossier>=Object.assign({},...readdirSync(path.join(live,'dossiers')).filter(f=>f.endsWith('.json')).map(f=>read(path.join(live,'dossiers',f))));
 const quarters=calendarQuarters('2026-10-04').slice(-8),replay:any[]=[],changes:any[]=[],rawReplay:any[]=[],rawChanges:any[]=[],today:any[]=[],coverage:any[]=[];
 for(const id of [...new Set([...Object.keys(dossiers),...cohort])]){
  disk();const old=dossiers[id],f=cached<Fundamentals>(`fundamentals/${id}.json`);if(!f)continue;
  const company=old?.company??cached(`companies/${id}.json`);if(!company)continue;
  const prices=cached<[string,number][]>(`prices-history/${id}.json`)??[];
  const inputs=cached<{memoYears?:Year[]}>(`analysis/inputs/${id}.json`);
  f.splits=completeCachedSplits(id,f.splits,cached);
  f.years=deriveYears(alignHistoryShares(f,prices).years);
  const qs=cachedQualityQuarters(id,cached),raw=cached(`raw/eodhd/${id}.json`);
  const dates=filingDates(raw,cached(`reports/${id}/meta.json`));
  // A single immutable local copy prevents reanalyze-1 from changing our inputs mid-replay.
  const ys=inputs?.memoYears?.length?inputs.memoYears:f.years;
  write(`corpus/analysis/inputs/${id}.json`,{memoYears:ys});
  if(cohort.includes(id))for(const quarter of quarters){
   const cutoff=quarterEnd(quarter),annuals=f.years.filter(y=>availableOn(y.end,dates[y.end])<cutoff);
   const ltm=qualityLtmAt(qs,annuals,cutoff,f.splits);
   const annual=runNumericTests({years:annuals,kind:company.kind,industry:company.industry});
   const rolling=runNumericTests({years:annuals,kind:company.kind,industry:company.industry,qualityLtm:ltm,qualityLtmHistory:qualityLtmHistoryAt(qs,annuals,cutoff,f.splits,ltm)});
   const rawRolling=runNumericTests({years:annuals,kind:company.kind,industry:company.industry,qualityLtm:ltm,confirmQualityLtm:false});
   rawReplay.push({id,quarter,annual:keys.map(k=>annual[k].numeric[0].toUpperCase()).join(''),ltm:keys.map(k=>rawRolling[k].numeric[0].toUpperCase()).join('')});
   for(const k of keys)if(rawRolling[k].numeric!==annual[k].numeric)rawChanges.push({id,quarter,end:rawRolling[k].provisional?.end,test:k,from:annual[k].numeric,to:rawRolling[k].numeric,metrics:Object.fromEntries(Object.entries(rawRolling[k].metrics).filter(([m,n])=>n!==annual[k].metrics[m]).map(([m,n])=>[m,{annual:annual[k].metrics[m],ltm:n}]))});
   const row={id,quarter,annual:keys.map(k=>annual[k].numeric[0].toUpperCase()).join(''),ltm:keys.map(k=>rolling[k].numeric[0].toUpperCase()).join(''),end:ltm?.end??null,tests:keys.filter(k=>rolling[k].provisional),changes:keys.flatMap(k=>annual[k].numeric!==rolling[k].numeric?[{test:k,end:rolling[k].provisional?.end,from:annual[k].numeric,to:rolling[k].numeric,cause:rolling[k].reasons,metrics:Object.fromEntries(Object.entries(rolling[k].metrics).filter(([m,n])=>n!==annual[k].metrics[m]).map(([m,n])=>[m,{annual:annual[k].metrics[m],ltm:n}]))}]:[])};
   replay.push(row);changes.push(...row.changes.map(c=>({id,quarter,...c})));
  }
  if(!old)continue;
  const ltm=qualityLtmAt(qs,ys,'2026-10-04',f.splits);
  const qualityLtmHistory=qualityLtmHistoryAt(qs,ys,'2026-10-04',f.splits,ltm);
  for(const row of qualityLtmHistory){const price=new Map(prices).get(row.end.slice(0,7)),rate=old.valuation?.perShareTrading?.fxRate??(old.company.currency===old.reportingCurrency?1:null);if(price&&rate&&row.dilutedShares)row.marketCap=price*row.dilutedShares/rate;}
  const annual=runNumericTests({years:ys,kind:company.kind,industry:company.industry});
  const rolling=runNumericTests({years:ys,kind:company.kind,industry:company.industry,qualityLtm:ltm,qualityLtmHistory});
  const candidate=structuredClone(old);
  candidate.versions={...candidate.versions,pipeline:PIPELINE_VERSION};
  for(const key of keys)if(rolling[key].provisional){
   const next=rolling[key],jev=old.tests[key].jev;
   candidate.tests[key]={...next,jev,result:combine({numeric:next.numeric,jev,kind:company.kind})};
   if(annual[key].numeric!==next.numeric)today.push({id,test:key,end:next.provisional!.end,annual:annual[key].numeric,ltm:next.numeric,live:old.tests[key].result,candidate:candidate.tests[key].result,cause:next.reasons,metrics:Object.fromEntries(Object.entries(next.metrics).filter(([m,n])=>n!==annual[key].metrics[m]).map(([m,n])=>[m,{annual:annual[key].metrics[m],ltm:n}]))});
  }
  coverage.push({id,quarters:qs.length,end:ltm?.end??null,tests:keys.filter(k=>rolling[k].provisional)});
  write(`corpus/analysis/${id}.json`,candidate);
 }
 const flapping=ltmFlapping(replay,keys);
 write('stability.json',{cohort,quarters,replay,changes,flapping,rawReplay,rawChanges,rawFlapping:ltmFlapping(rawReplay,keys)});write('today.json',today);write('coverage.json',coverage);
 console.log(JSON.stringify({companies:coverage.length,ltm:coverage.filter(r=>r.end).length,eligible:coverage.filter(r=>r.tests.length).length,cohort:cohort.length,replays:replay.length,changes:changes.length,flapping:flapping.length,todayChanges:today.length,cohortCoverage:cohort.map(id=>({id,quarters:replay.filter(r=>r.id===id&&r.tests.length).length,ltm:replay.filter(r=>r.id===id&&r.end).length}))},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
