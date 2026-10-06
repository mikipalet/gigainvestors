import {readFileSync,writeFileSync} from 'node:fs';
import {run as management} from '/Users/miki/GitHub/superinvestors-wt/value-calib/lib/value/tests/management';
import {financialTests} from '/Users/miki/GitHub/superinvestors-wt/value-calib/lib/value/tests/financial';
import {financialTests as financialBefore} from './financial-before';
import {correctCachedAnnualSources} from '/Users/miki/GitHub/superinvestors-wt/value-calib/lib/value/annual-source-corrections';
import {fiscalPriceMonth} from '/Users/miki/GitHub/superinvestors-wt/value-calib/lib/value/fiscal-price-month';
import {readCorpusJson} from '/Users/miki/GitHub/superinvestors-wt/value-calib/lib/value/corpus';
import {readPriceHistory} from '/Users/miki/GitHub/superinvestors-wt/value-calib/lib/value/price-history';
const base='/Users/miki/data/calib';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const ids=Object.keys(read(base+'/source-manifest.json'));
const effects:any[]=[],mismatches:any[]=[],missing:string[]=[],newNulls:any[]=[];let scored=0;
for(const id of ids){
 const a=read(`${base}/today/${id}.json`),input=readCorpusJson<any>(`analysis/inputs/${id}.json`),ys=input?.memoYears;
 if(a.status!=='scored'||!ys?.length){missing.push(id);continue;}
 const financial=['bank','insurer'].includes(a.company.kind);
 const opts={years:ys,kind:a.company.kind,industry:a.company.industry};
 const before=financial?financialBefore(opts).management:management(opts);
 if(before.numeric!==a.tests.management.numeric||a.tests.management.provisional){mismatches.push({id,recorded:a.tests.management.numeric,recomputed:before.numeric,provisional:!!a.tests.management.provisional});continue;}
 const f=readCorpusJson<any>(`fundamentals/${id}.json`),raw=readCorpusJson<any>(`raw/eodhd/${id}.json`);
 const sharesOnly=<T>(file:string):T|null=>{
  const data=readCorpusJson<any>(file);if(!data||!file.startsWith('raw/'))return data;
  const facts=data.facts?.facts?data.facts:data;
  if(!facts.facts)return data;
  const tags=new Set(['CommonStockSharesOutstanding','WeightedAverageNumberOfDilutedSharesOutstanding','AdjustedWeightedAverageShares','WeightedAverageLimitedPartnershipUnitsOutstandingDiluted','BasicEarningsLossPerShare','DilutedEarningsLossPerShare','WeightedAverageShares','WeightedAverageNumberOfShareOutstandingBasicAndDiluted','WeightedAverageNumberOfSharesOutstandingBasic']);
  facts.facts=Object.fromEntries(Object.entries(facts.facts).map(([ns,v]:any)=>[ns,Object.fromEntries(Object.entries(v).filter(([tag])=>tags.has(tag)))]));return data;
 };
 const picked=correctCachedAnnualSources(a.company,ys,raw,sharesOnly,f?.splits??[]);
 // Isolate this patch: annual source corrections other than fiscal-end shares already ran tonight.
 const corrected=ys.map((y:any)=>{const p=picked.find(p=>p.end===y.end);return p?.provenance?.sharesOutstanding?.inputs?.includes('Fiscal-end common shares outstanding')?{...y,sharesOutstanding:p.sharesOutstanding,provenance:{...y.provenance,sharesOutstanding:p.provenance.sharesOutstanding}}:y;});
 const prices=new Map(readPriceHistory(id)??[]);
 const fx=ys.filter((y:any)=>y.marketCap!=null).flatMap((y:any)=>(y.provenance?.marketCap?.inputs??[]).filter((s:string)=>s.startsWith('FX: ')).map((s:string)=>Number(s.slice(4)))).find((n:number)=>n>0)??(a.reportingCurrency===a.company.currency?1:a.valuation?.perShareTrading?.fxRate);
 const afterYears=corrected.map((y:any)=>{
  if(!y.provenance?.sharesOutstanding?.inputs?.includes('Fiscal-end common shares outstanding')&&fiscalPriceMonth(y.end)===y.end.slice(0,7))return y;
  const shares=y.sharesOutstanding>0&&y.provenance?.sharesOutstanding?.inputs?.includes('Fiscal-end common shares outstanding')?y.sharesOutstanding:y.dilutedShares;
  const price=prices.get(fiscalPriceMonth(y.end));
  return {...y,marketCap:fx&&price&&shares>0?price*shares/fx:null};
 });
 const after=financial?financialTests({...opts,years:afterYears}).management:management({...opts,years:afterYears});scored++;
 for(const [k,v]of Object.entries(before.metrics))if(typeof v==='number'&&after.metrics[k]===null)newNulls.push({id,metric:k,before:v});
 if(before.numeric!==after.numeric)effects.push({id,kind:a.company.kind,before:before.numeric,after:after.numeric,beforeMetrics:before.metrics,afterMetrics:after.metrics,beforeReasons:before.reasons,afterReasons:after.reasons});
 if(scored%100===0)console.log('rescored',scored);
 if(scored%20===0)global.gc?.();
}
writeFileSync(base+'/rescore-final.json',JSON.stringify({scored,missing,mismatches,effects,newNulls},null,2));console.log(JSON.stringify({scored,missing:missing.length,mismatches:mismatches.length,effects:effects.length,newNulls:newNulls.length}));
