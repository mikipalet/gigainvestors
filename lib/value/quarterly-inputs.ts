import { sameCurrency } from './currency';
import { FIELD_TAGS, type CompanyFacts } from './completeness/second-sources';
import type { Year } from './types';

const validDate=(s:unknown):s is string=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s));
/** End-date placeholders are not filing dates. The conservative fallback is 90 days. */
export function availableOn(end:string,filed?:string):string {
 return validDate(filed)&&filed>end?filed:new Date(Date.parse(end)+90*86400000).toISOString().slice(0,10);
}
const record=(x:unknown):Record<string,any>=>x&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,any>:{};
const number=(x:unknown):number|null=>x==null||x===''||typeof x==='boolean'||!Number.isFinite(Number(x))?null:Number(x);
const FLOW_KEYS=['revenue','netIncome','totalNetIncome','da','capex','sbc','ocf','leaseCash','nonRecurring'] as const;
export type Interim = {end:string;filed:string;months:3|6;currency:string;source:string;flows:Partial<Record<typeof FLOW_KEYS[number],number|null>>};

/** Provider sometimes pads half-year reporters with synthetic Q1/Q3 averages.
 * Two reported halves matching annual revenue identify those rows; ignore fillers. */
export function halfYearReporter(financials:Record<string,any>):boolean {
 const income=record(financials.Income_Statement),quarterly=record(income.quarterly);
 let matches=0,observations=0;
 for(const [end,annual] of Object.entries(record(income.yearly))){
  const before=new Date(Date.UTC(Number(end.slice(0,4)),Number(end.slice(5,7))-6,0));
  const middle=Object.keys(quarterly).find(e=>e.slice(0,7)===before.toISOString().slice(0,7));
  const total=number(record(annual).totalRevenue),a=number(record(quarterly[end]).totalRevenue),b=middle?number(record(quarterly[middle]).totalRevenue):null;
  if(total&&a!=null&&b!=null){observations++;if(Math.abs(a+b-total)/Math.abs(total)<.02)matches++;}
 }
 return observations>=2&&matches/observations>.7;
}
export function eodInterims(raw:unknown,frequency?:3|6):Interim[] {
 const financials=record(record(raw).Financials),incomes=record(record(financials.Income_Statement).quarterly),flows=record(record(financials.Cash_Flow).quarterly);
 const months=frequency??(halfYearReporter(financials)?6:3);
 const annualEnds=Object.keys(record(record(financials.Income_Statement).yearly));
 const fiscalMonth=annualEnds.sort().at(-1)?.slice(5,7)??'12';
 return Object.keys(incomes).filter(validDate).sort().flatMap(end=>{
  if(months===6&&(Number(end.slice(5,7))-Number(fiscalMonth))%6!==0)return [];
  const income=record(incomes[end]),cash=record(flows[end]);
  if(!Object.keys(cash).length)return [];
  const dates=[availableOn(end,income.filing_date),availableOn(end,cash.filing_date)];
  const capex=number(cash.capitalExpenditures);
  return [{end,filed:dates.sort().at(-1)!,months,currency:income.currency_symbol??cash.currency_symbol??'',source:'EODHD',flows:{
   revenue:number(income.totalRevenue),netIncome:number(income.netIncome),totalNetIncome:number(income.netIncomeIncludingNoncontrollingInterests),
   da:number(income.depreciationAndAmortization)??number(income.reconciledDepreciation)??number(cash.depreciationAndAmortization)??number(cash.depreciation),
   capex:capex===null?null:Math.abs(capex),sbc:number(cash.stockBasedCompensation),ocf:number(cash.totalCashFromOperatingActivities),leaseCash:number(cash.leasePayments),nonRecurring:null,
  }}];
 });
}

/** Earliest annual filing in companyfacts, excluding interim comparative facts. */
export function secAnnualFilings(raw:CompanyFacts):Record<string,string> {
 const dates:Record<string,string>={};
 for(const ns of Object.values(raw.facts??{}))for(const tag of FIELD_TAGS.netIncome)for(const facts of Object.values(ns[tag]?.units??{}))for(const f of facts){
  const days=f.start?(Date.parse(f.end)-Date.parse(f.start))/86400000:0;
  if(!validDate(f.filed)||f.filed<=f.end||days<330||days>400||! /^(10-K|20-F|40-F)(\/A)?$/.test(f.form??''))continue;
  if(!dates[f.end]||f.filed<dates[f.end])dates[f.end]=f.filed;
 }
 return dates;
}

/** Latest filing version available at the cutoff; YTD cash flows are differenced
 * against the preceding YTD, never summed as though each were a quarter. */
