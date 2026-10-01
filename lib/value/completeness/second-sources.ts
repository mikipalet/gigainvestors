import { deriveYears } from '../derive';
import type { Year } from '../types';

export const FIELD_TAGS: Record<string,string[]> = {
 revenue:['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet','Revenue'],
 costOfSales:['CostOfRevenue','CostOfGoodsAndServicesSold','CostOfSales'],grossProfit:['GrossProfit'],
 operatingIncome:['OperatingIncomeLoss','ProfitLossFromOperatingActivities'], operatingExpenses:['OperatingExpenses'],
 netIncome:['NetIncomeLoss','ProfitLossAttributableToOwnersOfParent','ProfitLoss'],preTaxIncome:['IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest','ProfitLossBeforeTax'],taxExpense:['IncomeTaxExpenseBenefit','IncomeTaxExpenseContinuingOperations'],
 da:['DepreciationDepletionAndAmortization','DepreciationDepletionAndAmortizationPropertyPlantAndEquipment','DepreciationAmortizationAndAccretionNet','AdjustmentsForDepreciationAndAmortisationExpense'],
 sbc:['ShareBasedCompensation','AdjustmentsForSharebasedPayments','SharebasedPaymentExpense'],
 nonRecurring:['RestructuringAndRelatedCostIncurredCost','RestructuringCharges','RestructuringExpense'],
 ocf:['NetCashProvidedByUsedInOperatingActivities','CashFlowsFromUsedInOperatingActivities'],
 capex:['PaymentsToAcquirePropertyPlantAndEquipment','PurchaseOfPropertyPlantAndEquipment'],
 dividendsPaid:['PaymentsOfDividends','PaymentsOfDividendsCommonStock','DividendsPaid'],buybacks:['PaymentsForRepurchaseOfCommonStock','PaymentsForRepurchaseOfEquity','PurchaseOfTreasuryShares'],issuance:['ProceedsFromStockOptionsExercised','ProceedsFromIssuanceOfCommonStock'],
 acquisitions:['PaymentsToAcquireBusinessesNetOfCashAcquired','PurchaseOfSubsidiariesNetOfCashAcquired'],
 receivables:['AccountsReceivableNetCurrent','TradeAndOtherCurrentReceivables'],inventory:['InventoryNet','Inventories'],payables:['AccountsPayableCurrent','TradeAndOtherCurrentPayables'],
 cash:['CashAndCashEquivalentsAtCarryingValue','CashAndCashEquivalents'],shortTermInvestments:['ShortTermInvestments'],
 minorityInterest:['MinorityInterest','NoncontrollingInterests'],liabilitiesAndStockholdersEquity:['LiabilitiesAndStockholdersEquity','EquityAndLiabilities'],
 equity:['StockholdersEquity','EquityAttributableToOwnersOfParent','Equity'],totalAssets:['Assets'],totalLiabilities:['Liabilities'],currentAssets:['AssetsCurrent','CurrentAssets'],currentLiabilities:['LiabilitiesCurrent','CurrentLiabilities'],
 totalDebt:['LongTermDebtAndCapitalLeaseObligationsIncludingCurrentMaturities','LongTermDebtCurrentAndNoncurrent','Borrowings'],shortTermDebt:['ShortTermBorrowings','ShortTermDebtCurrent','CurrentBorrowings'],
 goodwill:['Goodwill'],intangibles:['FiniteLivedIntangibleAssetsNet','IntangibleAssetsOtherThanGoodwill'],ppe:['PropertyPlantAndEquipmentNet','PropertyPlantAndEquipment'],
 retainedEarnings:['RetainedEarningsAccumulatedDeficit','RetainedEarnings'],dilutedShares:['WeightedAverageNumberOfDilutedSharesOutstanding','AdjustedWeightedAverageShares'],dilutedEps:['EarningsPerShareDiluted','DilutedEarningsLossPerShare'],basicEps:['EarningsPerShareBasic','BasicEarningsLossPerShare'],
 interestExpense:['InterestExpense','InterestAndDebtExpense'],leaseLiabilities:['OperatingLeaseLiability','LeaseLiabilities'],
};
const INSTANT = new Set('minorityInterest liabilitiesAndStockholdersEquity receivables inventory payables cash shortTermInvestments equity totalAssets totalLiabilities currentAssets currentLiabilities totalDebt shortTermDebt goodwill intangibles ppe retainedEarnings leaseLiabilities'.split(' '));
const SPENT = new Set('capex dividendsPaid buybacks acquisitions'.split(' '));
export function emptyYear(end:string,currency:string):Year {
 return { ...Object.fromEntries([...Object.keys(FIELD_TAGS),'marketCap'].map(k=>[k,null])),fy:Number(end.slice(0,4)),end,currency } as unknown as Year;
}
type Fact = {val:number;start?:string;end:string;filed?:string;form?:string;accn?:string};
export type CompanyFacts = {facts:Record<string,Record<string,{units:Record<string,Fact[]>}>>};
/** Match annual duration and currency, never sum duplicate comparative or quarterly facts. */
export function yearsFromCompanyFacts(raw:CompanyFacts,currency:string,source:string):Year[] {
 const namespaces=Object.values(raw.facts??{}), byEnd=new Map<string,Year>();
 if(!currency){
  const units=namespaces.flatMap(ns=>[...FIELD_TAGS.netIncome,...FIELD_TAGS.revenue].flatMap(tag=>Object.entries(ns[tag]?.units??{}).filter(([u])=>/^[A-Z]{3}$/.test(u)).flatMap(([unit,fs])=>fs.filter(f=>f.start&&['10-K','10-K/A','20-F','20-F/A','40-F','40-F/A'].includes(f.form??'')).map(f=>({unit,end:f.end}))))).sort((a,b)=>b.end.localeCompare(a.end));
  currency=units[0]?.unit??'';
  if(!currency)return [];
 }
 const pick=(tags:string[],stock:boolean,unit:string)=>{
  const selected=new Map<string,{fact:Fact;tag:string}>();
  for(const tag of tags) for(const ns of namespaces) for(const f of ns[tag]?.units[unit]??[]) {
   if(!/^\d{4}-\d{2}-\d{2}$/.test(f.end)||!Number.isFinite(f.val)||!['10-K','10-K/A','20-F','20-F/A','40-F','40-F/A'].includes(f.form??''))continue;
   const days=f.start?(Date.parse(f.end)-Date.parse(f.start))/86400000:0;
   if(stock ? !!f.start : days<330||days>400)continue;
   const prior=selected.get(f.end);
   if(!prior || prior.tag===tag && (f.filed??'')>(prior.fact.filed??''))selected.set(f.end,{fact:f,tag});
  }
  return selected;
 };
 for(const [field,tags] of Object.entries(FIELD_TAGS)) {
  const unit=field==='dilutedShares'?'shares':/Eps$/.test(field)?`${currency}/shares`:currency;
  for(const [end,{fact,tag}] of pick(tags,INSTANT.has(field),unit)){
   const y=byEnd.get(end)??emptyYear(end,currency);byEnd.set(end,y);
   Object.assign(y,{[field]:SPENT.has(field)?Math.abs(fact.val):fact.val});
   y.provenance??={};y.provenance[field]={source:`${source}#${fact.accn??fact.filed??end}`,field:tag,method:'reported'};
  }
 }
 // Disjoint current/noncurrent debt components, including current maturities.
 const debtParts=['LongTermDebtNoncurrent','LongTermDebtCurrent','ShortTermBorrowings'];
 const components=debtParts.map((tag,i)=>pick(i===0?[tag,'LongTermDebt']: [tag],true,currency));
 const investing=pick(['NetCashProvidedByUsedInInvestingActivities','CashFlowsFromUsedInInvestingActivities'],false,currency);
 const financing=pick(['NetCashProvidedByUsedInFinancingActivities','CashFlowsFromUsedInFinancingActivities'],false,currency);
 const operatingLeases=['OperatingLeaseLiabilityCurrent','OperatingLeaseLiabilityNoncurrent'].map(tag=>pick([tag],true,currency));
 for(const y of byEnd.values()){
  if(y.totalDebt===null){const parts=components.map(m=>m.get(y.end)?.fact.val);if(parts.some(v=>v!==undefined)){
   y.totalDebt=parts.reduce<number>((s,n)=>s+(n??0),0);y.provenance!.totalDebt={source,field:'totalDebt',method:'derived',inputs:debtParts.filter((_,i)=>parts[i]!==undefined)};
  }}
  const current=components[1].get(y.end)?.fact.val, short=components[2].get(y.end)?.fact.val;
  if(current!==undefined||short!==undefined){y.shortTermDebt=(current??0)+(short??0);y.provenance!.shortTermDebt={source,field:'shortTermDebt',method:'derived',inputs:['LongTermDebtCurrent','ShortTermBorrowings']};}
  const aggregate=y.provenance?.totalDebt?.field;
  if(y.totalDebt!==null && short!==undefined && (aggregate==='LongTermDebtCurrentAndNoncurrent'||aggregate==='LongTermDebtAndCapitalLeaseObligationsIncludingCurrentMaturities')){
   y.totalDebt+=short;y.provenance!.totalDebt={source,field:'totalDebt',method:'derived',inputs:[aggregate,'ShortTermBorrowings']};
  }
  // US lease facts here are OPERATING leases; finance leases already included in debt do not overlap.
  y.debtIncludesLeases=false;
  if(y.leaseLiabilities==null){const parts=operatingLeases.map(m=>m.get(y.end)?.fact.val);if(parts.some(v=>v!==undefined)){
   y.leaseLiabilities=parts.reduce<number>((s,n)=>s+(n??0),0);y.provenance!.leaseLiabilities={source,field:'leaseLiabilities',method:'derived',inputs:['OperatingLeaseLiabilityCurrent','OperatingLeaseLiabilityNoncurrent']};
  }}
  y.statementCoverage={income:y.revenue!==null&&y.netIncome!==null&&(y.operatingIncome!==null||y.operatingExpenses!=null),balance:y.totalAssets!==null&&y.totalLiabilities!==null&&y.equity!==null,cashFlow:y.ocf!==null&&investing.has(y.end)&&financing.has(y.end)};
 }
 return deriveYears([...byEnd.values()].filter(y=>y.netIncome!==null||y.revenue!==null).sort((a,b)=>a.end.localeCompare(b.end)));
}

