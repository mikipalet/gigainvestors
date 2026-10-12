import {currencyCode,marketCapCurrency} from './currency';
import type {CompanyFacts} from './completeness/second-sources';
import {STATEMENT_FIELDS} from './statement-currency';
import type {Year} from './types';

/** IAS 29 applies to an entity whose functional currency is that of a
 * hyperinflationary economy, for reporting periods ending on or after the date
 * the economy became hyperinflationary (IPTF / Big Four IAS 29 lists: three-year
 * cumulative inflation above 100%). Nominal amounts of such a currency in
 * different years are not comparable. */
export const HYPERINFLATIONARY:Readonly<Record<string,{from:string;basis:string}>>={
 ARS:{from:'2018-07-01',basis:'Argentina: periods ending on or after 1 July 2018 (FACPCE JG 539/18; IPTF)'},
 TRY:{from:'2022-06-30',basis:'Türkiye: periods ending on or after 30 June 2022 (POA; IPTF)'},
 VES:{from:'2009-12-31',basis:'Venezuela: since 2009 (IPTF)'},
 LBP:{from:'2020-12-31',basis:'Lebanon: periods ending on or after 31 December 2020 (IPTF)'},
 IRR:{from:'2020-12-31',basis:'Iran: periods ending on or after 31 December 2020 (IPTF)'},
 ZWL:{from:'2019-07-01',basis:'Zimbabwe: periods ending on or after 1 July 2019 (PAAB; IPTF)'},
 ZWG:{from:'2019-07-01',basis:'Zimbabwe: periods ending on or after 1 July 2019 (PAAB; IPTF)'},
 SSP:{from:'2016-12-31',basis:'South Sudan: since 2016 (IPTF)'},
 SDG:{from:'2018-12-31',basis:'Sudan: since 2018 (IPTF)'},
 ETB:{from:'2022-12-31',basis:'Ethiopia: periods ending on or after 31 December 2022 (IPTF)'},
 GHS:{from:'2023-12-31',basis:'Ghana: periods ending on or after 31 December 2023 (ICAG; IPTF)'},
 SLE:{from:'2022-12-31',basis:'Sierra Leone: periods ending on or after 31 December 2022 (IPTF)'},
 SRD:{from:'2020-12-31',basis:'Suriname: periods ending on or after 31 December 2020 (IPTF)'},
};
const major=(c:string|null|undefined)=>c?marketCapCurrency(currencyCode(c)):'';
export const hyperinflationary=(currency:string|null|undefined,end:string)=>{const h=HYPERINFLATIONARY[major(currency)];return Boolean(h&&end>=h.from);};

/** The purchasing-power unit of one vendor statement: its own year (nominal,
 * before IAS 29) or the year-end of the IAS 29 filing whose restated amounts it equals. */
export type MeasuringUnit={basis:'nominal'|'restated';unitEnd:string;source:string}|{basis:'unknown';reason:string};
export type MeasuredStatement='income'|'cashFlow'|'balance';
export interface YearUnits {fy:number;end:string;statements:Record<MeasuredStatement,MeasuringUnit>}
/** USD per reporting unit for each statement of one year, plus USD per trading unit at fiscal end. */
export interface MeasureYear {fy:number;end:string;income:number|null;cashFlow:number|null;balance:number|null;trading:number|null;units:Record<MeasuredStatement,MeasuringUnit>}
export interface Measure {currency:'USD';reporting:string;basis:string;years:MeasureYear[]}

const DAY=86400000,MATCH=.02;
const ANNUAL=/^(10-K|20-F|40-F)(\/A)?$/;
type Anchor='revenue'|'netIncome'|'ocf'|'equity'|'totalAssets';
const FIELDS:Record<Anchor,{tags:string[];statement:MeasuredStatement}>={
 revenue:{tags:['Revenue','Revenues','RevenueFromContractWithCustomerExcludingAssessedTax','RevenueFromContractsWithCustomers'],statement:'income'},
 netIncome:{tags:['ProfitLossAttributableToOwnersOfParent','NetIncomeLoss','ProfitLoss'],statement:'income'},
 ocf:{tags:['CashFlowsFromUsedInOperatingActivities','NetCashProvidedByUsedInOperatingActivities'],statement:'cashFlow'},
 equity:{tags:['EquityAttributableToOwnersOfParent','StockholdersEquity','Equity'],statement:'balance'},
 totalAssets:{tags:['Assets'],statement:'balance'},
};
type Fact={val:number;start?:string;end:string;form?:string;filed?:string;accn?:string};

