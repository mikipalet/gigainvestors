import {ownerEarningsBridge} from './owner-earnings';
import {last,median,present,returnOnTotalCapital,withZeroDefaults} from './metrics';
import type {Analysis,Series,Year} from './types';

/** Same ten-year owner-earnings basis as the compounder rule, independent of price availability. */
export function withCapitalReturns(a:Analysis,years:Year[]):Analysis {
 if(a.company.kind!=='operating'||a.company.investmentHolding)return a;
 const ys=withZeroDefaults(years),end=last(ys,1)[0]?.fy;
 // Some merged sources retain empty placeholder rows beside the annual statement.
 // A placeholder must not mask the calculated observation for that fiscal year.
 const byYear=new Map<number,number|null>();
 for(const r of ownerEarningsBridge(ys).filter(r=>r.year.fy>end-10)){
  const value=returnOnTotalCapital(r.year,r.value);
  if(value!==null||!byYear.has(r.year.fy))byYear.set(r.year.fy,value);
 }
 const series:Series=[...byYear].sort((a,b)=>a[0]-b[0]);
 const value=median(present(series.map(([,n])=>n)));
 return {...a,series:{...a.series,totalRoic:series},tests:{...a.tests,moat:{...a.tests.moat,
  metrics:{...a.tests.moat.metrics,totalRoicMedian:value},series:{...a.tests.moat.series,totalRoic:series}}}};
}
