import {secondaryListingYears} from './listing-units';
import {fillYears} from './second-sources';
import {deriveYears} from '../derive';
import {annualFiscalYear} from '../fiscal-period';
import {withReportedFacts} from './reported-facts';
import {restoreReportedPeriods} from './reported-periods';
import {normalizeEodhd} from '../normalize-eodhd';
import type {Company,Year} from '../types';
import type {Fundamentals} from '../types';
import {issuerPredecessors,issuerSplits,issuerCapitalChanges} from './issuer-events';
import {translatePresentationCurrency,type CurrencyTranslation} from './presentation-currency';

interface VerifiedSource {id:string;sourceId:string;isin?:string;fundamentals:Fundamentals;patch:Partial<Company>;currencyTranslations?:CurrencyTranslation[]}
export function completeCachedSplits(id:string,splits:Fundamentals['splits'],read:<T>(path:string)=>T|null):Fundamentals['splits']{
 const incoming=read<VerifiedSource>(`completeness/verified/${id}.json`)?.fundamentals.splits??[];
 return [...new Map([...(splits??[]),...incoming,...(issuerSplits[id]??[])].map(s=>[s.date,s])).values()].sort((a,b)=>a.date.localeCompare(b.date));
}
export function completeCompanyMetadata(company:Company,read:<T>(path:string)=>T|null):Company{
 const verified=read<VerifiedSource>(`completeness/verified/${company.id}.json`);
 if(!verified || verified.id!==company.id)return company;
 const {industry,sector,cik}=verified.patch;
 return {...company,industry:industry??company.industry,sector:sector??company.sector,cik:cik??company.cik};
}

/** Restore source observations before integrity checks; never manufacture history. */
export function completeCachedYears(company:Pick<Company,'id'|'cik'|'source'>,years:Year[],read:<T>(path:string)=>T|null):Year[]{
 const verified=read<VerifiedSource>(`completeness/verified/${company.id}.json`);
 const translate=(ys:Year[])=>translatePresentationCurrency(ys,verified?.id===company.id?verified.currencyTranslations??[]:[]);
 let result=translate(years.map(y=>({...y,fy:annualFiscalYear(y.end)})));
 if(verified?.id===company.id){
  const incoming=translate(verified.fundamentals.years);
  result=(incoming.at(-1)?.end??'')>=(result.at(-1)?.end??'')?fillYears(incoming,result):fillYears(result,incoming);
 }
 // A newer secondary listing may repair the latest currency label. Restore
 // the original listing's raw history only after choosing that currency;
 // otherwise an earlier integrity cut has already discarded valid years.
 const original=read<unknown>(`raw/eodhd/${company.id}.json`);
 if(original){
  let sourceYears:Year[]=[];
  normalizeEodhd(original,company.id,{onSourceYears:ys=>sourceYears=ys});
  result=fillYears(result,translate(sourceYears));
 }
 if(company.source==='edinet'){
  const issuer=read<{years?:Year[];excludedPeriods?:string[]}>(`raw/edinet/issuers/${company.id}.json`);
  // Raw issuer EPS carries the latest comparative split basis. Reusing an
  // already truncated/adjusted denominator would mix two different bases.
  if(issuer?.years?.length)result=fillYears(translate(issuer.years),result.filter(y=>!issuer.excludedPeriods?.includes(y.end)));
 }
 const filingYears=read<Year[]>(`completeness/issuer-years/${company.id}.json`);
 if(filingYears?.length)result=fillYears(translate(filingYears),result);
 const ciks=new Set([company.cik,...years.flatMap(y=>Object.values(y.provenance??{}).map(p=>/CIK(\d+)/.exec(p.source)?.[1]))].filter(Boolean).map(s=>String(Number(s))));
 for(const cik of ciks){
  const cache=read<Year[]>(`completeness/sec/${cik}.json`)??read<Year[]>(`completeness/sec/${cik.padStart(10,'0')}.json`);
  if(cache)result=fillYears(result,translate(cache.map(y=>({...y,fy:annualFiscalYear(y.end)}))));
 }
 for(const source of ['yahoo','edinet']){
  const cache=read<Year[]>(`completeness/${source}/${company.id}.json`);
  if(cache)result=fillYears(result,translate(secondaryListingYears(company.id,cache)));
 }
 const predecessor=issuerPredecessors[company.id];
 if(predecessor){
  const old=read<{years:Year[]}>(`raw/edinet/issuers/${predecessor.id}.json`);
  const older=(old?.years??[]).filter(y=>y.end<=predecessor.through).map(y=>({...y,provenance:Object.fromEntries(Object.entries(y.provenance??{}).map(([field,p])=>[field,{...p,inputs:[...(p.inputs??[]),`Predecessor ${predecessor.id}; 1:1 holding-company transfer: ${predecessor.source}`,predecessor.quote]}]))}));
  result=fillYears(result,translate(older));
 }
 return deriveYears(withReportedFacts(company.id,fillYears(restoreReportedPeriods(company.id,result),[]))).map(y=>{
  const event=issuerCapitalChanges[company.id]?.find(e=>e.fy===y.fy&&e.cancelledCommon);
  return event?{...y,commonCapitalCancelled:true,provenance:{...y.provenance,commonCapitalCancelled:{source:event.source,field:'common shares cancelled',method:'reported' as const,inputs:[event.quote]}}}:y;
 });
}