/** Which filing each vendor statement comes from. A 20-F under IAS 29 restates
 * every comparative into its own year-end currency (three years of income and
 * cash flows, two balance sheets), so a vendor amount equal to one filing's
 * figure is stated in that filing's year-end unit. Statements are placed
 * separately: the vendor often takes a year's income statement from a later
 * filing than its balance sheet. Amounts of one statement pointing to different
 * filings, or that no filing states, are unknown; a cash-flow statement with no
 * filed total takes its income statement's unit (both come from the same
 * statements of a filing). A year that ended more than three years before IAS 29
 * applied is nominal: no IAS 29 filing restates it. */
export function measuringUnits(years:Year[],sets:Array<{facts:CompanyFacts;source:string}>,today=new Date().toISOString().slice(0,10)):YearUnits[] {
 const reportEnd=new Map<string,string>();
 const facts:Array<Fact&{field:Anchor;unit:string;key:string}>=[];
 for(const {facts:set,source} of sets)for(const ns of Object.values(set?.facts??{}))for(const [field,{tags,statement}] of Object.entries(FIELDS) as Array<[Anchor,{tags:string[];statement:MeasuredStatement}]>)
  for(const tag of tags)for(const [unit,rows] of Object.entries(ns[tag]?.units??{}))for(const f of rows as Fact[]){
   if(!/^[A-Z]{3}$/.test(unit)||!ANNUAL.test(f.form??'')||(f.filed??'')>today||!Number.isFinite(f.val)||f.val===0)continue;
   const days=f.start?(Date.parse(f.end)-Date.parse(f.start))/DAY:0;
   if(statement==='balance'?Boolean(f.start):days<330||days>400)continue;
   // A filing's measuring unit is its latest balance-sheet or period-end date.
   const key=`${source}#${f.accn??f.filed??''}`;
   if(!reportEnd.has(key)||reportEnd.get(key)!<f.end)reportEnd.set(key,f.end);
   facts.push({...f,field,unit,key});
  }
 return years.map(y=>{
  const currency=major(y.currency),start=HYPERINFLATIONARY[currency]?.from;
  const old=Boolean(start&&new Date(Date.parse(start)-3*366*DAY).toISOString().slice(0,10)>y.end);
  const nominal=(d:string)=>!start||d<start;
  const near=(f:{end:string})=>Math.abs(Date.parse(f.end)-Date.parse(y.end))<=7*DAY;
  const place=(statement:MeasuredStatement):MeasuringUnit=>{
   const anchors=(Object.keys(FIELDS) as Anchor[]).filter(a=>FIELDS[a].statement===statement);
   const filed=anchors.filter(a=>facts.some(f=>f.field===a&&major(f.unit)===currency&&near(f)));
   const matches=filed.flatMap(field=>{
    const v=y[field];
    if(typeof v!=='number'||!Number.isFinite(v)||v===0)return [];
    const hits=facts.filter(f=>f.field===field&&major(f.unit)===currency&&near(f)&&Math.abs(v/f.val-1)<=MATCH);
    return [{field,hits,ends:[...new Set(hits.map(f=>reportEnd.get(f.key)!))]}];
   });
   if(!matches.some(m=>m.ends.length))return old?{basis:'nominal',unitEnd:y.end,source:'ended more than three years before IAS 29 applied'}
    :{basis:'unknown',reason:filed.length?`the FY${y.fy} ${statement==='cashFlow'?'cash-flow statement':statement==='balance'?'balance sheet':'income statement'} equals no annual filing`:`no annual filing states the FY${y.fy} ${statement==='cashFlow'?'cash flows':statement==='balance'?'balance sheet':'income statement'}`};
   // A field no filing states at par (a scale or concept difference) does not veto; two fields at different filings do.
   const common=matches.filter(m=>m.ends.length).map(m=>m.ends).reduce((a,b)=>a.filter(x=>b.includes(x)));
   const source=(d:string)=>matches.flatMap(m=>m.hits).find(f=>reportEnd.get(f.key)===d)!.key;
   // Pre-IAS 29 filings repeat nominal comparatives unchanged, so several nominal dates agree.
   if(common.length&&common.every(nominal))return {basis:'nominal',unitEnd:y.end,source:source(common[0])};
   const restated=common.filter(d=>!nominal(d));
   if(restated.length===1)return {basis:'restated',unitEnd:restated[0],source:source(restated[0])};
   return {basis:'unknown',reason:`FY${y.fy} ${matches.map(m=>`${m.field} matches ${m.ends.length?`the ${m.ends.join('/')} filing`:'no filing'}`).join(', ')}: no single measuring unit`};
  };
  const income=place('income'),balance=place('balance');
  let cashFlow=place('cashFlow');
  if(cashFlow.basis==='unknown'&&/^no annual filing states/.test(cashFlow.reason)&&income.basis!=='unknown')cashFlow={...income,source:`${income.source} (income-statement unit; no filed cash-flow total)`};
  return {fy:y.fy,end:y.end,statements:{income,cashFlow,balance}};
 });
}

