import {parseDocument} from 'htmlparser2';
import type {Observation} from './types';
// Use structural typing to avoid adding a dependency merely for DOM traversal.
type Node={type:string;name?:string;data?:string;attribs?:Record<string,string>;children?:Node[];parent?:Node|null};
function descendants(node:Node):Node[]{return (node.children??[]).flatMap(c=>[c,...descendants(c)]);}
const content=(node:Node):string=>node.type==='text'?node.data??'':(node.children??[]).map(content).join(' ');
const clean=(s:string)=>s.replace(/\s+/g,' ').trim();
const tags:Record<string,string[]>={
 capex:['PaymentsToAcquirePropertyPlantAndEquipment','PaymentsToAcquireProductiveAssets'],
 depreciation:['Depreciation','DepreciationExpense'],da:['DepreciationDepletionAndAmortization','DepreciationDepletionAndAmortizationPropertyPlantAndEquipment','DepreciationAmortizationAndAccretionNet'],
 revenue:['RevenueFromContractWithCustomerExcludingAssessedTax','RevenueFromContractWithCustomerIncludingAssessedTax','Revenues','SalesRevenueNet'],
 'cash-total':['CashCashEquivalentsAndShortTermInvestments'],'cash-only':['CashAndCashEquivalentsAtCarryingValue'],'short-investments':['ShortTermInvestments','MarketableSecuritiesCurrent','MarketableSecurities'],
 'debt-total':['LongTermDebtAndFinanceLeaseObligationsIncludingCurrentMaturities','LongTermDebtCurrentAndNoncurrent','LongTermDebtAndCapitalLeaseObligationsIncludingCurrentMaturities'],
 'debt-current':['LongTermDebtAndFinanceLeaseObligationsCurrent','LongTermDebtCurrent','LongTermDebtAndCapitalLeaseObligationsCurrent'],
 'debt-long':['LongTermDebtAndFinanceLeaseObligationsNoncurrent','LongTermDebtNoncurrent','LongTermDebtAndCapitalLeaseObligations'],
 'short-borrowings':['ShortTermBorrowings','ShortTermDebtCurrent','CommercialPaper'],
 goodwill:['Goodwill'],equity:['StockholdersEquity'],receivables:['AccountsReceivableNetCurrent','AccountsNotesAndOtherReceivablesNetCurrent'],inventory:['InventoryNet'],shares:['WeightedAverageNumberOfDilutedSharesOutstanding'],
 'reported-profit':['NetIncomeLoss'],'gross-profit':['GrossProfit'],ocf:['NetCashProvidedByUsedInOperatingActivities'],buybacks:['PaymentsForRepurchaseOfCommonStock'],
};
const wanted=new Set(Object.values(tags).flat());
/** Read facts from the actual filing, preserving its table-row quote and inline units. */
export function inlineObservations(html:string,meta:{url:string;filed:string;period:string}):Observation[]{
 const all=descendants(parseDocument(html) as Node),fiscalNode=all.find(n=>n.attribs?.name==='dei:DocumentFiscalYearFocus'),fiscalYear=fiscalNode?Number(clean(content(fiscalNode))):Number(meta.period.slice(0,4)),contexts=new Map<string,{start?:string;end:string}>(),units=new Map<string,string>();
 for(const n of all){
  if(n.name?.endsWith(':context')&&n.attribs?.id){
   const children=descendants(n);if(children.some(c=>c.name?.endsWith(':segment')||c.name?.endsWith(':scenario')))continue;
   const end=children.find(c=>c.name?.endsWith(':enddate')||c.name?.endsWith(':instant')),start=children.find(c=>c.name?.endsWith(':startdate'));
   if(end)contexts.set(n.attribs.id,{end:clean(content(end)),start:start?clean(content(start)):undefined});
  }
  if(n.name?.endsWith(':unit')&&n.attribs?.id){const text=clean(content(n));if(/^iso4217:[A-Z]{3}$/.test(text))units.set(n.attribs.id,text.slice(-3));else if(/(^|:)shares$/i.test(text))units.set(n.attribs.id,'shares');}
 }
 const facts=new Map<string,Array<Observation & {precision:number}>>();
 for(const n of all){
  if(n.name!=='ix:nonfraction'||!n.attribs)continue;
  const a=n.attribs,tag=a.name?.replace(/^us-gaap:/,'');if(!a.name?.startsWith('us-gaap:')||!wanted.has(tag)||a['xsi:nil']==='true')continue;
  const ctx=contexts.get(a.contextref),unit=units.get(a.unitref);if(!ctx||!unit||ctx.end>meta.period)continue;
  if(ctx.start){const days=(Date.parse(ctx.end)-Date.parse(ctx.start))/86400000;if(days<300||days>380)continue;}
  const plain=clean(content(n)).replace(/[,\s]/g,'');let value=Number(plain.replace(/[()]/g,''))*10**Number(a.scale??0);
  if(a.sign==='-'||/^\(/.test(plain))value=-value;
  if(!Number.isFinite(value)||!/[0-9]/.test(plain))continue;
  // Fiscal label aligns comparative end dates to the issuer's current fiscal year.
  const fy=fiscalYear-Math.round((Date.parse(meta.period)-Date.parse(ctx.end))/(365.25*86400000));
  const ancestors:Node[]=[];let ancestor:Node|undefined|null=n;while(ancestor){ancestors.push(ancestor);ancestor=ancestor.parent;}
  const row=ancestors.find(p=>p.name==='tr')??ancestors.find(p=>(p.name==='p'||p.name==='div')&&clean(content(p)).length>35)??n;
  const quote=clean(content(row));if(quote.length>6000||!quote)continue;
  const observation:Observation & {precision:number}={precision:a.decimals==='INF'||a.decimals===undefined?Infinity:Number(a.decimals),metric:tag,value,fy,currency:unit,evidence:{quote,url:meta.url,filed:meta.filed,section:`${tag} · FY${fy} · ${unit}; inline XBRL scale ${a.scale??0}`}};
  const key=`${tag}|${fy}`;facts.set(key,[...facts.get(key)??[],observation]);
 }
 const selected:Observation[]=[];
 for(const [metric,alternatives]of Object.entries(tags))for(const fy of new Set([...facts.values()].flat().map(o=>o.fy))){
  for(const tag of alternatives){const list=facts.get(`${tag}|${fy}`);if(!list)continue;
   const sorted=[...list].sort((a,b)=>b.precision-a.precision),best=sorted[0];
   if(sorted.some(o=>o.currency!==best.currency||Math.abs(o.value-best.value)>((Number.isFinite(o.precision)?10**(-o.precision)/2:0)+(Number.isFinite(best.precision)?10**(-best.precision)/2:0))))break;
   const {precision,...observation}=best;selected.push({...observation,metric});break;
  }
 }
 const output=selected.filter(o=>!['cash-total','cash-only','short-investments','debt-total','debt-current','debt-long','short-borrowings','gross-profit'].includes(o.metric));
 for(const fy of new Set(selected.map(o=>o.fy))){
  const get=(metric:string)=>selected.find(o=>o.fy===fy&&o.metric===metric);
  function sum(metric:string,parts:Array<Observation|undefined>){
   if(parts.some(p=>!p)||new Set(parts.map(p=>p!.currency)).size!==1)return;
   const nonNull=parts as Observation[];
   output.push({...nonNull[0],metric,value:nonNull.reduce((n,p)=>n+p.value,0),evidence:{...nonNull[0].evidence,quote:[...new Set(nonNull.map(p=>p.evidence.quote))].join('\n[…]\n'),section:nonNull.map(p=>p.evidence.section).join(' + ')}});
  }
  if(get('cash-total'))sum('cash',[get('cash-total')]);else if(get('short-investments'))sum('cash',[get('cash-only'),get('short-investments')]);else sum('cash',[get('cash-only')]);
  // A total debt tag excludes standalone commercial paper: include it when explicitly disclosed.
  if(get('debt-total'))sum('debt',[get('debt-total'),...(get('short-borrowings')?[get('short-borrowings')]:[])]);
  else sum('debt',[get('debt-current'),get('debt-long'),...(get('short-borrowings')?[get('short-borrowings')]:[])]);
  const gross=get('gross-profit'),revenue=get('revenue');if(gross&&revenue&&revenue.value>0&&gross.currency===revenue.currency)output.push({...gross,metric:'gross-margin',value:gross.value/revenue.value});
 }
 return output;
}