export function secInterims(raw:CompanyFacts,currency:string,cutoff:string):Interim[] {
 type Fact={start?:string;end:string;filed?:string;val:number;form?:string};
 const fields=new Map<string,Map<string,{value:number;filed:string}>>();
 for(const key of FLOW_KEYS){
  const values=new Map<string,{value:number;filed:string}>();fields.set(key,values);
  for(const tag of FIELD_TAGS[key]??[])for(const ns of Object.values(raw.facts??{})){
   const facts=(ns[tag]?.units[currency]??[]).filter((f):f is Fact&{start:string;filed:string}=>!!f.start&&!!f.filed&&f.filed<cutoff&&f.filed>f.end&&/^(10-K|10-Q|20-F|40-F)(\/A)?$/.test(f.form??'')&&Number.isFinite(f.val));
   const versions=new Map<string,typeof facts[number]>();
   for(const f of facts){const id=`${f.start}/${f.end}`;if(!versions.has(id)||versions.get(id)!.filed<f.filed)versions.set(id,f);}
   for(const f of versions.values()){
    if(values.has(f.end))continue;
    const days=(Date.parse(f.end)-Date.parse(f.start))/86400000;
    let value:number|null=days>=70&&days<=110?f.val:null,filed=f.filed;
    if(days>110&&days<=380){
     const prior=[...versions.values()].filter(p=>p.start===f.start&&p.end<f.end&&(Date.parse(f.end)-Date.parse(p.end))/86400000>=70&&(Date.parse(f.end)-Date.parse(p.end))/86400000<=110).sort((a,b)=>b.end.localeCompare(a.end))[0];
     if(prior){value=f.val-prior.val;filed=[filed,prior.filed].sort().at(-1)!;}
    }
    if(value!==null)values.set(f.end,{value:key==='capex'?Math.abs(value):value,filed});
   }
  }
 }
 const ends=[...new Set([...fields.values()].flatMap(m=>[...m.keys()]))].sort();
 return ends.flatMap(end=>{
  const income=fields.get('netIncome')?.get(end),da=fields.get('da')?.get(end),capex=fields.get('capex')?.get(end);
  if(!income||!da||!capex)return [];
  const facts=FLOW_KEYS.map(k=>fields.get(k)?.get(end));
  return [{end,filed:facts.flatMap(f=>f?[f.filed]:[]).sort().at(-1)!,months:3,currency,source:'SEC',flows:Object.fromEntries(FLOW_KEYS.map((k,i)=>[k,facts[i]?.value??null]))}];
 });
}

export function trailingAt(inputs:Interim[],annual:Year,cutoff:string):{year:Year;periods:Interim[]}|null {
 const eligible=inputs.filter(p=>p.filed<cutoff&&p.end<cutoff&&(!p.currency||!annual.currency||sameCurrency(p.currency,annual.currency)));
 const candidates:Array<{year:Year;periods:Interim[]}>=[];
 for(const months of [3,6] as const){
  const sorted=[...new Map(eligible.filter(p=>p.months===months).sort((a,b)=>a.filed.localeCompare(b.filed)).map(p=>[p.end,p])).values()].sort((a,b)=>a.end.localeCompare(b.end));
  const periods=sorted.slice(-12/months);
  if(periods.length!==12/months||periods.at(-1)!.end<=annual.end)continue;
  if(periods.some((p,i)=>i>0&&Math.abs((Date.parse(p.end)-Date.parse(periods[i-1].end))/86400000-months*30.4375)>20))continue;
  // Carry balance/lease context, never annual cash flows or judgement overrides.
  const year={...annual,end:periods.at(-1)!.end};
  delete year.maintenanceCapexJudgement;delete year.marginOperatingIncomeJudgement;delete year.acquisitionIssuanceJudgement;delete year.disclosedMaintenanceCapex;
  for(const key of FLOW_KEYS){
   const values=periods.map(p=>p.flows[key]);
   year[key]=values.some(v=>v==null)?null:values.reduce<number>((s,v)=>s+v!,0);
   if(key==='totalNetIncome'&&annual.totalNetIncome===undefined&&values.every(v=>v==null))delete year.totalNetIncome;
   if(key==='sbc'&&values.some(v=>v!=null)){year.sbc=values.reduce<number>((s,v)=>s+(v??0),0);year.sbcIncomplete=values.some(v=>v==null);}
  }
  // Income and cash flow are necessary to claim a complete trailing observation.
  if(year.netIncome===null||year.da===null||year.capex===null)continue;
  candidates.push({year,periods});
 }
 return candidates.sort((a,b)=>a.year.end.localeCompare(b.year.end)).at(-1)??null;
}
