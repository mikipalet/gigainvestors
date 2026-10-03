import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {normalizeEodhd} from '../../lib/value/normalize-eodhd';
import {yearsFromCompanyFacts} from '../../lib/value/completeness/second-sources';
const read=(p:string):any=>existsSync(p)?JSON.parse(readFileSync(p,'utf8')):null;
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,...v]=a.replace(/^--/,'').split('=');return[k,v.join('=')]}));
const root=args.sources??'/Users/miki/value-corpus',stage=args.corpus??'.fix5c/nightly-5/corpus';
const ledger=JSON.parse(gunzipSync(readFileSync(args.attribution??'.superpowers/sdd/2026-09-29-value/nightly-4-attribution.json.gz')).toString());
const family=(s:string)=>/sec.gov|SEC/.test(s)?'SEC':/edinet|EDINET/.test(s)?'EDINET':/yahoo/.test(s)?'Yahoo':/eodhd/.test(s)?'EODHD':/xbrl/.test(s)?'ESEF':s;
const results=[];
for(const x of ledger.filter((x:any)=>!x.resolved)){
 const memo=read(`${stage}/analysis/inputs/${x.id}.json`);const years=memo?.memoYears??[];
 const c=read(`${root}/companies/${x.id}.json`);const sources:{label:string;years:any[]}[]=[];
 const raw=read(`${root}/raw/eodhd/${x.id}.json`);if(raw){let ys:any[]=[];normalizeEodhd(raw,x.id,{onSourceYears:y=>ys=y});sources.push({label:'EODHD',years:ys});}
 for(const key of ['yahoo','edinet','issuer-years']){const ys=read(`${root}/completeness/${key}/${x.id}.json`);if(ys)sources.push({label:key,years:ys});}
 if(c.cik){const ys=read(`${root}/completeness/sec/${Number(c.cik)}.json`)??read(`${root}/completeness/sec/${c.cik}.json`);if(ys)sources.push({label:'SEC',years:ys});}
 const sec=read(`${root}/raw/sec-companyfacts/${x.id}.json`);if(sec)sources.push({label:'SEC raw',years:yearsFromCompanyFacts(sec,years.at(-1).currency,`https://data.sec.gov/api/xbrl/companyfacts/CIK${c.cik}.json`)});
 const verified=read(`${root}/completeness/verified/${x.id}.json`);if(verified)sources.push({label:'verified secondary listing',years:verified.fundamentals.years});
 let fields=x.trace.minimalFields;
 if(!fields.length&&x.trace.status==='unreproduced baseline')fields=x.test==='understandable'?['revenue','operatingIncome','netIncome']:x.test==='accounting'?['netIncome','ocf','totalAssets','receivables','revenue','nonRecurring','sbc']:x.test==='economics'?['netIncome','ocf','capex','sbc','leaseCash','operatingIncome','revenue','ppe','receivables','inventory','payables']:x.test==='moat'?['netIncome','operatingIncome','revenue','grossProfit','equity','totalDebt','cash']:['netIncome','dividendsPaid','marketCap','dilutedShares'];
 if(!fields.length&&x.trace.minimalGroups.includes('fiscal-year set'))fields=x.test==='understandable'?['revenue','operatingIncome','netIncome']:x.test==='management'?['dilutedShares','netIncome','dividendsPaid','marketCap']:['netIncome','revenue','operatingIncome','ocf','capex','equity','totalDebt','cash'];
 const checks=[];
 for(const y of years.slice(-11))for(const field of fields){
  if(typeof y[field]!=='number')continue;
  // Only altered observations require new-side attribution checks; the 19
  // historical-code cases instead audit the current calculation window.
  if(x.trace.status==='attributed'&&x.trace.minimalFields.length&&!x.trace.deltas.some((d:any)=>d.fy===y.fy&&d.field===field&&d.before!==d.after))continue;
  const origin=y.provenance?.[field]?.source??'';
  const candidates=sources.flatMap(s=>s.years.filter(n=>n.currency===y.currency&&Math.abs(Date.parse(n.end)-Date.parse(y.end))<=7*86400000&&typeof n[field]==='number').map(n=>({provider:s.label,value:n[field],source:n.provenance?.[field]?.source??s.label,field:n.provenance?.[field]?.field,method:n.provenance?.[field]?.method})));
  const independent=candidates.filter(n=>family(n.source)!==family(origin)&&n.source!==origin);
  const comparable=independent.filter(n=>field!=='dilutedShares'||n.method!=='estimate'&&!/proxy|outstanding/i.test(n.field??'')||/weightedaverage|dilutedaverage/i.test(n.field??''));
  const tolerance=field==='dilutedShares'?.02:.01;
  const match=comparable.find(n=>Math.abs(n.value-y[field])<=Math.max(1,Math.abs(y[field]),Math.abs(n.value))*tolerance);
  checks.push({fy:y.fy,end:y.end,field,value:y[field],origin,tolerance,status:match?'AGREES':comparable.length?'DISAGREES':independent.length?'INCOMPARABLE_BASIS':'NO_SECOND_SOURCE',match,candidates:match?undefined:independent});
 }
 results.push({id:x.id,test:x.test,fields,checks,summary:Object.fromEntries(['AGREES','DISAGREES','INCOMPARABLE_BASIS','NO_SECOND_SOURCE'].map(s=>[s,checks.filter(c=>c.status===s).length]))});
}
writeFileSync(args.out??'.fix5c/nightly-5/source-checks.json.gz',gzipSync(JSON.stringify(results)));
console.log(JSON.stringify(results.map(x=>({id:x.id,test:x.test,...x.summary})),null,2));
