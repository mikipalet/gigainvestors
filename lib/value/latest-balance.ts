import {balanceInputs} from './valuation-inputs';
import transactions from './reviewed-perimeter-transactions.json';
import reviewed from './reviewed-interim-balances.json';
import {availableOn} from './quarterly-inputs';
import {sameCurrency} from './currency';
import type {Year} from './types';

export interface BalanceSheet {
 filingDateAssumed?:boolean;
 annualEarningsAdjustment?:number; earningsThrough?:string; assumption?:string;
 end:string; filed:string; currency:string; source:string; basis:'filed'|'pro-forma';
 values:Pick<Year,'cash'|'totalDebt'|'equity'|'goodwill'|'intangibles'|'totalAssets'|'minorityInterest'|'leaseLiabilities'|'sharesOutstanding'|'debtIncludesLeases'>;
}
const obj=(v:unknown):Record<string,any>=>v&&typeof v==='object'?v as Record<string,any>:{};
const num=(v:unknown):number|null=>v==null||v===''||typeof v==='boolean'||!Number.isFinite(Number(v))?null:Number(v);
const pick=(r:Record<string,any>,...keys:string[])=>keys.map(k=>num(r[k])).find(v=>v!==null)??null;
/** Instant facts remain separate from annual/TTM flows. Never splice old fields
 * into a newer statement; missing current values remain explicitly unknown. */
export function balanceSheets(raw:unknown):BalanceSheet[] {
 const data=obj(raw),bs=obj(obj(data.Financials).Balance_Sheet);
 return ['yearly','quarterly'].flatMap(frequency=>Object.entries(obj(bs[frequency])).flatMap(([end,v])=>{
  const r=obj(v);if(!/^\d{4}-\d{2}-\d{2}$/.test(end)||!Number.isFinite(Date.parse(end)))return [];
  if(!['absolute','1','units'].includes(String(r.units??r.unit??'absolute').toLowerCase()))return [];
  const mapped=balanceInputs(r,false);
  const debt=pick(r,'shortLongTermDebtTotal');
  const filingDateAssumed=typeof r.filing_date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.filing_date)||!Number.isFinite(Date.parse(r.filing_date))||r.filing_date<=end;
  return [{end,filed:availableOn(end,r.filing_date),filingDateAssumed,currency:String(r.currency_symbol??obj(data.General).CurrencyCode??''),source:`EODHD ${frequency} balance sheet`,basis:'filed' as const,values:{
   cash:mapped.cash,totalDebt:mapped.totalDebt,
   debtIncludesLeases:debt!==null||pick(r,'capitalLeaseObligations')!==null,
   equity:pick(r,'totalStockholderEquity'),goodwill:pick(r,'goodWill'),intangibles:pick(r,'intangibleAssets'),
   totalAssets:pick(r,'totalAssets'),minorityInterest:pick(r,'noncontrollingInterestInConsolidatedEntity','minorityInterest'),
   leaseLiabilities:pick(r,'capitalLeaseObligations','leaseLiabilities'),sharesOutstanding:pick(r,'commonStockSharesOutstanding'),
  }}];
 }));
}
export function latestBalanceAt(rows:BalanceSheet[],cutoff:string,currency:string,annual:Year):BalanceSheet|null {
 return rows.filter(r=>r.end>annual.end&&r.end<cutoff&&r.filed<cutoff&&r.filed>=r.end&&!!r.currency&&sameCurrency(r.currency,currency))
  .sort((a,b)=>a.end.localeCompare(b.end)||a.filed.localeCompare(b.filed)).at(-1)??null;
}

/** Reviewed native interim/pro-forma statements can supplement a vendor gap.
 * They pass the same filing-date and currency selection as ordinary statements. */
export function reviewedBalanceSheets(id:string):BalanceSheet[] {
 return ((reviewed as Record<string,unknown>)[id]??[]) as BalanceSheet[];
}

/** Explicit reviewed closing deltas, never amounts invented by a reading. A
 * later filed period supersedes the pro-forma row through normal date selection. */
export function balanceSheetsFor(id:string,raw:unknown):BalanceSheet[] {
 const rows=[...balanceSheets(raw).map(row=>({...row,source:`https://eodhd.com/api/fundamentals/${id}#Financials.Balance_Sheet.${row.source.includes('quarterly')?'quarterly':'yearly'}.${row.end}`})),...reviewedBalanceSheets(id)];
 for(const t of (transactions as Record<string,Array<{baseEnd:string;closed:string;filed:string;currency:string;source:string;cashChange:number;debtChange:number;assetsChange:number;annualEarningsAdjustment:number;assumption:string}>>)[id]??[]){
  const base=rows.filter(r=>r.end===t.baseEnd&&r.currency===t.currency).sort((a,b)=>a.filed.localeCompare(b.filed)).at(-1);
  if(!base||base.values.cash===null||base.values.totalDebt===null)continue;
  rows.push({...base,end:t.closed,filed:[base.filed,t.filed].sort().at(-1)!,source:t.source,basis:'pro-forma',assumption:t.assumption,annualEarningsAdjustment:t.annualEarningsAdjustment,earningsThrough:t.baseEnd,values:{...base.values,cash:base.values.cash+t.cashChange,totalDebt:base.values.totalDebt+t.debtChange,totalAssets:base.values.totalAssets===null?null:base.values.totalAssets+t.assetsChange,goodwill:null,intangibles:null}});
 }
 return rows;
}
