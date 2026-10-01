import {emptyYear} from './second-sources';
import type {Year} from '../types';
import issuerFacts from './issuer-facts.json';
import auditFacts from './audit-facts.json';
export interface ReportedFacts {
 end:string; currency:string; source:string; quote:string;
 values:Partial<Record<keyof Year,number>>;
 splitFactor?:number;
 calculation?:string;
 correction?:boolean;
 absenceInCompleteStatement?:boolean;
}
export const withReportedFacts=(id:string,years:Year[])=>applyReportedFacts(years,[...((issuerFacts as Record<string,ReportedFacts[]>)[id]??[]),...((auditFacts as Record<string,ReportedFacts[]>)[id]??[])]);
/** Reviewed issuer observations supplement provider statements without replacing
 * their reported totals. Per-share history must declare its split basis. */
export function applyReportedFacts(years:Year[],facts:ReportedFacts[]):Year[]{
 const result:Year[]=years.map(y=>({...y,provenance:{...y.provenance}}));
 for(const f of facts){
  if(!f.quote.trim()||!/^https:\/\//.test(f.source)||!/^\d{4}-\d{2}-\d{2}$/.test(f.end))throw Error('Reported fact requires dated source evidence');
  const split=f.splitFactor??1;if(!Number.isFinite(split)||split<=0)throw Error('Invalid split factor');
  const existing=result.find(y=>y.end===f.end);
  if(existing?.currency&&existing.currency!==f.currency&&!f.correction)throw Error('Reported fact currency mismatch');
  const y=existing??emptyYear(f.end,f.currency);
  if(!existing)result.push(y);
  y.provenance??={};
  if(f.correction && y.currency!==f.currency){
   y.provenance.currency={source:f.source,field:'reporting currency',method:'reported',inputs:[f.quote]};
   y.currency=f.currency;
  }
  for(const [field,reported] of Object.entries(f.values)){
   if(!Number.isFinite(reported))throw Error('Reported value must be finite');
   if(f.absenceInCompleteStatement&&reported!==0)throw Error('An absent line must be zero');
   if(y[field as keyof Year]!=null&&!f.correction)continue;
   const perShare=['navPerShare','dividendsPerShare','dilutedEps','basicEps'].includes(field);
   Object.assign(y,{[field]:perShare?reported/split:reported});
   y.provenance[field]={source:f.source,field,method:f.absenceInCompleteStatement?'absent-in-complete-statement':f.calculation||perShare&&split!==1?'derived':'reported',inputs:[f.quote,...(f.calculation?[f.calculation]:[]),...(perShare&&split!==1?[`reported per-share value divided by split factor ${split}`]:[])]};
  }
 }
 return result.sort((a,b)=>a.end.localeCompare(b.end));
}
