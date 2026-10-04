import {parentShare} from './parent-share';
import {sameCurrency} from './currency';
import {availableOn,halfYearReporter} from './quarterly-inputs';
import type {Kind,TestKey,Year} from './types';

export type ProvisionalYear={end:string;fy:number;label:string;filed:string;periods:string[]};
export type QualityQuarter={year:Year;filed:string;currency:string;units:string;source:string};
const record=(v:unknown):Record<string,any>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,any>:{};
const num=(v:unknown):number|null=>v==null||v===''||typeof v==='boolean'||!Number.isFinite(Number(v))?null:Number(v);
const flows:Record<string,[string,string[]]>={
 revenue:['Income_Statement',['totalRevenue']],grossProfit:['Income_Statement',['grossProfit']],operatingIncome:['Income_Statement',['operatingIncome','ebit']],
 preTaxIncome:['Income_Statement',['incomeBeforeTax']],taxExpense:['Income_Statement',['incomeTaxExpense']],netIncome:['Income_Statement',['netIncome']],
 totalNetIncome:['Income_Statement',['netIncomeIncludingNoncontrollingInterests']],commonNetIncome:['Income_Statement',['netIncomeApplicableToCommonShares']],
 interestExpense:['Income_Statement',['interestExpense']],nonRecurring:['Income_Statement',['nonRecurring','restructuringCharges','restructuringExpense']],
 da:['Cash_Flow',['depreciationAndAmortization','depreciation']],ocf:['Cash_Flow',['totalCashFromOperatingActivities']],
 capex:['Cash_Flow',['capitalExpenditures']],sbc:['Cash_Flow',['stockBasedCompensation','shareBasedCompensation']],
 dividendsPaid:['Cash_Flow',['dividendsPaid']],commonDividendsPaid:['Cash_Flow',['commonDividendsPaid']],buybacks:['Cash_Flow',['repurchaseOfCapitalStock','paymentsForRepurchaseOfCommonStock']],
 issuance:['Cash_Flow',['issuanceOfCapitalStock']],acquisitions:['Cash_Flow',['acquisitionsNet','paymentsToAcquireBusinessesNetOfCashAcquired']],leaseCash:['Cash_Flow',['leasePayments']],
 creditLossProvision:['Income_Statement',['provisionForLoanLosses','provisionForCreditLosses']],nonInterestExpense:['Income_Statement',['nonInterestExpense']],netRevenue:['Income_Statement',['netRevenue']],
 adverseReserveDevelopment:['Income_Statement',['adverseReserveDevelopment']],
};
const stocks:Record<string,string[]>={equity:['totalStockholderEquity'],preferredEquity:['preferredStockTotalEquity'],goodwill:['goodWill'],intangibles:['intangibleAssets'],
 totalAssets:['totalAssets'],totalLiabilities:['totalLiab'],currentAssets:['totalCurrentAssets'],currentLiabilities:['totalCurrentLiabilities'],
 totalDebt:['shortLongTermDebtTotal'],shortTermDebt:['shortTermDebt','shortLongTermDebt'],cash:['cashAndShortTermInvestments'],
 receivables:['netReceivables'],inventory:['inventory'],payables:['accountsPayable'],ppe:['propertyPlantAndEquipmentNet'],
 minorityInterest:['noncontrollingInterestInConsolidatedEntity','minorityInterest'],leaseLiabilities:['capitalLeaseObligations','leaseLiabilities'],
 loans:['netLoans','loans','loansNet'],deposits:['totalDeposits','deposits'],insuranceFloat:['insuranceFloat'],insuranceReserves:['insuranceReserves'],
 retainedEarnings:['retainedEarnings'],sharesOutstanding:['commonStockSharesOutstanding']};
const absolute=new Set(['capex','dividendsPaid','commonDividendsPaid','buybacks','acquisitions','leaseCash']);
const pick=(row:Record<string,any>,keys:string[])=>keys.map(k=>num(row[k])).find(n=>n!==null)??null;
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const close=(a:number,b:number,tolerance=.02)=>Math.abs(a-b)<=Math.max(1,Math.abs(a),Math.abs(b))*tolerance;

