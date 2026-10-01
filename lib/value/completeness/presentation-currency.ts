import type {Year} from '../types';
export interface CurrencyTranslation {from:string;to:string;end:string;average:number;closing:number;source:string}
const stocks=new Set('minorityInterest investmentNav receivables clientAssets preferredEquity deposits insuranceFloat insuranceReserves loans inventory payables cash cashAndDeposits cashAndCashEquivalents shortTermInvestments totalDebt shortTermDebt equity netAssets subscriptionRights goodwill intangibles ppe totalAssets totalLiabilities liabilitiesAndStockholdersEquity currentAssets currentLiabilities retainedEarnings leaseLiabilities marketCap navPerShare'.split(' '));
const flows=new Set('revenue grossProfit costOfSales operatingIncome operatingExpenses preTaxIncome taxExpense netIncome totalNetIncome commonNetIncome interestExpense da sbc nonRecurring ocf capex dividendsPaid commonDividendsPaid dividendsPerShare buybacks issuance acquisitions leaseCash fairValueGains totalIncome retainedEarningsChange retainedEarningsOther creditLossProvision nonInterestExpense netRevenue adverseReserveDevelopment dilutedEps basicEps averageSharePrice'.split(' '));
/** Translate a genuine presentation-currency change using dated FX observations:
 * annual-average rates for flows and year-end rates for stocks. Shares and
 * ratios are unchanged. Never use this to repair a vendor's incorrect label. */
export function translatePresentationCurrency(years:Year[],rates:CurrencyTranslation[]):Year[]{
 return years.map(y=>{
  const rate=rates.find(r=>r.end===y.end&&r.from===y.currency);if(!rate)return y;
  if(!/^https:\/\//.test(rate.source)||![rate.average,rate.closing].every(n=>Number.isFinite(n)&&n>0))throw Error('Currency translation requires positive dated source rates');
  const result={...y,currency:rate.to,provenance:{...y.provenance}};
  for(const field of [...stocks,...flows]){
   const value=y[field as keyof Year];if(typeof value!=='number'||!Number.isFinite(value))continue;
   const factor=stocks.has(field)?rate.closing:rate.average;
   Object.assign(result,{[field]:value*factor});
   result.provenance[field]={source:rate.source,field,method:'derived',inputs:[`Original ${rate.from} amount: ${value}`,`Original statement: ${y.provenance?.[field]?.source??'annual source statement'}`,`${stocks.has(field)?'Fiscal-end':'Annual-average'} ${rate.from}/${rate.to}: ${factor}`]};
  }
  result.provenance.currency={source:rate.source,field:'presentation currency',method:'derived',inputs:[`${y.currency} to ${rate.to}; flows at annual-average rates, balances at fiscal-end rates`]};
  return result;
 });
}
