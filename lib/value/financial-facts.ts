import type { Year } from './types';

export const FINANCIAL_FIELDS = ['commonNetIncome','preferredEquity','commonDividendsPaid','deposits','loans','creditLossProvision','nonInterestExpense','netRevenue','efficiencyRatio','combinedRatio','insuranceFloat','insuranceReserves','adverseReserveDevelopment','restated'] as const;
export function financialFields(year:Year):Partial<Year> {
 return Object.fromEntries(FINANCIAL_FIELDS.filter(k=>year[k]!=null).map(k=>[k,year[k]]));
}
interface Fact {start?:string;end:string;val:number;filed:string;form:string}
export interface CompanyFacts {facts:Record<string,Record<string,{units:Record<string,Fact[]>}>>}
const fields:Partial<Record<keyof Year,string[]>>={
 equity:['StockholdersEquity'],
 goodwill:['Goodwill'],
 intangibles:['IntangibleAssetsNetExcludingGoodwill'],
 commonNetIncome:['NetIncomeLossAvailableToCommonStockholdersBasic'],
 preferredEquity:['PreferredStockIncludingAdditionalPaidInCapitalNetOfDiscount','PreferredStockValue','PreferredStockValueOutstanding'],
 commonDividendsPaid:['PaymentsOfDividendsCommonStock'],
 deposits:['Deposits'], loans:['LoansAndLeasesReceivableNetReportedAmount','LoansAndLeasesReceivableNetOfDeferredIncome'],
 creditLossProvision:['ProvisionForLoanLeaseAndOtherLosses','ProvisionForLoanAndLeaseLosses'],
 nonInterestExpense:['NoninterestExpense'],
 insuranceReserves:['LiabilityForUnpaidClaimsAndClaimsAdjustmentExpense'],
 adverseReserveDevelopment:['LiabilityForUnpaidClaimsAndClaimsAdjustmentExpenseIncurredClaimsPriorYears','IncreaseDecreaseInLiabilityForUnpaidClaimsAndClaimsAdjustmentExpenseIncurredClaimsPriorYears'],
};
const instant=new Set(['equity','goodwill','intangibles','preferredEquity','deposits','loans','insuranceReserves']);
/** Exact period, currency and annual duration; no quarterly duplication or future filings.
 * Later amended values are not evidence of an accounting restatement by themselves.
 */
export function supplementFinancialFacts(years:Year[],facts:CompanyFacts,cutoff='9999-12-31'):Year[] {
 return years.map(y=>{
  const value=(tags:string[],isInstant=false):number|null=>{
   for(const tag of tags){
    if (!y.currency) return null;
    const rows=facts.facts['us-gaap']?.[tag]?.units[y.currency]??[];
    const valid=rows.filter(f=>f.end===y.end&&f.filed<cutoff&&/^(10-K|20-F|40-F)(\/A)?$/.test(f.form)&&Number.isFinite(f.val)
     &&(isInstant?!f.start:!!f.start&&(Date.parse(f.end)-Date.parse(f.start))/86400000>=330&&(Date.parse(f.end)-Date.parse(f.start))/86400000<=380));
    valid.sort((a,b)=>b.filed.localeCompare(a.filed));if(valid.length)return valid[0].val;
   }return null;
  };
  const next={...y};
  for(const [key,tags] of Object.entries(fields)){
   const v=value(tags,instant.has(key));if(v!==null)(next as unknown as Record<string,unknown>)[key]=v;
  }
  const interest=value(['InterestIncomeExpenseNet']),other=value(['NoninterestIncome']);
  if(interest!==null&&other!==null)next.netRevenue=interest+other;
  return next;
 });
}

/** Same country/industry/fiscal-year peers, excluding the issuer; at least five.
 * No cross-country accounting or retail/investment-bank pooling.
 */
