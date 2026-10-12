import {currencyCode,marketCapCurrency} from './currency';
import type {BalanceSheet} from './latest-balance';
import type {CompanyFacts} from './completeness/second-sources';
import type {Company,Year} from './types';

/** USD per major currency unit, from dated observations (never inferred from the data under test). */
export type UsdRates=Readonly<Record<string,number>>;
export interface CurrencyDrop {fy:number;end:string;reason:string;source:string}
export interface FactSet {facts:CompanyFacts;source:string}

// Listing exchanges are not reporting currencies, but a company's statements are
// normally in its home currency. Only these and the listing currency are
// accepted as the currency of amounts that contradict their label.
const COUNTRY_CURRENCY:Record<string,string>={AR:'ARS',AT:'EUR',AU:'AUD',BE:'EUR',BR:'BRL',CA:'CAD',CH:'CHF',CL:'CLP',CN:'CNY',CO:'COP',CZ:'CZK',DE:'EUR',DK:'DKK',ES:'EUR',FI:'EUR',FR:'EUR',GB:'GBP',GR:'EUR',HK:'HKD',HU:'HUF',ID:'IDR',IE:'EUR',IL:'ILS',IN:'INR',IT:'EUR',JP:'JPY',KR:'KRW',KZ:'KZT',LU:'EUR',MX:'MXN',MY:'MYR',NL:'EUR',NO:'NOK',NZ:'NZD',PE:'PEN',PH:'PHP',PL:'PLN',PT:'EUR',SE:'SEK',SG:'SGD',TH:'THB',TR:'TRY',TW:'TWD',US:'USD',ZA:'ZAR'};
const major=(c:string|null|undefined)=>c?marketCapCurrency(currencyCode(c)):'';
export function homeCurrencies(company:Pick<Company,'currency'|'country'>):string[] {
 return [...new Set([major(company.currency),COUNTRY_CURRENCY[company.country]??''].filter(Boolean))];
}
/** Read the cached dated FX observations (USD per unit) without any request. */
export function cachedUsdRates(read:<T>(file:string)=>T|null,currencies:string[]):Record<string,number> {
 const rates:Record<string,number>={USD:1};
 for(const c of new Set(currencies.map(major)))if(c&&c!=='USD'&&/^[A-Z]{3}$/.test(c)){
  const close=read<{data?:Array<{close?:number}>}>(`raw/eodhd/universe/fx-${c}.json`)?.data?.[0]?.close;
  if(typeof close==='number'&&Number.isFinite(close)&&close>0)rates[c]=close;
 }
 return rates;
}
const factor=(from:string,to:string,rates:UsdRates)=>{const a=rates[major(from)],b=rates[major(to)];return a&&b?a/b:null;};

const ANCHORS:Record<'revenue'|'netIncome'|'ocf'|'totalAssets'|'equity',string[]>={
 revenue:['Revenues','Revenue','RevenueFromContractWithCustomerExcludingAssessedTax','RevenueFromContractsWithCustomers'],
 netIncome:['NetIncomeLoss','ProfitLossAttributableToOwnersOfParent','ProfitLoss'],
 ocf:['NetCashProvidedByUsedInOperatingActivities','CashFlowsFromUsedInOperatingActivities'],
 totalAssets:['Assets'],
 equity:['StockholdersEquity','EquityAttributableToOwnersOfParent','StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest','Equity'],
};
type Anchor=keyof typeof ANCHORS;
const STOCKS=new Set<Anchor>(['totalAssets','equity']);
const ANNUAL=/^(10-K|20-F|40-F|17-A|annual-report)(\/A)?$/;
const DAY=86400000;
/** Gross mismatch: no rounding, restatement or perimeter difference is this large. */
const SCALE=Math.log(2.5);
const EQUAL=.005;

interface Observation {field:Anchor;unit:string;end:string;value:number;source:string}
function observations(sets:FactSet[],today:string):Observation[] {
 const out:Observation[]=[];
 for(const {facts,source} of sets)for(const ns of Object.values(facts?.facts??{}))for(const [field,tags] of Object.entries(ANCHORS) as Array<[Anchor,string[]]>)
  for(const tag of tags)for(const [unit,rows] of Object.entries(ns[tag]?.units??{})){
   if(!/^[A-Z]{3}$/.test(unit))continue;
   for(const f of rows){
    if(!ANNUAL.test(f.form??'')||(f.filed??'')>today||!Number.isFinite(f.val)||f.val===0)continue;
    const days=f.start?(Date.parse(f.end)-Date.parse(f.start))/DAY:0;
    if(STOCKS.has(field)?Boolean(f.start):days<330||days>400)continue;
    out.push({field,unit,end:f.end,value:f.val,source:`${source}#${(f as {accn?:string}).accn??f.filed??f.end}`});
   }
  }
 return out;
}

