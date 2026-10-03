/** Read-only counterfactual attribution. Never supplies reconstructed inputs to
 * the production pipeline. Usage: --before=<release> --after=<release>
 * --corpus=<replay> --prior=<frozen sources> --original=<flip ledger> --out=<prefix> */
import {readFileSync,readdirSync,existsSync,writeFileSync,statfsSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {attributeVerdict} from '../../lib/value/verdict-attribution';
import {runNumericTests} from '../../lib/value/tests';
import {normalizeEodhd} from '../../lib/value/normalize-eodhd';
import type {Analysis,Fundamentals,NumericInput,Year,TestKey} from '../../lib/value/types';
async function main(){
const options=Object.fromEntries(process.argv.slice(2).map(arg=>{const [k,...v]=arg.replace(/^--/,'').split('=');return [k,v.join('=')];}));
for(const key of ['before','after','corpus','prior','original','out'])if(!options[key])throw Error(`Missing --${key}`);
const read=<T=any>(p:string):T|null=>existsSync(p)?JSON.parse(readFileSync(p,'utf8')):null;
const dossiers=(root:string)=>Object.assign({},...readdirSync(path.join(root,'dossiers')).sort().map(p=>read(path.join(root,'dossiers',p)))) as Record<string,Analysis>;
const before=dossiers(options.before),after=dossiers(options.after);
// Optional git-archived rule trees, keyed by the released pipeline version.
// Code identity is recorded; unavailable historical rules remain explicit.
const historicalRules=new Map<string,{run:typeof runNumericTests;sha256:string}>();
if(options.rules)for(const version of new Set(Object.values(before).map(a=>String(a.versions.pipeline)))){
 const file=path.resolve(options.rules,version,'lib/value/tests/index.ts');
 if(existsSync(file))historicalRules.set(version,{run:(await import(pathToFileURL(file).href)).runNumericTests,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')});
}
const original=read<any[]>(options.original)!;
const keys=new Map(original.map(f=>[f.id+':'+f.test,{id:f.id,test:f.test as Exclude<TestKey,'price'>,original:f}]));
for(const id of Object.keys(before))if(after[id])for(const test of ['moat','management','understandable','accounting','economics'] as const)if(before[id].tests[test].result!==after[id].tests[test].result&&!keys.has(id+':'+test))keys.set(id+':'+test,{id,test,original:null});
const equal=(a:unknown,b:unknown)=>a===b||(a==null&&b==null);
const snapshots:Record<string,unknown>={};
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const ledger:Array<Record<string,any>>=[];
for(const {id,test,original:priorFlip} of keys.values()){
 const old=before[id],fresh=after[id];if(!fresh){ledger.push({id,test,status:'removed dossier',blockingReason:'Selected live company disappeared'});continue;}
 const historical=historicalRules.get(String(old.versions.pipeline));
 const beforeRule=historical?.run??runNumericTests;
 const memo=read<{asOf:string;memoYears:Year[]}>(path.join(options.corpus,'analysis/inputs',id+'.json'));
 const analysis=read<Analysis>(path.join(options.corpus,'analysis',id+'.json'));
 const rawInput:NumericInput={years:memo?.memoYears??[],kind:fresh.company.kind,industry:fresh.company.industry};
 const candidates:Array<{source:string;years:Year[]}>=[];
 const fundamental=read<Fundamentals>(path.join(options.prior,'fundamentals',id+'.json'));
 if(fundamental)candidates.push({source:'frozen normalized source (not necessarily release-time)',years:fundamental.years});
 const raw=read(path.join(options.prior,'raw/eodhd',id+'.json'));
 if(raw)normalizeEodhd(raw,id,{onSourceYears:years=>candidates.push({source:'frozen raw vendor annual statements before truncation',years})});
 for(const p of [`completeness/verified/${id}.json`,`raw/edinet/issuers/${id}.json`,`completeness/issuer-years/${id}.json`]){
  const obj=read(path.join(options.prior,p));const years=obj?.fundamentals?.years??obj?.years??(Array.isArray(obj)?obj:null);if(years)candidates.push({source:p,years});
 }
 // Actual current source observations can recover a missing prior fiscal row,
 // but are never described as an exact release-time source snapshot.
 candidates.push({source:'current memo observations; historical source snapshot unavailable',years:rawInput.years});
 const publicSeries=Object.assign({},...Object.values(old.tests).map(t=>t.series),old.series);
 const mapping:Record<string,string>={revenue:'revenue',netIncome:'netIncome',dilutedShares:'shares',marketCap:'marketCap',buybacks:'buybacks',acquisitions:'acquisitions',nonRecurring:'nonRecurring'};
 const reconstruct=(source:Year[],stripFinancial=false)=>{
  const years=structuredClone(source).filter(y=>y.fy>=(old.historyCoverage?.first??0)&&y.fy<=(old.historyCoverage?.last??9999));
  const observed=(y:Year,field:string,value:unknown,formula=field)=>{Object.assign(y,{[field]:value});y.provenance??={};y.provenance[field]={source:`frozen-live:${id}`,field:formula,method:'cached'};};
  for(const [field,series] of Object.entries(mapping))for(const [fy,v] of publicSeries[series]??[]){const y=years.find(y=>y.fy===fy);if(y)observed(y,field,v,series);}
  for(const y of years){
   const margin=publicSeries.operatingMargin?.find(([fy]:[number,number])=>fy===y.fy)?.[1];if(margin!=null&&y.revenue!=null)observed(y,'operatingIncome',margin*y.revenue,'published operatingMargin × revenue');
   const gross=publicSeries.grossMargin?.find(([fy]:[number,number])=>fy===y.fy)?.[1];if(gross!=null&&y.revenue!=null)observed(y,'grossProfit',gross*y.revenue,'published grossMargin × revenue');
   // The first year falls outside the public shares chart, but its EPS/BVPS
   // operand is still published. Label inverse arithmetic as reconstruction.
   if(!publicSeries.shares?.some(([fy]:[number,number])=>fy===y.fy)){
    const perShare=publicSeries.perShareValue?.find(([fy]:[number,number])=>fy===y.fy)?.[1];
    const total=old.company.kind==='operating'?y.netIncome:y.equity;
    if(perShare!=null&&perShare!==0&&total!=null&&total/perShare>0)observed(y,'dilutedShares',total/perShare,'reconstructed: source total / published perShareValue');
   }
   // Financial netIncome series is explicitly common income in financialTests.
   if((old.company.kind==='bank'||old.company.kind==='insurer')&&publicSeries.netIncome?.some(([fy]:[number,number])=>fy===y.fy))observed(y,'commonNetIncome',y.netIncome,'published common netIncome');
   if(stripFinancial){
    if(old.tests.moat.metrics.efficiencyMedian==null)for(const k of ['efficiencyRatio','nonInterestExpense','netRevenue'])delete (y as any)[k];
    if(old.tests.accounting.metrics.peerLossExcessYears==null)delete y.peerCreditLossRate;
   }
  }
  return years;
 };
 let chosen:any=null;
 for(const candidate of candidates)for(const strip of [false,true]){
  const input:NumericInput={years:reconstruct(candidate.years,strip),kind:old.company.kind,industry:old.company.industry};
  const recomputed=beforeRule(input)[test];const desired=old.tests[test];
  const mismatches=Object.keys(desired.metrics).filter(k=>k in recomputed.metrics&&!equal(desired.metrics[k],recomputed.metrics[k]));
  const score=(recomputed.numeric===desired.numeric?1000:0)-mismatches.length;
  if(!chosen||score>chosen.score)chosen={score,input,source:candidate.source+(strip?'; exclude checks with no published observations':''),mismatches};
 }
 const trace=attributeVerdict({test,before:chosen?.input??null,after:rawInput,expectedBefore:old.tests[test].numeric,expectedAfter:analysis?.tests[test].numeric??fresh.tests[test].numeric,beforeRule});
 const resolved=old.tests[test].result===fresh.tests[test].result;
 const originalRegression=priorFlip?.after==='na'&&priorFlip?.before!=='na';
 const matchedSnapshot=memo?.asOf===analysis?.asOf;
 const changes=trace.minimalGroups;
 let classification=originalRegression?'missing-data regression':changes.includes('company classification')?'rule-version difference':changes.includes('fiscal-year set')?(rawInput.years.at(-1)!.fy>chosen.input.years.at(-1)!.fy?'new fiscal year added':'rule-version difference — fiscal window changed'):changes.includes('currency/units')?'unit/currency fix':changes.includes('shares')||changes.includes('prices')?'share/price basis — requires action or issuer validation':changes.length?'source selection/restatement — requires issuer validation':'UNEXPLAINED';
 const jevChanged=hash(old.tests[test].jev)!==hash(fresh.tests[test].jev);
 const warnings=rawInput.years.flatMap(y=>(y.sourceWarnings??[]).map(message=>({fy:y.fy,message})));
 const mechanical=originalRegression&&resolved?'missing-data regression fixed':resolved?'no remaining flip':trace.status==='attributed'&&matchedSnapshot?'counterfactual reproduced':'UNEXPLAINED';
 const oldInputHash=chosen?hash(chosen.input):null,newInputHash=hash(rawInput);
 if(chosen)snapshots[oldInputHash!]=chosen.input;snapshots[newInputHash]=rawInput;
 ledger.push({id,name:fresh.company.name,test,before:old.tests[test].result,nightly3:priorFlip?.after??null,after:fresh.tests[test].result,resolved,
  mechanical,classification,filingStatus:'not yet adjudicated',baselineInputSource:chosen?.source??null,baselineInputHash:oldInputHash,newInputHash,
  baselineIsReconstruction:true,baselineMetricMismatches:chosen?.mismatches??[],snapshotMatchesAnalysis:matchedSnapshot,
  beforeVersion:old.versions,newVersion:fresh.versions,historicalRuleEntryHash:historical?.sha256??null,historicalRulesAvailable:!!historical,originalClass:priorFlip?.adjudication,
  jev:{changed:jevChanged,beforeNumeric:old.tests[test].numeric,afterNumeric:fresh.tests[test].numeric,beforeResult:old.tests[test].result,afterResult:fresh.tests[test].result},
  releasedHistoryCoverage:old.historyCoverage,
  fiscalYears:{before:chosen?.input.years.map((y:Year)=>[y.fy,y.end]),after:rawInput.years.map(y=>[y.fy,y.end])},
  beforeMetrics:old.tests[test].metrics,afterMetrics:fresh.tests[test].metrics,beforeReasons:old.tests[test].reasons,afterReasons:fresh.tests[test].reasons,
  warnings,trace});
}
const disk=statfsSync(path.dirname(options.out));if(disk.bavail*disk.bsize<4*1024**3)throw Error('DISK STOP: below 4 GiB');
writeFileSync(options.out+'-attribution.json.gz',gzipSync(JSON.stringify(ledger)));
writeFileSync(options.out+'-inputs.json.gz',gzipSync(JSON.stringify(snapshots)));
const count=(key:string)=>Object.fromEntries([...new Set(ledger.map(x=>(x as any)[key]))].map(k=>[k,ledger.filter(x=>(x as any)[key]===k).length]));
const summary={records:ledger.length,remainingFlips:ledger.filter(x=>!x.resolved).length,mechanical:count('mechanical'),classification:count('classification'),unreproducedNew:ledger.filter(x=>x.trace?.status==='unreproduced new inputs').map(x=>[x.id,x.test]),missingDataRegressions:ledger.filter(x=>x.before!=='na'&&x.after==='na').map(x=>[x.id,x.test]),diskFree:disk.bavail*disk.bsize};
Object.assign(summary,{fiscalHistoryLoss:ledger.flatMap(x=>{
 const coverage=x.releasedHistoryCoverage;if(coverage?.first==null||coverage?.last==null)return [];
 const actual=new Set(x.fiscalYears.after.map(([fy]:[number,string])=>fy));
 const lostYears=Array.from({length:coverage.last-coverage.first+1},(_,i)=>coverage.first+i).filter(fy=>!actual.has(fy));
 return lostYears.length?[{id:x.id,test:x.test,lostYears,basis:'released history coverage interval (not reconstructed baseline)'}]:[];
})});
writeFileSync(options.out+'-attribution-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
