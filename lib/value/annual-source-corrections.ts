import type {Company,Year} from './types';
import type {CompanyFacts} from './completeness/second-sources';

type Options={source:string;financial?:boolean;revenueConcept?:string;revenueComponents?:string[];adr?:boolean;ordinaryPerAds?:number;shareBasisSource?:string;splits?:Array<{date:string;factor:number}>};
/** Source selection is by accounting concept, annual period, currency and share
 * basis. Never infer a depositary ratio from the discrepancy being corrected. */
export function correctAnnualSources(years:Year[],facts:CompanyFacts,options:Options):Year[]{
 const corrected=years.map(year=>{
  const y={...year,provenance:{...year.provenance}};
  const anchorFields={netIncome:['NetIncomeLoss','ProfitLossAttributableToOwnersOfParent'],totalAssets:['Assets'],equity:['StockholdersEquity','EquityAttributableToOwnersOfParent'],ocf:['NetCashProvidedByUsedInOperatingActivities','CashFlowsFromUsedInOperatingActivities']};
  const periods=new Map<string,Set<string>>();
  for(const [field,tags]of Object.entries(anchorFields)){
   const value=y[field as keyof typeof anchorFields];if(value==null||value===0)continue;
   for(const ns of Object.values(facts.facts))for(const tag of tags)for(const f of ns[tag]?.units[y.currency??'']??[]){
    if(f.val!==value||Math.abs(Date.parse(f.end)-Date.parse(y.end))>366*86400000||!/^(10-K|20-F|40-F|17-A)(\/A)?$/.test(f.form??'')||(f.filed??'')>new Date().toISOString().slice(0,10))continue;
    const instant=['totalAssets','equity'].includes(field),duration=f.start?(Date.parse(f.end)-Date.parse(f.start))/86400000:0;
    if(instant?Boolean(f.start):duration<330||duration>400)continue;
    if(!periods.has(f.end))periods.set(f.end,new Set());periods.get(f.end)!.add(field);
   }
  }
  const matches=[...periods].filter(([,fields])=>fields.size>=3);
  if(!periods.has(y.end)&&matches.length===1&&matches[0][0]!==y.end){
   const [end,fields]=matches[0];y.provenance.end={source:options.source,field:'annual-period-alignment',method:'derived',inputs:[`Vendor annual end ${y.end}`,`Exact independent ${[...fields].join(', ')} at ${end}`]};
   y.end=end;y.fy=Number(end.slice(0,4));
  }
  // A vendor trading-currency label can leak into local-currency statements.
  // Relabel only with two independent matching amounts; never infer an FX rate.
  const currencyMatches=new Map<string,Set<string>>();
  const currencyAnchors={...anchorFields,revenue:['Revenues','Revenue']};
  for(const [field,tags] of Object.entries(currencyAnchors)){
   const value=y[field as keyof typeof currencyAnchors];if(value==null||value===0)continue;
   for(const ns of Object.values(facts.facts))for(const tag of tags)for(const [unit,rows]of Object.entries(ns[tag]?.units??{})){
    if(!/^[A-Z]{3}$/.test(unit))continue;
    if(rows.some(f=>f.end===y.end&&f.val!==0&&Math.abs(value/f.val-1)<.005
     && /^(10-K|20-F|40-F|17-A)(\/A)?$/.test(f.form??'')&&(f.filed??'')<=new Date().toISOString().slice(0,10)
     &&(['totalAssets','equity'].includes(field)?!f.start:Boolean(f.start&&(Date.parse(f.end)-Date.parse(f.start))/86400000>=330&&(Date.parse(f.end)-Date.parse(f.start))/86400000<=400)))){
      if(!currencyMatches.has(unit))currencyMatches.set(unit,new Set());currencyMatches.get(unit)!.add(field);
    }
   }
  }
  const currencies=[...currencyMatches].filter(([,fields])=>fields.size>=2);
  if(!currencyMatches.has(y.currency??'')&&currencies.length===1&&currencies[0][0]!==y.currency){
   const [unit,fields]=currencies[0];
   y.provenance.currency={source:options.source,field:'currency',method:'derived',inputs:[`Vendor label ${y.currency}; corroborated ${unit}`,`Independent ${[...fields].join(', ')} agree within 0.5%; amounts unchanged`]};
   y.currency=unit;
  }
  const anchors=new Set<string>();
  for(const [field,tags] of Object.entries({revenue:['Revenues','RevenueFromContractWithCustomerExcludingAssessedTax','Revenue'],netIncome:['NetIncomeLoss','ProfitLossAttributableToOwnersOfParent']})){
   const value=y[field as 'revenue'|'netIncome'];if(value==null||value===0)continue;
   for(const ns of Object.values(facts.facts))for(const tag of tags)for(const f of ns[tag]?.units[y.currency??'']??[]){
    const days=f.start?(Date.parse(f.end)-Date.parse(f.start))/86400000:0;
    if(f.val===value&&Math.abs(Date.parse(f.end)-Date.parse(y.end))<=7*86400000&&days>=330&&days<=400&&/^(10-K|20-F|40-F|17-A)(\/A)?$/.test(f.form??''))anchors.add(f.end);
   }
  }
  const sourceEnd=anchors.has(y.end)?y.end:anchors.size===1?[...anchors][0]:y.end;
  const pick=(tags:string[],unit:string,instant=false)=>{
   for(const concept of tags)for(const ns of concept.includes(':')?[concept.split(':')[0]]:['us-gaap','ifrs-full']){
    const tag=concept.split(':').at(-1)!;
    const rows=(facts.facts[ns]?.[tag]?.units[unit]??[]).filter(f=>f.end===sourceEnd
     && /^(10-K|20-F|40-F|17-A)(\/A)?$/.test(f.form??'')&&Number.isFinite(f.val)
     &&(instant?!f.start:Boolean(f.start&&(Date.parse(f.end)-Date.parse(f.start))/86400000>=330&&(Date.parse(f.end)-Date.parse(f.start))/86400000<=400))
     &&(f.filed??'')<=new Date().toISOString().slice(0,10)).sort((a,b)=>(b.filed??'').localeCompare(a.filed??''));
    if(!rows.length)continue;
    const f=rows[0];if(rows.some(r=>r.filed===f.filed&&r.val!==f.val))return null;
    return {value:f.val,tag:`${ns}:${tag}`,source:`${options.source}#${f.accn??f.filed}`,start:f.start!,end:f.end,filed:f.filed??''};
   }return null;
  };
  const assign=(field:'revenue'|'dilutedShares'|'sharesOutstanding',fact:NonNullable<ReturnType<typeof pick>>,divisor=1,inputs:string[]=[])=>{
   y[field]=fact.value/divisor;
   y.provenance[field]={source:fact.source,field:fact.tag,method:divisor===1?'reported':'derived',inputs:[field==='sharesOutstanding'?`Fiscal end ${fact.end}`:`Annual period ${fact.start} to ${fact.end}`,field==='revenue'?`Currency ${y.currency}`:field==='sharesOutstanding'?'Fiscal-end common shares outstanding':'Weighted average diluted shares',...inputs]};
  };
  if((options.financial||options.revenueConcept)&&y.currency){
   const interest=pick(['InterestIncomeExpenseNet'],y.currency),other=pick(['NoninterestIncome'],y.currency);
   const components=options.revenueComponents?.map(tag=>pick([tag],y.currency!));
   if(components?.length&&components.every((f):f is NonNullable<typeof f>=>f!==null)&&components.every(f=>f.start===components[0]!.start)){
    assign('revenue',{...components[0]!,value:components.reduce((sum,f)=>sum+f!.value,0),tag:components.map(f=>f!.tag).join(' + ')},1,['Reviewed consolidated revenue components; net interest before credit impairment']);
    y.provenance.revenue.method='derived';y.netRevenue=y.revenue;
   }else if(options.financial&&interest&&other&&interest.start===other.start){
    const total={...interest,value:interest.value+other.value,tag:`${interest.tag} + ${other.tag}`};
    assign('revenue',total,1,['Net interest plus noninterest income; excludes interest expense']);
    y.provenance.revenue.method='derived';y.netRevenue=y.revenue;
   }else{
    let total=pick([...(options.revenueConcept?[options.revenueConcept]:[]),'Revenues','RevenuesNetOfInterestExpense','RevenueAndOperatingIncome','Revenue','GrossInvestmentIncomeOperating','InvestmentBankingRevenue','RevenueFromContractsWithCustomers','RevenueFromContractWithCustomerExcludingAssessedTax','RevenueFromContractWithCustomerIncludingAssessedTax'],y.currency);
    const contracts=pick(['RevenueFromContractWithCustomerExcludingAssessedTax','RevenueFromContractsWithCustomers'],y.currency);
    // Some filings omit scale on a duplicated geographic-revenue total. Accept
    // the correctly scaled tag only when the vendor independently corroborates
    // the magnitude. Otherwise leave conflicting source units for review.
    if(total&&contracts&&total.value>0&&contracts.value/total.value===1000&&y.revenue!=null&&y.revenue/contracts.value>.5&&y.revenue/contracts.value<2){
     total=contracts;
    }
    if(total)assign('revenue',total);
   }
  }
  let shares=pick(['WeightedAverageNumberOfDilutedSharesOutstanding','AdjustedWeightedAverageShares','WeightedAverageLimitedPartnershipUnitsOutstandingDiluted'], 'shares');
  if(!shares){
   const basic=pick(['BasicEarningsLossPerShare'],`${y.currency}/shares`),diluted=pick(['DilutedEarningsLossPerShare'],`${y.currency}/shares`);
   if(basic&&diluted&&basic.value===diluted.value)shares=pick(['WeightedAverageShares'],'shares');
  }
  if(!shares&&y.netIncome!==null&&y.netIncome<0)shares=pick(['WeightedAverageNumberOfShareOutstandingBasicAndDiluted','WeightedAverageNumberOfSharesOutstandingBasic'],'shares');
  const ratio=options.adr?options.ordinaryPerAds:1;
  const splitFactor=shares?(options.splits??[]).filter(s=>s.date>shares!.end&&s.date>shares!.filed&&s.date<=new Date().toISOString().slice(0,10)).reduce((a,s)=>a*s.factor,1):1;
  if(shares&&ratio&&ratio>0&&(!options.adr||options.shareBasisSource))assign('dilutedShares',shares,ratio/splitFactor,
   [...(options.adr?[`${ratio} ordinary shares per ADS; ${options.shareBasisSource}`]:[]),...(splitFactor!==1?[`Post-filing split factor ${splitFactor}; current listing units`]:[])]);
  // Capitalization needs the stock outstanding at the fiscal instant, not the
  // annual EPS denominator or a later DEI cover-page count. Both share series
  // retain their own provenance, ADS conversion and post-filing split basis.
  const outstanding=pick(['CommonStockSharesOutstanding'],'shares',true);
  // Comparative EPS shares can be filed later than the balance-sheet count.
  // When the two reported counts already agree in scale, carry them onto the
  // same split basis. Filing date alone must not scale only one denominator
  // (a vendor can also label a spin-off price adjustment as a split).
  const sameReportedBasis=outstanding&&shares&&shares.value>0&&Math.abs(outstanding.value/shares.value-1)<.15;
  const outstandingSplit=sameReportedBasis?splitFactor:outstanding?(options.splits??[]).filter(s=>s.date>outstanding.end&&s.date>outstanding.filed&&s.date<=new Date().toISOString().slice(0,10)).reduce((a,s)=>a*s.factor,1):1;
  if(outstanding&&outstanding.value>0&&ratio&&ratio>0&&(!options.adr||options.shareBasisSource))assign('sharesOutstanding',outstanding,ratio/outstandingSplit,
   [...(options.adr?[`${ratio} ordinary shares per ADS; ${options.shareBasisSource}`]:[]),...(outstandingSplit!==1?[`Post-filing split factor ${outstandingSplit}; current listing units`]:[])]);
  return y;
 });
 // A proven fiscal-date shift can expose two vendor rows labelled as the same
 // fiscal year. Keep the later, source-aligned full year, not the overlapping proxy.
 const unique=[...new Map(corrected.map(y=>[y.end,y])).values()];
 return unique.filter(y=>!unique.some(other=>other!==y&&other.fy===y.fy&&other.end>y.end&&other.provenance?.end?.field==='annual-period-alignment')).sort((a,b)=>a.end.localeCompare(b.end));
}