/** EODHD statement amounts are absolute currency units. Explicit conflicting
 * units/currencies are rejected, and the sums must independently reconcile to
 * an audited annual row before these observations can enter quality tests. */
export function qualityQuarters(raw:unknown):QualityQuarter[]{
 const financials=record(record(raw).Financials);
 if(halfYearReporter(financials))return [];
 const statements=Object.fromEntries(['Income_Statement','Balance_Sheet','Cash_Flow'].map(k=>[k,record(record(financials[k]).quarterly)]));
 return Object.keys(statements.Income_Statement).filter(e=>/^\d{4}-\d{2}-\d{2}$/.test(e)&&Number.isFinite(Date.parse(e))).sort().flatMap(end=>{
  const rows=Object.fromEntries(Object.entries(statements).map(([k,v])=>[k,record(v[end])]));
  const income=rows.Income_Statement,balance=rows.Balance_Sheet,cash=rows.Cash_Flow;
  if(!Object.keys(balance).length)return [];
  const currency=String(income.currency_symbol??'');
  if(!currency||Object.values(rows).some(r=>Object.keys(r).length&&(!r.currency_symbol||!sameCurrency(r.currency_symbol,currency))))return [];
  const units=String(income.units??income.unit??'absolute');
  if(!['absolute','1','units'].includes(units.toLowerCase())||Object.values(rows).some(r=>String(r.units??r.unit??units)!==units))return [];
  if(Object.values(rows).some(r=>r.periodType&& !/^(quarter|quarterly|3m)$/i.test(r.periodType)))return [];
  const values:Record<string,number|null>={};
  for(const [key,[statement,tags]] of Object.entries(flows)){const n=pick(rows[statement],tags);values[key]=n!==null&&absolute.has(key)?Math.abs(n):n;}
  for(const [key,tags] of Object.entries(stocks))values[key]=pick(balance,tags);
  values.da??=pick(income,['depreciationAndAmortization','reconciledDepreciation']);
  // No absent-component zero defaults: only an explicit cash total or both components.
  if(values.cash===null){const c=pick(balance,['cash','cashAndEquivalents']),s=pick(balance,['shortTermInvestments']);if(c!==null&&s!==null)values.cash=c+s;}
  if(values.totalDebt===null){const a=pick(balance,['longTermDebtTotal','longTermDebt']),b=values.shortTermDebt;if(a!==null&&b!==null)values.totalDebt=a+b;}
  values.dilutedShares=pick(income,['weightedAverageShsOutDil','dilutedAverageShares']);
  if(values.dilutedShares===null){const eps=pick(income,['dilutedEPS','dilutedEps']);if(eps&&values.netIncome!==null&&values.netIncome/eps>0)values.dilutedShares=values.netIncome/eps;}
  // Dated fiscal-end shares are the provider's existing annual fallback too;
  // reconcile the four-quarter average against the annual denominator below.
  values.dilutedShares??=values.sharesOutstanding;
  const filed=Object.values(rows).filter(r=>Object.keys(r).length).map(r=>availableOn(end,r.filing_date)).sort().at(-1)!;
  const year={...values,...(typeof income.restated==='boolean'?{restated:income.restated}:{}),fy:Number(end.slice(0,4)),end,currency,marketCap:null,debtIncludesLeases:pick(balance,['shortLongTermDebtTotal'])!==null,provenance:Object.fromEntries(Object.keys(values).filter(k=>values[k]!==null).map(k=>[k,{source:'EODHD quarterly',field:k,method:'reported'}]))} as Year;
  return [{year,filed,currency,units,source:'EODHD'}];
 });
}
const consecutive=(qs:QualityQuarter[])=>qs.length===4&&qs.every((q,i)=>!i||Math.abs((Date.parse(q.year.end)-Date.parse(qs[i-1].year.end))/86400000-91.3125)<20);
function aggregate(qs:QualityQuarter[],fy:number):Year {
 const end=qs.at(-1)!,year={...end.year,fy,provenance:{}};
 for(const key of Object.keys(flows)){
  const values=qs.map(q=>(q.year as any)[key]);
  (year as any)[key]=values.every(finite)?values.reduce((a,b)=>a+b,0):null;
 }
 year.dilutedShares=qs.every(q=>finite(q.year.dilutedShares))?qs.reduce((a,q)=>a+q.year.dilutedShares!,0)/4:null;
 year.restated=qs.some(q=>q.year.restated===true)?true:qs.every(q=>q.year.restated===false)?false:undefined;
 // Prevent deriveYears from fabricating absent quarterly lines/proxies.
 year.provisional={end:year.end,fy,label:`LTM to ${new Date(year.end+'T00:00:00Z').toLocaleDateString('en-GB',{month:'short',year:'numeric',timeZone:'UTC'})}`,filed:qs.map(q=>q.filed).sort().at(-1)!,periods:qs.map(q=>q.year.end)};
 return year;
}

