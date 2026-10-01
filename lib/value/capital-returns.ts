import {ownerEarningsBridge} from './owner-earnings';
import {last,median,present,returnOnTotalCapital,withZeroDefaults} from './metrics';
import type {Analysis,Series,Year} from './types';

/** Same ten-year owner-earnings basis as the compounder rule, independent of price availability. */
export function withCapitalReturns(a:Analysis,years:Year[]):Analysis {
 if(a.company.kind!=='operating'||a.company.investmentHolding)return a;
 const ys=withZeroDefaults(years),end=last(ys,1)[0]?.fy;
 const series:Series=ownerEarningsBridge(ys).filter(r=>r.year.fy>end-10).map(r=>[r.year.fy,returnOnTotalCapital(r.year,r.value)]);
 const value=median(present(series.map(([,n])=>n)));
 return {...a,tests:{...a.tests,moat:{...a.tests.moat,
  metrics:{...a.tests.moat.metrics,totalRoicMedian:value},series:{...a.tests.moat.series,totalRoic:series}}}};
}
