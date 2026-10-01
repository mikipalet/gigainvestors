import type {BusinessFlag,Observation,Theme} from './types';
import {validEvidence} from './trust';
const pct=(v:number)=>`${Math.round(v*100)}%`;
const money=(v:number,c:string)=>`${c} ${(v/(Math.abs(v)>=1e9?1e9:1e6)).toFixed(1).replace(/\.0$/,'')}${Math.abs(v)>=1e9?'bn':'m'}`;
/** Deliberately consumes evidenced observations, not vendor estimates or inferred zeroes. */
export function computeFlags(input:Observation[]):BusinessFlag[]{
 const rows=input.filter(o=>Number.isFinite(o.value)&&validEvidence(o.evidence));
 const flags:BusinessFlag[]=[];
 const latest=Math.max(...rows.map(o=>o.fy));
 const get=(metric:string,fy=latest)=>rows.find(o=>o.metric===metric&&o.fy===fy);
 const same=(...o:Array<Observation|undefined>):boolean=>o.every(Boolean)&&new Set(o.map(v=>v!.currency)).size===1;
 function add(kind:string,theme:Theme,tone:'red'|'green',severity:number,label:string,why:string,question:string,observations:Observation[],series:BusinessFlag['series'],unit:BusinessFlag['unit']){
  flags.push({id:kind,kind,theme,tone,severity,label,why,question,evidence:[...new Map(observations.map(o=>[o.evidence.url+o.evidence.quote,o.evidence])).values()],series,unit,currency:observations[0].currency,basis:'computed'});
 }
 function ratios(a:string,b:string){return [...new Set(rows.map(o=>o.fy))].sort().flatMap(fy=>{const x=get(a,fy),y=get(b,fy);return same(x,y)&&y!.value>0?[[fy,x!.value/y!.value] as [number,number]]:[];});}
 const cap=get('capex'),da=get('depreciation')??get('da');
 if(same(cap,da)&&cap!.value>=0&&da!.value>0){
  const ratio=cap!.value/da!.value,series=ratios('capex',da!.metric),previous=series.find(([fy])=>fy===latest-1)?.[1];
  if(ratio>=1.5)add('capital-intensity','Capital cycle','red',ratio>=3?85:65,`Capex ${ratio.toFixed(1)}× ${da!.metric==='da'?'D&A':'depreciation'}${previous!=null&&ratio>previous*1.1?', rising':''}`,'Investment is consuming more cash than the accounting charge; growth spending may not earn its cost.','What return will the next dollar of capital spending earn?',rows.filter(o=>['capex',da!.metric].includes(o.metric)),series,'ratio');
 }
 const cash=get('cash'),debt=get('debt');
 if(same(cash,debt)&&cash!.value>debt!.value&&debt!.value>=0){
  const series=rows.filter(o=>o.metric==='cash').flatMap(o=>{const d=get('debt',o.fy);return same(o,d)?[[o.fy,o.value-d!.value] as [number,number]]:[];}).sort((a,b)=>a[0]-b[0]);
  add('net-cash','Balance sheet','green',55,`Net cash ${money(cash!.value-debt!.value,cash!.currency)}`,'Cash and liquid investments exceed disclosed debt; this gives the business financial room.','How much of this cash is truly surplus to running the business?',rows.filter(o=>['cash','debt'].includes(o.metric)),series,'money');
 }
 const goodwill=get('goodwill'),equity=get('equity');
 if(same(goodwill,equity)&&goodwill!.value>0&&(equity!.value<=0||goodwill!.value/equity!.value>.5))add('goodwill-equity','Accounting choices','red',70,equity!.value>0?`Goodwill ${pct(goodwill!.value/equity!.value)} of equity`:`Goodwill ${money(goodwill!.value,goodwill!.currency)}, equity ≤ 0`,'Acquisition premiums make up a large part of the balance sheet and may be impaired.','Have the acquisitions earned their purchase prices?',[goodwill!,equity!],ratios('goodwill','equity'),'ratio');
 for(const metric of ['receivables','inventory','shares']){
  const now=get(metric),prev=get(metric,latest-1),sales=get('revenue'),oldSales=get('revenue',latest-1);
  if(!same(now,prev)||prev!.value<=0)continue;
  const growth=now!.value/prev!.value-1;
  if(metric==='shares'){
   if(growth>.02)add('share-dilution','Owners and management','red',60,`${/WeightedAverage/.test(now!.evidence.section??'')?'Diluted share base':'Share count'} +${pct(growth)}`,'More shares can reduce each owner’s claim; weighted-average counts also reflect issuance timing and share conversions.','What did continuing shareholders receive for the dilution?',[now!,prev!],rows.filter(o=>o.metric==='shares').map(o=>[o.fy,o.value]),'count');
  }else if(same(now,prev,sales,oldSales)&&oldSales!.value>0){
   const revenueGrowth=sales!.value/oldSales!.value-1;
   if(growth>revenueGrowth+.1&&growth>.1&&sales!.value>0&&now!.value/sales!.value>=.02)add(`${metric}-growth`,'Capital cycle','red',65,`${metric==='receivables'?'Receivables':'Inventory'} +${pct(growth)}; sales ${revenueGrowth>=0?'+':''}${pct(revenueGrowth)}`,metric==='receivables'?'Sales are turning into receivables faster than cash; collection quality deserves a closer look.':'Stock is building faster than sales; future markdowns or weaker demand could absorb cash.','Is this timing, expansion, or a deterioration in demand?',[now!,prev!,sales!,oldSales!],ratios(metric,'revenue'),'ratio');
  }
 }
 const obligations=['purchase-obligations','lease-commitments','uncommenced-leases'].map(m=>get(m)),oe=get('owner-earnings');
 // All components must be explicit and non-overlapping. A lease liability is not a lease commitment.
 if(same(...obligations,oe)&&oe!.value>0&&obligations.every(o=>o!.value>=0)){
  const total=obligations.reduce((n,o)=>n+o!.value,0),ratio=total/oe!.value;
  if(ratio>2)add('commitments','Obligations off the balance sheet','red',80,`Commitments ${ratio.toFixed(1)}× owner earnings`,'Contractual cash demands include leases that have not yet commenced.','Can ordinary owner earnings fund these promises through a downturn?',[...obligations as Observation[],oe!],[[latest,ratio]],'ratio');
 }
 const unstarted=get('uncommenced-leases')??get('venture-uncommenced-leases');
 if(unstarted&&unstarted.value>0&&!flags.some(f=>f.kind==='commitments'))add('uncommenced-leases','Obligations off the balance sheet','red',94,`${unstarted.metric.startsWith('venture')?'Venture leases':'Unstarted leases'} ${money(unstarted.value,unstarted.currency)}`,'These committed leases have not yet commenced and are outside the recognised lease liabilities.','Can the future business pay for the capacity already promised?',[unstarted],[[latest,unstarted.value]],'money');
 const supports=['financial-guarantees','credit-derivatives'].map(m=>get(m));
 if(same(...supports)&&supports.every(o=>o!.value>=0)){const total=supports.reduce((s,o)=>s+o!.value,0);if(total>0)add('credit_backstop','Obligations off the balance sheet','red',95,`Credit backstops ${money(total,supports[0]!.currency)} max`,'Maximum disclosed payments combine financial guarantees and credit derivatives; these are contingent exposures, not expected losses.','How much could come due together if the supported counterparties fail?',supports as Observation[],[[latest,total]],'money');}
 const near=get('debt-due-2y');
 if(same(near,cash)&&near!.value>cash!.value&&cash!.value>=0)add('near-debt','Balance sheet','red',85,`Debt due in 2y ${money(near!.value,near!.currency)}; cash ${money(cash!.value,cash!.currency)}`,'Near-term maturities exceed cash and may require refinancing.','Could the company repay these maturities if credit markets closed?',[near!,cash!],[[latest,near!.value-cash!.value]],'money');
 const pension=get('pension-deficit');
 if(pension&&pension.value>0)add('pension-deficit','Balance sheet','red',60,`Pension deficit ${money(pension.value,pension.currency)}`,'The pension shortfall is a claim on future cash available to owners.','How much cash will the pension plan need under conservative assumptions?',[pension],[[latest,pension.value]],'money');
 const adjusted=get('adjusted-profit'),reported=get('reported-profit');
 if(same(adjusted,reported)&&reported!.value>0&&adjusted!.value/reported!.value>1.2)add('profit-gap','Accounting choices','red',70,`Adjusted profit ${pct(adjusted!.value/reported!.value-1)} above reported`,'The preferred profit measure excludes substantial costs incurred by shareholders.','Which excluded costs will still be here in five years?',[adjusted!,reported!],ratios('adjusted-profit','reported-profit'),'ratio');
 if(same(adjusted,reported)&&reported!.value<=0&&adjusted!.value>0)add('profit-gap','Accounting choices','red',88,`Adjusted profit ${money(adjusted!.value,adjusted!.currency)}; reported loss ${money(Math.abs(reported!.value),reported!.currency)}`,'The adjusted measure shows a profit while the statutory measure records a loss.','Which excluded costs are truly exceptional?',[adjusted!,reported!],[[latest,adjusted!.value-reported!.value]],'money');
 const paid=get('buyback-price'),value=get('our-value-at-buyback'),spent=get('buybacks');
 if(same(paid,value,spent)&&value!.value>0&&spent!.value>0){const premium=paid!.value/value!.value-1;if(Math.abs(premium)>.1)add('buyback-value','Owners and management',premium>0?'red':'green',55,`Buybacks ${pct(Math.abs(premium))} ${premium>0?'above':'below'} our value`,'Repurchases create value only when the shares cost less than the business is worth.','Was buying our own shares the best use of that cash?',[paid!,value!,spent!],[[latest,paid!.value/value!.value]],'ratio');}
 const insider=get('insider-ownership');
 if(insider&&insider.value>.1&&insider.value<=1)add('insider-ownership','Owners and management','green',50,`Insiders own ${pct(insider.value)}`,'A material personal stake can align managers with long-term owners; voting control can still differ.','Do managers share the same economic upside and downside as outside owners?',[insider],[[latest,insider.value]],'percent');
 const inflation=get('inflation'),margin=get('gross-margin'),oldMargin=get('gross-margin',latest-1),pricing=get('price-increase');
 if(same(inflation,margin,oldMargin,pricing)&&inflation!.value>.02&&pricing!.value>0&&margin!.value>=oldMargin!.value&&margin!.value<=1)add('pricing-resilience','Capital cycle','green',60,`Gross margin ${pct(margin!.value)} through ${pct(inflation!.value)} inflation`,'Disclosed price increases preserved gross margin despite higher input costs.','Did higher prices preserve customer demand as well as the margin?',[inflation!,margin!,oldMargin!,pricing!],rows.filter(o=>o.metric==='gross-margin').map(o=>[o.fy,o.value]),'percent');
 return flags.sort((a,b)=>b.severity-a.severity||a.id.localeCompare(b.id));
}