export function qualityLtmAt(quarters:QualityQuarter[],annuals:Year[],cutoff:string,splits:Array<{date:string;factor:number}>=[]):Year|null {
 const annual=annuals.at(-1);if(!annual||!annual.currency)return null;
 const eligible=quarters.filter(q=>q.filed<cutoff&&q.year.end<cutoff&&sameCurrency(q.currency,annual.currency!)).sort((a,b)=>a.year.end.localeCompare(b.year.end)).map(q=>({...q,year:{...q.year}}));
 // Convert only a split-sized discontinuity corroborated by a dated action.
 // Already-restated comparative shares must not be adjusted twice. Include
 // fractional actions (e.g. 11-for-10), not just conspicuous 2:1/10:1 splits.
 const actions=splits.filter(s=>eligible.length&&s.date>eligible[0].year.end&&s.date<=eligible.at(-1)!.year.end&&s.date<cutoff&&finite(s.factor)&&s.factor>0&&Math.abs(s.factor-1)>.001);
 let factor=1;
 const originalShares=eligible.map(q=>q.year.dilutedShares);
 for(let i=actions.length?eligible.length-1:-1;i>=0;i--){
  const shares=eligible[i].year.dilutedShares;
  if(i<eligible.length-1&&shares&&eligible[i+1].year.dilutedShares){
   const after=originalShares[i+1];
   const action=actions.find(s=>s.date>eligible[i].year.end&&s.date<=eligible[i+1].year.end
    &&after&&close(after/shares,s.factor,.02)&&!close(after/shares,1,.02));
   if(action)factor*=action.factor;
  }
  if(shares)eligible[i].year.dilutedShares=shares*factor;
 }
 const qs=eligible.slice(-4);if(!consecutive(qs)||qs.at(-1)!.year.end<=annual.end)return null;
 // Require the most recent annual to be reproducible. This catches YTD flows,
 // fabricated half-year fillers, scaled values and incompatible share bases.
 const anchor=eligible.filter(q=>q.year.end<=annual.end).slice(-4);
 if(!consecutive(anchor)||anchor.at(-1)!.year.end.slice(0,7)!==annual.end.slice(0,7))return null;
 const checked=aggregate(anchor,annual.fy),year=aggregate(qs,annual.fy+1);
 if(!['revenue','netIncome'].every(k=>finite((checked as any)[k])&&finite((annual as any)[k])&&close((checked as any)[k],(annual as any)[k])))return null;
 if(!finite(checked.dilutedShares)||!finite(annual.dilutedShares)||!close(checked.dilutedShares,annual.dilutedShares))return null;
 // An unresolved split or unit jump must never look like dilution/profit growth.
 if(!qs.every(q=>finite(q.year.dilutedShares)&&q.year.dilutedShares!>0&&Math.max(q.year.dilutedShares!/annual.dilutedShares!,annual.dilutedShares!/q.year.dilutedShares!)<1.5))return null;
 for(const key of [...Object.keys(flows),...Object.keys(stocks)]){
  const a=(annual as any)[key],b=(checked as any)[key];
  if(finite(a)&&(!finite(b)||!close(a,b)))(year as any)[key]=null;
 }
 // A quarterly datum absent in annual data is allowed only on the same
 // verified currency/unit basis. No latest-annual value is carried forward.
 return year;
}