export function withFinancialPeers<T extends {company:{id:string;country:string;industry:string|null};years:Year[]}>(rows:T[]):T[] {
 const groups=new Map<string,Array<{id:string;rate:number}>>();
 const key=(r:T,y:Year)=>`${r.company.country}|${r.company.industry}|${y.fy}`;
 for(const r of rows)for(const y of r.years)if(y.loans!=null&&y.loans>0&&y.creditLossProvision!=null){
  const k=key(r,y),g=groups.get(k)??[];g.push({id:r.company.id,rate:y.creditLossProvision/y.loans});groups.set(k,g);
 }
 return rows.map(r=>({...r,years:r.years.map(y=>{
  const peers=(groups.get(key(r,y))??[]).filter(p=>p.id!==r.company.id).map(p=>p.rate).sort((a,b)=>a-b);
  if(peers.length<5)return y;
  const mid=Math.floor(peers.length/2);return {...y,peerCreditLossRate:peers.length%2?peers[mid]:(peers[mid-1]+peers[mid])/2};
 })}));
}

/** Filing-date evidence for annual observations (including comparative years). */
export function financialFilingDates(facts:CompanyFacts):Record<string,string> {
 const dates:Record<string,string>={};
 for(const tag of ['NetIncomeLoss','NetIncomeLossAvailableToCommonStockholdersBasic','ProfitLoss'])
  for(const rows of Object.values(facts.facts['us-gaap']?.[tag]?.units??{}))for(const f of rows){
   const days=f.start?(Date.parse(f.end)-Date.parse(f.start))/86400000:0;
   if(days<330||days>380||!['10-K','20-F','40-F'].includes(f.form)||f.filed<=f.end)continue;
   if(!dates[f.end]||f.filed<dates[f.end])dates[f.end]=f.filed;
  }
 return dates;
}

/** SEC-only diagnostic input for a delisted issuer absent from the EODHD corpus. */
export function yearsFromFinancialFacts(facts:CompanyFacts,currency:string,cutoff:string):Year[] {
 const dates=financialFilingDates(facts);
 const tags:Record<string,string[]>={netIncome:['NetIncomeLoss','ProfitLoss'],equity:['StockholdersEquity'],goodwill:['Goodwill'],intangibles:['IntangibleAssetsNetExcludingGoodwill','FiniteLivedIntangibleAssetsNet'],dilutedShares:['WeightedAverageNumberOfDilutedSharesOutstanding'],dividendsPaid:['PaymentsOfDividends','PaymentsOfDividendsCommonStock'],buybacks:['PaymentsForRepurchaseOfCommonStock'],totalAssets:['Assets']};
 const instant=new Set(['equity','goodwill','intangibles','totalAssets']);
 const required='revenue grossProfit operatingIncome preTaxIncome taxExpense netIncome interestExpense da sbc nonRecurring ocf capex dividendsPaid buybacks issuance acquisitions receivables inventory payables cash totalDebt equity goodwill intangibles ppe totalAssets totalLiabilities currentAssets currentLiabilities dilutedShares marketCap'.split(' ');
 const years=Object.keys(dates).filter(end=>dates[end]<cutoff&&end<cutoff).sort().map(end=>{
  const y={...Object.fromEntries(required.map(k=>[k,null])),fy:Number(end.slice(0,4)),end,currency} as Year;
  for(const [key,names] of Object.entries(tags))for(const name of names){
   const unit=key==='dilutedShares'?'shares':currency;
   const rows=(facts.facts['us-gaap']?.[name]?.units[unit]??[]).filter(f=>f.end===end&&f.filed<cutoff&&/^(10-K|20-F|40-F)(\/A)?$/.test(f.form)&&Number.isFinite(f.val)&&
    (instant.has(key)?!f.start:!!f.start&&(Date.parse(f.end)-Date.parse(f.start))/86400000>=330&&(Date.parse(f.end)-Date.parse(f.start))/86400000<=380)).sort((a,b)=>b.filed.localeCompare(a.filed));
   if(rows.length){(y as unknown as Record<string,unknown>)[key]=rows[0].val;break;}
  }return y;
 });
 return supplementFinancialFacts(years,facts,cutoff);
}