/** Vendor amounts must be in the currency they are labelled with. An annual
 * filing is the independent evidence: amounts equal to the filing in another
 * currency, or grossly different from the filing in the labelled currency,
 * prove the label wrong. A year is relabelled only when every compared amount
 * points to one home currency (the filing in that currency, or the filing
 * translated at a dated rate within 30%); a year that mixes currencies, or
 * whose currency cannot be established, is dropped. Amounts are never changed.
 * Without a filing, a balance sheet or income statement that alone changes
 * scale by an FX factor between consecutive years (the other statement
 * continuous) is a currency switch inside the vendor series: that year is
 * dropped when it is the latest year or the series returns to scale after it. */
export function verifyStatementCurrency(years:Year[],sets:FactSet[],home:string[],rates:UsdRates,today=new Date().toISOString().slice(0,10),vendorLabels:string[]=[]):{years:Year[];dropped:CurrencyDrop[]} {
 const candidates=[...new Set(vendorLabels.map(major).filter(c=>/^[A-Z]{3}$/.test(c)))];
 const obs=observations(sets,today);
 const dropped:CurrencyDrop[]=[];
 const out:Year[]=[];
 for(const year of years){
  const label=major(year.currency);
  const near=(o:Observation)=>Math.abs(Date.parse(o.end)-Date.parse(year.end))<=12*DAY;
  const vendor=(f:Anchor)=>{const v=year[f];return typeof v==='number'&&Number.isFinite(v)&&v!==0?v:null;};
  // Per unit and field, the filing concept nearest the vendor amount (attributable
  // or consolidated profit, parent or total equity): a concept choice is never a mismatch.
  const best=new Map<string,Observation&{ratio:number}>();
  for(const o of obs.filter(near)){
   const v=vendor(o.field);if(v===null)continue;
   const c={...o,ratio:v/o.value},k=`${o.unit}|${o.field}`,prior=best.get(k);
   if(!prior||Math.abs(Math.log(Math.abs(c.ratio)))<Math.abs(Math.log(Math.abs(prior.ratio))))best.set(k,c);
  }
  // Small profits and cash flows are not evidence of scale: compare flows of at
  // least 2% of the filing's revenue (or assets) only.
  const size=(unit:string,field:Anchor)=>obs.find(o=>near(o)&&o.unit===unit&&o.field===field)?.value??null;
  const material=(c:Observation)=>{
   if(c.field==='revenue'||c.field==='totalAssets')return true;
   const base=c.field==='equity'?size(c.unit,'totalAssets'):size(c.unit,'revenue')??size(c.unit,'totalAssets');
   return base===null||Math.abs(c.value)>=.02*Math.abs(base);
  };
  let compared=[...best.values()].filter(material);
  // A vendor row can carry the wrong fiscal date as well as the wrong label:
  // three exact amounts of one other-currency filing period identify both.
  if(label&&!obs.some(near)){
   const byPeriod=new Map<string,Set<Anchor>>();
   for(const o of obs)if(Math.abs(Date.parse(o.end)-Date.parse(year.end))<=400*DAY&&major(o.unit)!==label&&vendor(o.field)!==null&&Math.abs(vendor(o.field)!/o.value-1)<EQUAL){
    const k=`${o.unit}|${o.end}`;byPeriod.set(k,(byPeriod.get(k)??new Set()).add(o.field));
   }
   const periods=[...byPeriod].filter(([,f])=>f.size>=3);
   if(periods.length===1){
    const [unit,end]=periods[0][0].split('|');
    const source=obs.find(o=>o.unit===unit&&o.end===end)!.source;
    out.push({...year,currency:unit,end,fy:Number(end.slice(0,4)),provenance:{...year.provenance,
     end:{source,field:'annual-period-alignment',method:'derived',inputs:[`Vendor annual end ${year.end}`,`Exact ${[...periods[0][1]].join(', ')} of the ${unit} filing period ending ${end}`]},
     currency:{source,field:'currency',method:'derived',inputs:[`Vendor label ${year.currency}; filing currency ${unit}`,`${[...periods[0][1]].join(', ')} equal the filing; amounts unchanged`]}}});
    continue;
   }
  }
  // An unlabelled year claims no currency; there is no label to contradict.
  if(!compared.length||!label){out.push(year);continue;}
  const equal=compared.filter(c=>Math.abs(c.ratio-1)<EQUAL);
  // Only units in which the filing states at least one compared amount at par
  // or in which the vendor label claims the amounts can test the label.
  const testUnits=new Set([...equal.map(c=>major(c.unit)),label]);
  compared=compared.filter(c=>testUnits.has(major(c.unit)));
  const gross=compared.filter(c=>Math.abs(Math.log(Math.abs(c.ratio)))>=SCALE);
  const describe=(cs:typeof compared)=>cs.map(c=>`${c.field} ${Math.abs(c.ratio-1)<EQUAL?'=':`${Number(Math.abs(c.ratio).toFixed(2))}×`} filing ${c.unit}`).join(', ');
  // Which candidate currency turns the filing amounts into the vendor amounts
  // (a dated observed rate, within 30%)? A gross gap no exchange rate explains
  // is a definition or perimeter difference, not a currency.
  const explains=(cs:typeof compared,from:string)=>[...new Set([...candidates,...home,'USD'])].filter(x=>x!==from).filter(x=>{
   const k=factor(from,x,rates);
   return k!==null&&Math.abs(Math.log(k))>=SCALE&&cs.every(c=>c.ratio>0&&Math.abs(Math.log(c.ratio/k))<=Math.log(1.3));
  });
  const foreign=equal.filter(c=>major(c.unit)!==label);
  const mixed=foreign.length?gross.filter(c=>foreign.some(e=>e.unit===c.unit))
   :equal.length&&gross.length&&explains(gross,label).length?gross:[];
  if(mixed.length){
   const at=foreign.length?foreign:equal;
   dropped.push({fy:year.fy,end:year.end,source:mixed[0].source,reason:`Statement currency changed in ${year.fy}: FY${year.fy} mixes currencies under one ${year.currency??'unlabelled'} label (${describe([...at,...mixed])}); year not used`});
   continue;
  }
  const labelled=compared.filter(c=>major(c.unit)===label);
  if(equal.length||labelled.length<2||gross.length<labelled.length){out.push(year);continue;}
  // Every amount the filing states in the labelled currency is grossly
  // different, by one exchange rate: the amounts are in that other currency.
  const fits=explains(labelled,label);
  if(!fits.length){out.push(year);continue;}
  const homeFits=fits.filter(x=>home.includes(x));
  if(homeFits.length===1&&fits.length===1){
   const x=homeFits[0],k=factor(label,x,rates)!;
   out.push({...year,currency:x,provenance:{...year.provenance,currency:{source:labelled[0].source,field:'currency',method:'derived',
    inputs:[`Vendor label ${year.currency}; amounts are ${x}`,`${describe(labelled)}; ${label}/${x} observed rate ${Number(k.toFixed(4))} (within 30%)`,'Amounts unchanged']}}});
   continue;
  }
  dropped.push({fy:year.fy,end:year.end,source:labelled[0].source,reason:`Statement currency changed in ${year.fy}: FY${year.fy} amounts are not in their ${year.currency} label (${describe(labelled)}, the ${label}/${fits.join(' or ')} rate) and ${fits.join(' or ')} is not the company's home currency; year not used`});
 }
 return withoutScaleBreaks(out,home,rates,dropped);
}