export const YAHOO_FIELDS:Record<string,string>={TotalRevenue:'revenue',CostOfRevenue:'costOfSales',GrossProfit:'grossProfit',OperatingIncome:'operatingIncome',OperatingExpense:'operatingExpenses',NetIncome:'netIncome',PretaxIncome:'preTaxIncome',TaxProvision:'taxExpense',DepreciationAndAmortization:'da',StockBasedCompensation:'sbc',OperatingCashFlow:'ocf',CapitalExpenditure:'capex',CashDividendsPaid:'dividendsPaid',RepurchaseOfCapitalStock:'buybacks',IssuanceOfCapitalStock:'issuance',NetBusinessPurchaseAndSale:'acquisitions',Receivables:'receivables',Inventory:'inventory',AccountsPayable:'payables',CashCashEquivalentsAndShortTermInvestments:'cash',TotalDebt:'totalDebt',CurrentDebt:'shortTermDebt',StockholdersEquity:'equity',MinorityInterest:'minorityInterest',Goodwill:'goodwill',OtherIntangibleAssets:'intangibles',NetPPE:'ppe',TotalAssets:'totalAssets',TotalLiabilitiesNetMinorityInterest:'totalLiabilities',CurrentAssets:'currentAssets',CurrentLiabilities:'currentLiabilities',DilutedAverageShares:'dilutedShares',DilutedEPS:'dilutedEps',RetainedEarnings:'retainedEarnings'};
export function yearsFromYahoo(raw:any,currency:string,source:string):Year[]{
 if(!currency){
  const candidates=(raw?.timeseries?.result??[]).flatMap((s:any)=>Object.entries(s).filter(([k])=>/^annual(?:TotalRevenue|NetIncome|OperatingCashFlow)$/.test(k)).flatMap(([,v])=>Array.isArray(v)?v:[])).filter((f:any)=>f.periodType==='12M'&&f.currencyCode).sort((a:any,b:any)=>b.asOfDate.localeCompare(a.asOfDate));
  currency=candidates[0]?.currencyCode??'';
  if(!currency)return [];
 }
 const years=new Map<string,Year>();
 for(const series of raw?.timeseries?.result??[])for(const [tag,field]of Object.entries(YAHOO_FIELDS))for(const f of series[`annual${tag}`]??[]){
  if(f.periodType!=='12M'||f.currencyCode&&f.currencyCode!==currency||!Number.isFinite(f.reportedValue?.raw))continue;
  const y=years.get(f.asOfDate)??emptyYear(f.asOfDate,currency);years.set(y.end,y);
  const n=f.reportedValue.raw;Object.assign(y,{[field]:tag==='NetBusinessPurchaseAndSale'?Math.max(0,-n):SPENT.has(field)?Math.abs(n):n});y.provenance??={};y.provenance[field]={source:source.split('?')[0],field:`annual${tag}`,method:tag==='NetBusinessPurchaseAndSale'?'derived':'reported',...(tag==='NetBusinessPurchaseAndSale'?{inputs:[`net business purchase/sale cash flow: ${n}`]}:{})};
 }
 return deriveYears([...years.values()].sort((a,b)=>a.end.localeCompare(b.end)));
}
/** Match date/currency; explicit facts outrank absence zeroes and fallback estimates. */
export function fillYears(primary:Year[],secondary:Year[]):Year[]{
 const byEnd=new Map<string,Year>(primary.map(y=>[y.end,{...y,provenance:{...y.provenance}}]));
 const currency=primary.at(-1)?.currency;
 for(const s of secondary){
  if(currency&&s.currency&&currency!==s.currency)continue;
  const p=byEnd.get(s.end);
  if(!p){if(![...byEnd.values()].some(y=>y.fy===s.fy))byEnd.set(s.end,s);continue;}
  const discrepancy=(y:Year)=>{
   if(y.totalAssets==null||y.totalAssets<=0||y.totalLiabilities==null||y.equity==null)return null;
   const totals=[y.totalLiabilities+y.equity+(y.minorityInterest??0),...(y.liabilitiesAndStockholdersEquity!=null?[y.liabilitiesAndStockholdersEquity]:[])];
   return Math.max(...totals.map(total=>Math.abs(y.totalAssets!-total)/y.totalAssets!));
  };
  const priorDifference=discrepancy(p),incomingDifference=discrepancy(s);
  const balanceFields=['totalAssets','totalLiabilities','equity','minorityInterest','liabilitiesAndStockholdersEquity'] as const;
  const rejectInconsistentBalance=priorDifference!==null&&priorDifference<.01&&incomingDifference!==null&&incomingDifference>.1;
  // Replace a demonstrably inconsistent balance as one coherent group; never invent a residual.
  if(priorDifference!==null&&priorDifference>.1&&incomingDifference!==null&&incomingDifference<.01&&['totalAssets','totalLiabilities','equity'].every(key=>s.provenance?.[key]?.method==='reported')){
   for(const key of balanceFields){
    p[key]=s[key]??null;
    if(s.provenance?.[key])p.provenance![key]=s.provenance[key];else delete p.provenance![key];
   }
  }
  for(const [key,value]of Object.entries(s)){
   if(rejectInconsistentBalance&&(balanceFields as readonly string[]).includes(key))continue;
   const prior=p.provenance?.[key], incoming=s.provenance?.[key];
   const fallback=prior?.method==='absent-in-complete-statement'||prior?.method==='estimate'||key==='acquisitions'&&p.acquisitionsProxy;
   const explicit=incoming&&(incoming.method==='reported'||incoming.method==='derived'&&incoming.source!=='statements');
   const filingCorrection=prior?.method==='cached'&&incoming?.method==='reported'&&/disclosure2\.edinet|filings\.xbrl\.org|data\.sec\.gov/.test(incoming.source);
   if(value!=null&&(p[key as keyof Year]==null||fallback&&explicit||filingCorrection)){
    Object.assign(p,{[key]:value});if(incoming)p.provenance![key]=incoming;
    if(key==='acquisitions')p.acquisitionsProxy=Boolean(s.acquisitionsProxy);
    if(key==='totalDebt'&&typeof s.debtIncludesLeases==='boolean')p.debtIncludesLeases=s.debtIncludesLeases;
   }
  }
  p.statementCoverage={...p.statementCoverage,...Object.fromEntries(Object.entries(s.statementCoverage??{}).filter(([,v])=>v))};
  for(const [key,provenance]of Object.entries(s.provenance??{}))if(!p.provenance?.[key]&&p[key as keyof Year]===s[key as keyof Year]){p.provenance??={};p.provenance[key]=provenance;}
 }
 return deriveYears([...byEnd.values()].sort((a,b)=>a.end.localeCompare(b.end)));
}