/** Daily USD-per-unit observations, ascending, from a cached fx file. */
export function fxSeries(raw:{data?:Array<{date?:string;close?:number}>}|null|undefined):Array<[string,number]> {
 return (raw?.data??[]).flatMap(r=>typeof r.date==='string'&&typeof r.close==='number'&&Number.isFinite(r.close)&&r.close>0?[[r.date,r.close] as [string,number]]:[]).sort((a,b)=>a[0].localeCompare(b[0]));
}
export function closingRate(series:Array<[string,number]>,date:string):number|null {
 let lo=0,hi=series.length-1,found=-1;
 while(lo<=hi){const mid=(lo+hi)>>1;if(series[mid][0]<=date){found=mid;lo=mid+1;}else hi=mid-1;}
 return found>=0&&(Date.parse(date)-Date.parse(series[found][0]))/DAY<=10?series[found][1]:null;
}
export function averageRate(series:Array<[string,number]>,end:string):number|null {
 const from=new Date(Date.parse(end)-365*DAY).toISOString().slice(0,10);
 const xs=series.filter(([d])=>d>from&&d<=end).map(([,c])=>c);
 return xs.length>=100?xs.reduce((a,b)=>a+b,0)/xs.length:null;
}

/** IAS 21.42: restated statements translate at the closing rate of their unit
 * date; nominal flows at the year's average rate and balance sheets at its closing rate. */
export function measureYears(units:YearUnits[],reporting:Array<[string,number]>,trading:Array<[string,number]>|null):MeasureYear[] {
 return units.map(u=>{
  const rate=(statement:MeasuredStatement)=>{
   const unit=u.statements[statement];
   return unit.basis==='unknown'?null:unit.basis==='restated'||statement==='balance'?closingRate(reporting,unit.unitEnd):averageRate(reporting,u.end);
  };
  return {fy:u.fy,end:u.end,income:rate('income'),cashFlow:rate('cashFlow'),balance:rate('balance'),trading:trading===null?1:closingRate(trading,u.end),units:u.statements};
 });
}

/** Share counts, ratios and dates are unit-free. */
const UNITLESS=new Set<string>(['fy','dilutedShares','sharesOutstanding','acquisitionSharesIssued','acquisitionIssuanceJudgement','efficiencyRatio','combinedRatio','peerCreditLossRate']);
const STATEMENT_OF=new Map<string,MeasuredStatement>([
 ...STATEMENT_FIELDS['income statement'].map(f=>[f,'income'] as [string,MeasuredStatement]),
 ...STATEMENT_FIELDS['cash-flow statement'].map(f=>[f,'cashFlow'] as [string,MeasuredStatement]),
 ...STATEMENT_FIELDS['balance sheet'].map(f=>[f,'balance'] as [string,MeasuredStatement]),
 ['totalNetIncome','income'],['retainedEarningsChange','income'],['adverseReserveDevelopment','income'],['retainedEarningsOther','balance'],
]);

/** The same years measured in US dollars, each statement at its own rate. An
 * amount whose statement has no measuring unit or rate is unknown (null);
 * share counts and ratios are kept. Market value is the fiscal-end trading value
 * at that date's trading rate; `rate` is the reporting-to-trading rate that the
 * nominal market values were divided by. */
export function measuredYears(years:Year[],measure:Measure,rate:number|null):Year[] {
 const byEnd=new Map(measure.years.map(m=>[m.end,m]));
 return years.map(y=>{
  const m=byEnd.get(y.end),out:Record<string,unknown>={...y,currency:measure.currency,provenance:undefined};
  for(const [k,v] of Object.entries(y)){
   if(typeof v!=='number'||UNITLESS.has(k))continue;
   const statement=STATEMENT_OF.get(k),r=statement&&m?m[statement]:null;
   out[k]=r==null?null:v*r;
  }
  if(y.cashExclusion)out.cashExclusion=m?.balance==null?undefined:{...y.cashExclusion,amount:y.cashExclusion.amount*m.balance};
  out.marketCap=y.marketCap!=null&&rate!=null&&m?.trading!=null?y.marketCap*rate*m.trading:null;
  out.averageSharePrice=y.averageSharePrice!=null&&rate!=null&&m?.trading!=null?y.averageSharePrice*rate*m.trading:null;
  return out as unknown as Year;
 });
}

export function measureNote(measure:Measure):string {
 const unknown=measure.years.filter(y=>y.income===null||y.balance===null).map(y=>y.fy);
 return `${measure.reporting} is hyperinflationary (${measure.basis}): the tests are measured in US dollars, each statement at the exchange rate of the year-end currency it is stated in, not in nominal ${measure.reporting}${unknown.length?`; FY${unknown.join(', FY')} ${unknown.length>1?'have':'has'} a statement no annual filing places in a measuring unit, so ${unknown.length>1?'their':'its'} amounts are unknown`:''}`;
}