/** Quarter-by-quarter candidates since the last annual. Reconstructing this
 * sequence makes confirmation deterministic for both current and as-of runs. */
export function qualityLtmHistoryAt(quarters:QualityQuarter[],annuals:Year[],cutoff:string,splits:Array<{date:string;factor:number}>=[],latest?:Year|null):Year[]{
 const annual=annuals.at(-1);if(!annual)return [];
 const ends=[...new Set(quarters.filter(q=>q.year.end>annual.end&&q.year.end<cutoff&&q.filed<cutoff).map(q=>q.year.end))].sort();
 return ends.flatMap(end=>{
  const year=latest?.end===end?latest:qualityLtmAt(quarters.filter(q=>q.year.end<=end),annuals,cutoff,splits);
  return year?.end===end?[year]:[];
 });
}

const operating:Record<string,string[]>={
 understandable:['revenue','operatingIncome','netIncome'],
 moat:['revenue','grossProfit','operatingIncome','preTaxIncome','taxExpense','equity','totalDebt','cash','goodwill','capex'],
 economics:['netIncome','revenue','operatingIncome','preTaxIncome','taxExpense','da','capex','sbc','ocf','receivables','inventory','payables','equity','totalDebt','cash','goodwill','ppe'],
 management:['netIncome','dilutedShares','dividendsPaid','buybacks','acquisitions','marketCap','operatingIncome','preTaxIncome','taxExpense','equity','totalDebt','cash','goodwill'],
 accounting:['netIncome','ocf','totalAssets','receivables','revenue','nonRecurring','sbc','goodwill','intangibles','equity'],
};
const financial:Record<string,string[]>={
 understandable:['netIncome','equity','dilutedShares'],moat:['netIncome','equity','goodwill','intangibles','dilutedShares'],
 economics:['equity','goodwill','intangibles','dilutedShares','dividendsPaid'],management:['netIncome','equity','goodwill','intangibles','dilutedShares','dividendsPaid','buybacks'],
 accounting:['equity','goodwill','intangibles','dilutedShares'],
};
const operatingOptional:Record<string,string[]>={moat:['leaseLiabilities'],economics:['leaseCash','minorityInterest','totalNetIncome'],management:['leaseLiabilities']};
const financialOptional:Record<string,string[]>={understandable:['commonNetIncome','preferredEquity'],moat:['combinedRatio','insuranceFloat','nonInterestExpense','netRevenue','preferredEquity','commonNetIncome'],economics:['preferredEquity','commonDividendsPaid'],management:['preferredEquity','commonNetIncome','commonDividendsPaid'],accounting:['loans','deposits','creditLossProvision','peerCreditLossRate','adverseReserveDevelopment','insuranceReserves','preferredEquity']};
/** An entire test stays annual if even one of its observed input lines is absent. */
export function qualityYears(years:Year[],ltm:Year|null|undefined,key:TestKey,kind:Kind):Year[]{
 if(!ltm?.provisional||!years.length||ltm.end<=years.at(-1)!.end)return years;
 const fin=kind==='bank'||kind==='insurer',optional=fin?financialOptional:operatingOptional;
 const required=[...(fin?financial:operating)[key]??[],...(optional[key]??[]).filter(k=>years.slice(-10).some(y=>(y as any)[k]!=null))];
 if(!fin&&key==='economics'&&years.some(y=>y.leaseDepreciationIncluded&&(y.leaseLiabilities??0)>0))required.push('leaseCash');
 if(fin&&key==='accounting'&&years.some(y=>y.restated!==undefined)&&ltm.restated===undefined)return years;
 if(required.some(k=>!finite((ltm as any)[k])))return years;
 if(!fin&&key==='economics'){
  const five=[...years.slice(-4),ltm];
  if(five.some(y=>parentShare(y)===null)&&five.some(y=>!finite(y.totalNetIncome)))return years;
 }
 return [...years,{...ltm,fy:years.at(-1)!.fy+1,provisional:{...ltm.provisional,fy:years.at(-1)!.fy+1}}];
}