export interface AnnualSourceEvidence {
 facts:CompanyFacts;source:string;ordinaryPerAds?:number;shareBasisSource?:string;revenueConcept?:string;revenueComponents?:string[];shareDimensions?:Record<string,string>;revenueDimensions?:Record<string,string>;
}
/** All cache, fetch and analysis paths consume the same general correction. */
export function correctCachedAnnualSources(company:Company,years:Year[],raw:unknown,read:<T>(file:string)=>T|null,splits:Options['splits']=[]):Year[]{
 const provider=raw as {General?:{HomeCategory?:string;Type?:string}}|null;
 const adr=/ADR|GDR|depositary/i.test(`${provider?.General?.HomeCategory??''} ${provider?.General?.Type??''}`);
 const evidence=read<AnnualSourceEvidence>(`raw/sec-annual/${company.id}.json`);
 const facts=read<CompanyFacts>(`raw/sec-companyfacts/${company.id}.json`);
 const options={splits,financial:company.sector==='Financial Services'||company.kind==='bank'||company.kind==='insurer',adr,
  ordinaryPerAds:evidence?.ordinaryPerAds,shareBasisSource:evidence?.shareBasisSource};
 let result=facts?correctAnnualSources(years,facts,{...options,financial:options.financial&&!evidence?.revenueDimensions,source:`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(company.cik??'').padStart(10,'0')}.json`}):years;
 if(evidence)result=correctAnnualSources(result,evidence.facts,{...options,source:evidence.source,revenueConcept:evidence.revenueConcept,revenueComponents:evidence.revenueComponents});
 const reviewed=read<AnnualSourceEvidence>(`raw/annual-reviewed/${company.id}.json`);
 if(reviewed)result=correctAnnualSources(result,reviewed.facts,{...options,source:reviewed.source,revenueConcept:reviewed.revenueConcept});
 return result;
}
