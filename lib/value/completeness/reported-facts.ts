import {emptyYear} from './second-sources';
import {annualFiscalYear} from '../fiscal-period';
import type {Year} from '../types';
import issuerFacts from './issuer-facts.json';
import auditFacts from './audit-facts.json';
import rules7Facts from './rules-7-facts.json';
export interface ReportedFacts {
 end:string; currency:string; source:string; quote:string;
 values:Partial<Record<keyof Year,number>>;
 methods?:Partial<Record<keyof Year,NonNullable<Year['provenance']>[string]['method']>>;
 splitFactor?:number;
 calculation?:string;
 correction?:boolean;
 absenceInCompleteStatement?:boolean;
}
export const withReportedFacts=(id:string,years:Year[])=>applyReportedFacts(years,[...((issuerFacts as Record<string,ReportedFacts[]>)[id]??[]),...((auditFacts as Record<string,ReportedFacts[]>)[id]??[]),...((rules7Facts as Record<string,ReportedFacts[]>)[id]??[])]);
/** Reviewed issuer observations supplement provider statements without replacing
 * their reported totals. Per-share history must declare its split basis. */
export function applyReportedFacts(years:Year[],facts:ReportedFacts[]):Year[]{
 const result:Year[]=years.map(y=>({...y,provenance:{...y.provenance}}));
 for(const f of facts){
  if(!f.quote.trim()||!/^https:\/\//.test(f.source)||!/^\d{4}-\d{2}-\d{2}$/.test(f.end))throw Error('Reported fact requires dated source evidence');
  const split=f.splitFactor??1;if(!Number.isFinite(split)||split<=0)throw Error('Invalid split factor');
  // A reviewed annual total can identify a provider's rounded month-end row.
  // Date proximity alone is insufficient: require a unique same-currency total.
  const nearby=result.filter(y=>y.currency===f.currency&&Math.abs(Date.parse(y.end)-Date.parse(f.end))<=7*86400000
   &&(['revenue','netIncome','totalAssets'] as const).some(k=>f.values[k]!=null&&f.values[k]!==0&&y[k]===f.values[k]));
  const exact=result.find(y=>y.end===f.end);
  const anchor=nearby.length===1?nearby[0]:undefined;
  // A prior cash-only correction can have created a sparse exact-date row.
  // Rejoin it only with a uniquely corroborated annual total; never by date alone.
  const sparse=exact&&['revenue','netIncome','totalAssets'].every(k=>exact[k as keyof Year]==null);
  if(sparse&&anchor&&anchor!==exact){
   for(const [field,value] of Object.entries(exact))if(value!=null&&anchor[field as keyof Year]==null&&field!=='provenance'){
    Object.assign(anchor,{[field]:value});
    if(exact.provenance?.[field])anchor.provenance![field]=exact.provenance[field];
   }
   result.splice(result.indexOf(exact),1);
  }
  const existing=sparse&&anchor?anchor:exact??anchor;
  if(existing?.currency&&existing.currency!==f.currency&&!f.correction)throw Error('Reported fact currency mismatch');
  const y=existing??emptyYear(f.end,f.currency);
  if(!existing)result.push(y);
  y.provenance??={};
  if(existing&&y.end!==f.end){
   y.provenance.end={source:f.source,field:'annual reporting period',method:'reported',inputs:[`Provider date: ${y.end}`,f.quote]};
   y.end=f.end;y.fy=annualFiscalYear(f.end);
  }
  if(f.correction && y.currency!==f.currency){
   y.provenance.currency={source:f.source,field:'reporting currency',method:'reported',inputs:[f.quote]};
   y.currency=f.currency;
  }
  for(const [field,reported] of Object.entries(f.values)){
   if(!Number.isFinite(reported))throw Error('Reported value must be finite');
   if(f.absenceInCompleteStatement&&reported!==0)throw Error('An absent line must be zero');
   // A pre-spin / unavailable share count is not evidence of no shares.
   if((field==='dilutedShares'||field==='sharesOutstanding')&&reported<=0)continue;
   if(y[field as keyof Year]!=null&&!f.correction)continue;
   const perShare=['navPerShare','dividendsPerShare','dilutedEps','basicEps'].includes(field);
   Object.assign(y,{[field]:perShare?reported/split:reported});
   y.provenance[field]={source:f.source,field,method:f.methods?.[field as keyof Year]??(f.absenceInCompleteStatement?'absent-in-complete-statement':f.calculation||perShare&&split!==1?'derived':'reported'),inputs:[f.quote,...(f.calculation?[f.calculation]:[]),...(perShare&&split!==1?[`reported per-share value divided by split factor ${split}`]:[])]};
  }
 }
 return result.sort((a,b)=>a.end.localeCompare(b.end));
}
