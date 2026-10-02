// Independent arithmetic audit: cached source flows/prices and a separate DCF/IRR calculation.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const [stage=path.join(os.homedir(),'value-corpus/staging/quarterly-1')]=process.argv.slice(2);
const corpus=process.env.VALUE_CORPUS_DIR??path.join(os.homedir(),'value-corpus');
const read=p=>JSON.parse(readFileSync(p,'utf8')),audit=read(path.join(stage,'quarterly-audit.json')).audit;
const ids=['KO.US','AAPL.US','GOOGL.US','WKL.AS','7203.JP'],quarters=['2008Q4','2016Q1','2020Q1','2022Q4'],checks=[];
const close=(a,b)=>a===b||a!=null&&b!=null&&Math.abs(a-b)<=Math.max(1e-6,Math.abs(b)*1e-9);
for(const id of ids){
 const f=read(path.join(corpus,`fundamentals/${id}.json`)),rawFile=path.join(corpus,`raw/eodhd/${id}.json`),raw=existsSync(rawFile)?read(rawFile).Financials:null;
 const long=path.join(corpus,`prices-history-long/${id}.json`),cache=read(existsSync(long)?long:path.join(corpus,`prices-history/${id}.json`)),prices=Array.isArray(cache)?cache:cache.prices;
 for(const q of quarters){
  const x=audit[`${id}/${q}`],end=new Date(Date.UTC(Number(q.slice(0,4)),Number(q.at(-1))*3,0)).toISOString().slice(0,10);
  if(!x){checks.push({id,q,excluded:true,reason:!prices.some(p=>p[0]===end.slice(0,7))?'No cached quarter-end close':'Fewer than ten filed annual observations'});continue;}
  const failures=[],price=prices.find(p=>p[0]===end.slice(0,7))?.[1];
  if(!close(price,x.row[5].price))failures.push('price mismatch');
  if(x.basis.annualFiled>=end||x.basis.periods.some(p=>p.filed>=end))failures.push('filing cutoff');
  const source=[];
  for(const p of x.basis.periods){
   if(p.source!=='EODHD'){failures.push('manual source audit requires SEC accession');continue;}
   const i=raw.Income_Statement.quarterly[p.end],c=raw.Cash_Flow.quarterly[p.end];
   const n=v=>v==null?null:Number(v);
   source.push({end:p.end,filed:p.filed,ni:n(i.netIncome),da:n(i.depreciationAndAmortization??i.reconciledDepreciation??c.depreciationAndAmortization??c.depreciation),capex:Math.abs(n(c.capitalExpenditures)),sbc:n(c.stockBasedCompensation)});
  }
  if(x.ttm&&source.length)for(const [a,b]of [['ni','netIncome'],['da','da'],['capex','capex'],['sbc','sbc']]){
   const sum=source.reduce((s,p)=>s+(p[a]??0),0);if(!close(sum,x.ttm[b]))failures.push(`${b} sum mismatch`);
  }
  const v=x.valuation;let irr=null,pv=null;
  if(v?.method==='owner_earnings'){
   const flows=[];let cash=v.normalized/v.shares;
   for(let t=1;t<=10;t++){const g=v.tier==='compounder'?v.growth+(v.terminalGrowth-v.growth)*(t-1)/9:t<=5?v.growth:v.growth+(v.terminalGrowth-v.growth)*(t-5)/5;cash*=1+g;flows.push(cash);}
   const value=r=>v.netCash/v.shares+flows.reduce((s,c,i)=>s+c/(1+r)**(i+1),0)+flows[9]*(1+v.terminalGrowth)/(r-v.terminalGrowth)/(1+r)**10;
   pv=value(v.discountRate);if(!close(pv,v.perShare.mid))failures.push('discounted value mismatch');
   const target=price/(v.perShareTrading?.fxRate??1);let lo=v.terminalGrowth+1e-10,hi=1;
   while(value(hi)>target&&hi<1e12)hi*=2;
   if(target>v.netCash/v.shares){for(let j=0;j<120;j++){const mid=(lo+hi)/2;if(value(mid)>target)lo=mid;else hi=mid;}irr=(lo+hi)/2;}
   if(x.row[7].expected!==null&&Math.abs(irr-x.row[7].expected)>.00000051)failures.push('IRR mismatch');
  }
  const annual=f.years.find(y=>y.end===x.basis.annualEnd);
  checks.push({id,q,price,annual:x.basis.annual,annualFiled:x.basis.annualFiled,ttmEnd:x.basis.ttmEnd,source,annualFallback:!source.length?{netIncome:annual.netIncome,da:annual.da,capex:annual.capex,sbc:annual.sbc}:undefined,normalized:v?.normalized,shares:v?.shares,pv,expected:x.row[7].expected,irr,quality:x.row[1],buy:x.row[3],failures});
 }
}
writeFileSync(path.join(stage,'quarterly-reproduction.json'),JSON.stringify(checks)+'\n');
console.log(JSON.stringify({checked:checks.filter(r=>!r.excluded).length,excluded:checks.filter(r=>r.excluded).map(({id,q,reason})=>({id,q,reason})),failures:checks.filter(r=>r.failures?.length)}));
if(checks.some(r=>r.failures?.length))process.exitCode=1;
