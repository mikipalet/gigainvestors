import { investedCapital, nwc, roic, roe, grossMargin } from '../metrics';
import { ownerEarningsSeries } from '../owner-earnings';
import type { Fundamentals, Kind, Year } from '../types';

/** Missing mathematical ratios (zero denominators) are not missing statement values. */
export function completionYears(f:Fundamentals,kind:Kind):Set<number>{
 const needed=new Set<number>(),history=f.years.slice(-11),recent=history.slice(-10),five=history.slice(-5),latest=history.at(-1);
 const need=(y:Year|undefined,keys:Array<keyof Year>)=>{if(y&&keys.some(k=>y[k]==null))needed.add(y.fy);};
 for(const y of recent){
  need(y,['revenue','operatingIncome','netIncome','dilutedShares']);
  if((kind==='operating'?roic(y):roe(y))===null)needed.add(y.fy);
  need(y,['dividendsPaid','buybacks']);
  if(kind==='operating'&&nwc(y)===null&&investedCapital(y)===null)needed.add(y.fy);
  if(y.acquisitions===null && (y.goodwill===null||y.intangibles===null))needed.add(y.fy);
 }
 if(kind==='operating')for(const y of [...recent.slice(0,3),...recent.slice(-3)])if(nwc(y)===null)needed.add(y.fy);
 const owner=new Map(ownerEarningsSeries(f.years));
 for(const y of five){need(y,['nonRecurring']);if(owner.get(y.fy)==null)needed.add(y.fy);}
 need(latest,['ocf','sbc','netIncome']);
 if(kind==='operating'){
  need(latest,['totalAssets','receivables','revenue']);need(history.at(-2),['receivables','revenue']);
  for(const y of recent)if(grossMargin(y)===null)needed.add(y.fy);
 }
 return needed;
}
