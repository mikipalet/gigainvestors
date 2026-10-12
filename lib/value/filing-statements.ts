import reviewed from './reviewed-filing-statements.json';
import {deriveYears} from './derive';
import {yearsFromCompanyFacts,type CompanyFacts} from './completeness/second-sources';
import type {Company,Year} from './types';

/** IFRS concepts the general SEC mapping does not read. */
const IFRS_TAGS:Record<string,string[]>={
 receivables:['CurrentTradeReceivables','TradeReceivables'],payables:['TradeAndOtherCurrentPayablesToTradeSuppliers','CurrentTradePayables'],
 capex:['PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities'],interestExpense:['FinanceCosts'],
 dividendsPaid:['DividendsPaidClassifiedAsFinancingActivities'],sbc:['ExpenseFromSharebasedPaymentTransactionsWithEmployees'],
};
type Issuer={facts:string[];cik:number;currency:string;reason:string;source:string;reviewed:string};
export const FILING_STATEMENT_RULE=reviewed.rule;
export const filingStatementIssuer=(id:string):Issuer|null=>(reviewed.issuers as Record<string,Issuer>)[id]??null;

/** Annual statements built from the issuer's annual XBRL facts (companyfacts and
 * the latest 20-F's inline facts), latest filing first, in the filing currency.
 * Only the consecutive run of years ending with the latest one is kept. */
export function filingStatements(company:Pick<Company,'id'|'cik'>,read:<T>(file:string)=>T|null):{years:Year[];currency:string;note:string;source:string}|null {
 const issuer=filingStatementIssuer(company.id);
 if(!issuer)return null;
 const byEnd=new Map<string,Year>();
 // Later files (the latest 20-F) restate and override earlier comparatives.
 for(const file of issuer.facts){
  const raw=read<{cik?:number|string;facts?:unknown;source?:string}>(file);
  if(!raw)continue;
  if(raw.cik!=null&&Number(raw.cik)!==issuer.cik)throw Error(`${company.id}: ${file} belongs to CIK ${raw.cik}, not ${issuer.cik}`);
  const facts=((raw.facts as {facts?:unknown})?.facts?raw.facts:raw) as CompanyFacts;
  for(const y of yearsFromCompanyFacts(facts,issuer.currency,raw.source??file,IFRS_TAGS)){
   const prior=byEnd.get(y.end);
   byEnd.set(y.end,prior?{...prior,...Object.fromEntries(Object.entries(y).filter(([,v])=>v!==null&&v!==undefined)),provenance:{...prior.provenance,...y.provenance}} as Year:y);
  }
 }
 let years=[...byEnd.values()].filter(y=>y.revenue!==null&&y.netIncome!==null).sort((a,b)=>a.end.localeCompare(b.end));
 let start=years.length-1;
 while(start>0&&years[start].fy===years[start-1].fy+1)start--;
 years=years.slice(start).map(y=>{
  const liabilities=y.totalLiabilities??(y.totalAssets!=null&&y.equity!=null?y.totalAssets-y.equity-(y.minorityInterest??0):null);
  return {...y,totalLiabilities:liabilities,statementCoverage:{...y.statementCoverage,balance:y.totalAssets!=null&&liabilities!=null&&y.equity!=null},
   provenance:{...y.provenance,...(y.totalLiabilities==null&&liabilities!=null?{totalLiabilities:{source:issuer.source,field:'totalLiabilities',method:'derived' as const,inputs:['Assets − equity attributable to owners − non-controlling interests']}}:{})},
   sourceWarnings:[...(y.sourceWarnings??[]),`Annual statements from the ${issuer.currency} 20-F XBRL (reviewed ${issuer.reviewed}); vendor rows not used: ${issuer.reason}`]};
 });
 if(!years.length)return null;
 return {years:deriveYears(years),currency:issuer.currency,source:issuer.source,
  note:`Annual statements built from the 20-F (${issuer.currency}, FY${years[0].fy}–FY${years.at(-1)!.fy}); vendor rows not used: ${issuer.reason}`};
}