const median=(xs:number[])=>{const s=[...xs].sort((a,b)=>a-b),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
/** Common scale change of several positive totals, or null when they disagree. */
function commonRatio(pairs:Array<[unknown,unknown]>):number|null {
 const r=pairs.flatMap(([x,y])=>typeof x==='number'&&typeof y==='number'&&x>0&&y>0?[y/x]:[]);
 if(r.length<2||Math.max(...r)/Math.min(...r)>1.15)return null;
 return median(r);
}
const scale=(a:Partial<Year>,b:Partial<Year>,fields:Array<keyof Year>)=>commonRatio(fields.map(f=>[a[f],b[f]]));
const BALANCE:Array<keyof Year>=['totalAssets','totalLiabilities','equity'];
const INCOME:Array<keyof Year>=['revenue','grossProfit','costOfSales','operatingExpenses'];
/** The internal checks also consider US dollars, the usual foreign presentation currency. */
function fxBreak(k:number,label:string,home:string[],rates:UsdRates):string|null {
 if(Math.abs(Math.log(k))<SCALE)return null;
 return [...new Set([...home,'USD'])].filter(x=>x!==label).find(x=>{const f=factor(label,x,rates);return f!==null&&Math.min(Math.abs(Math.log(k/f)),Math.abs(Math.log(k*f)))<=Math.log(1.1);})??null;
}
/** Statement-level currency switch between consecutive same-label years. */
function statementBreak(a:Year,b:Year,home:string[],rates:UsdRates):{statement:string;k:number;currency:string}|null {
 if(b.fy!==a.fy+1||major(a.currency)!==major(b.currency))return null;
 const bal=scale(a,b,BALANCE),inc=scale(a,b,INCOME);
 if(bal===null||inc===null)return null;
 for(const [statement,moved,still] of [['balance sheet',bal,inc],['income statement',inc,bal]] as const){
  if(Math.abs(Math.log(still))>=Math.log(1.6))continue;
  const currency=fxBreak(moved/still,major(b.currency),home,rates);
  if(currency)return {statement,k:moved/still,currency};
 }
 return null;
}
function withoutScaleBreaks(years:Year[],home:string[],rates:UsdRates,dropped:CurrencyDrop[]){
 const out=[...years];
 for(let i=1;i<out.length;i++){
  const hit=statementBreak(out[i-1],out[i],home,rates);
  if(!hit)continue;
  const next=out[i+1],returns=next?statementBreak(out[i],next,home,rates):null;
  if(next&&!returns)continue;
  const y=out[i];
  dropped.push({fy:y.fy,end:y.end,source:y.provenance?.totalAssets?.source??y.provenance?.revenue?.source??'vendor annual statements',
   reason:`Statement currency changed in ${y.fy}: the FY${y.fy} ${hit.statement} changes scale ${Number(hit.k.toFixed(2))}× against FY${out[i-1].fy} while the other statement is continuous (the ${major(y.currency)}/${hit.currency} rate), so its amounts are not all in ${y.currency}; year not used`});
  out.splice(i,1);i--;
 }
 return {years:out,dropped};
}

/** A newer balance sheet must be on the same currency scale as the annual
 * statements it extends: assets and equity that both differ by an FX factor are
 * in another currency whatever their label says. */
export function consistentBalanceSheets(rows:BalanceSheet[],years:Year[],home:string[],rates:UsdRates):{rows:BalanceSheet[];rejected:string[]} {
 const rejected:string[]=[];
 const kept=rows.filter(r=>{
  const annual=[...years].filter(y=>y.end<=r.end&&major(y.currency)===major(r.currency)).at(-1);
  if(!annual)return true;
  const k=commonRatio([[annual.totalAssets,r.values.totalAssets],[annual.equity,r.values.equity]]);
  const currency=k===null?null:fxBreak(k,major(r.currency),home,rates);
  if(currency)rejected.push(`${r.end} balance sheet (${r.source}) is ${Number(k!.toFixed(2))}× the FY${annual.fy} ${annual.currency} statement — ${major(r.currency)}/${currency} scale; not used`);
  return !currency;
 });
 return {rows:kept,rejected};
}
/** Trailing flows on another currency scale than the annual statements are not used. */
export function consistentTrailing(ttm:Year|null|undefined,years:Year[],home:string[],rates:UsdRates):{ttm:Year|null;rejected:string|null} {
 const annual=years.at(-1);
 if(!ttm||!annual||major(ttm.currency??annual.currency)!==major(annual.currency))return {ttm:ttm??null,rejected:null};
 const k=scale(annual,ttm,['revenue','grossProfit','costOfSales','operatingExpenses']);
 const currency=k===null?null:fxBreak(k,major(annual.currency),home,rates);
 return currency?{ttm:null,rejected:`Trailing statements ending ${ttm.end} are ${Number(k!.toFixed(2))}× FY${annual.fy} — ${major(annual.currency)}/${currency} scale; not used`}:{ttm,rejected:null};
}

/** An analysis that dropped years because their amounts were not in their label
 * cannot inherit a previously published valuation or price result: those were
 * computed from the mislabelled amounts. */
export function statementCurrencyChanged(analysis:{events?:Array<{kind:string;note:string}>}):boolean {
 return Boolean(analysis.events?.some(e=>e.kind==='currency_change'&&e.note.startsWith('Statement currency changed')));
}
