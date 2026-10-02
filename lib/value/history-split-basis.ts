import {issuerSplits,issuerCapitalChanges} from './completeness/issuer-events';
import type {Fundamentals,PriceHistory,Year} from './types';
/** Convert each field only when its own basis agrees with the old denominator.
 * Comparative EPS and issued shares can already be restated independently. */
export function adjustShareUnits(year:Year,factor:number):void {
 const shares=year.dilutedShares;
 if(!shares||shares<=0)return;
 for(const key of ['basicEps','dilutedEps'] as const){
  const eps=year[key];
  if(eps!=null&&year.netIncome&&Math.abs(eps*shares/year.netIncome-1)<.15)year[key]=eps/factor;
 }
 if(year.dividendsPerShare!=null&&year.dividendsPaid&&Math.abs(year.dividendsPerShare*shares/year.dividendsPaid-1)<.15)year.dividendsPerShare/=factor;
 for(const key of ['sharesOutstanding'] as const)if(year[key]&&Math.abs(year[key]!/shares-1)<.15)year[key]!*=factor;
 if(year.edinetShares){
  year.edinetShares={...year.edinetShares};
  const basis=year.edinetShares.issued;
  if(basis&&Math.abs(basis/shares-1)<.15)for(const key of ['basic','issued','treasury'] as const)if(year.edinetShares[key]!=null)year.edinetShares[key]!*=factor;
 }
 if(year.navPerShare!=null&&year.investmentNav&&Math.abs(year.navPerShare*shares/year.investmentNav-1)<.15)year.navPerShare/=factor;
 year.dilutedShares=shares*factor;
 year.provenance={...year.provenance,dilutedShares:{source:year.provenance?.dilutedShares?.source??'reported corporate action',field:'split-adjusted diluted shares',method:'derived',inputs:[`original shares: ${shares}`,`split factor: ${factor}`]}};
}

/** Normalize mixed comparative share bases backwards from the latest annual
 * denominator. A temporary restated block may introduce both a split-sized
 * jump and its inverse: date-only scaling would adjust that block twice.
 * Historical EPS plus an explicit action corroborate early comparative jumps;
 * share issuance without this evidence remains real dilution. */
export function alignHistoryShares(f:Fundamentals,_prices:PriceHistory):Fundamentals {
 const actions=[...new Map([...(f.splits??[]),...(issuerSplits[f.id]??[])].map(s=>[s.date,s])).values()];
 const years=f.years.map(y=>({...y})).sort((a,b)=>a.end.localeCompare(b.end));
 if(years.length<2)return f;
 // A bounded island has a second independent anchor even when EPS is absent.
 // Restore that island to its surrounding basis before walking the full series.
 for(let first=1;first<years.length-1;first++){
  const before=years[first-1],current=years[first];
  if(!before.dilutedShares||!current.dilutedShares)continue;
  const action=actions.flatMap(s=>[s,{...s,factor:1/s.factor}]).find(s=>s.factor>0&&Math.max(s.factor,1/s.factor)>=1.5&&s.date>before.end
   &&s.date<=(f.fetchedAt?.slice(0,10)||years.at(-1)!.end)&&Math.abs(current.dilutedShares!/before.dilutedShares!/s.factor-1)<.1);
  if(!action)continue;
  let last=first;
  while(last+1<years.length&&years[last+1].dilutedShares&&Math.abs(years[last+1].dilutedShares!/current.dilutedShares-1)<.1)last++;
  const after=years[last+1];
  if(!after?.dilutedShares||Math.abs(after.dilutedShares/before.dilutedShares-1)>.1)continue;
  if(!years.slice(first-1,last+2).every((y,j,ys)=>!j||y.fy===ys[j-1].fy+1))continue;
  if(!years.slice(first-1,last+2).every(y=>!y.currency||!before.currency||y.currency===before.currency))continue;
  if(issuerCapitalChanges[f.id]?.some(e=>e.fy>=before.fy&&e.fy<=after.fy))continue;
  for(const y of years.slice(first,last+1))adjustShareUnits(y,1/action.factor);
  first=last;
 }
 const factors=Array(years.length).fill(1);
 for(let i=years.length-2;i>=0;i--){
  factors[i]=factors[i+1];
  const before=years[i],after=years[i+1];
  if(!before.dilutedShares||!after.dilutedShares||after.fy!==before.fy+1||before.currency&&after.currency&&before.currency!==after.currency)continue;
  if(issuerCapitalChanges[f.id]?.some(e=>after.fy>=e.fy&&after.fy<=(e.throughFy??e.fy)))continue;
  const ratio=after.dilutedShares/before.dilutedShares;
  const action=actions.flatMap(s=>[s,{...s,factor:1/s.factor}]).filter(s=>s.factor>0&&Math.max(s.factor,1/s.factor)>=1.5
   &&s.date>before.end&&s.date<=(years.at(-1)!.edinetShares?.filed??years.at(-1)!.end)
   &&Date.parse(s.date)-Date.parse(before.end)<=6*366*86400000
   &&(s.date<=after.end||(before.basicEps||before.dilutedEps||after.basicEps||after.dilutedEps))
   &&Math.abs(ratio/s.factor-1)<.12).sort((a,b)=>Math.abs(ratio/a.factor-1)-Math.abs(ratio/b.factor-1))[0];
  if(!action)continue;
  const totals=(['netIncome','equity','totalAssets','revenue'] as const).filter(key=>before[key]!=null&&after[key]!=null&&before[key]!==0);
  if(totals.length<2||totals.some(key=>Math.abs(after[key]!/before[key]!/action.factor-1)<.12))continue;
  factors[i]*=action.factor;
 }
 if(factors.every(n=>Math.abs(n-1)<1e-8)&&years.every((y,i)=>y.dilutedShares===f.years[i].dilutedShares))return f;
 return {...f,splits:actions,years:years.map((year,i)=>{if(Math.abs(factors[i]-1)<1e-8)return year;const copy={...year};adjustShareUnits(copy,factors[i]);return copy;})};
}
