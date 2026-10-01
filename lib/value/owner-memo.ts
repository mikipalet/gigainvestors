import {modelValue,valuationReturnModel} from './return-model';
import {ownerEarningsBridge} from './owner-earnings';
import type {Analysis,Series,Valuation,Year} from './types';
import type {Evidence} from './judgement/types';
export const MEMO_QUESTIONS = ['How it makes money','Why customers stay','Can it raise prices','Where the cash goes','Are managers owners','What could break it','What the price says'] as const;
export interface MemoLine {question:number;answer:string;evidence:Evidence[];basis:'computed'|'filing';chart?:{label:string;unit:'percent'|'money'|'ratio';points:Series};tone?:'red'|'green'|'neutral'}
export interface OwnerMemo {version:1;asOf:string;lines:MemoLine[];inputHash:string}
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const pct=(n:number)=>`${Number((100*n).toFixed(1))}%`;
export function validMemoSpan(span:string,quote:string,names:string[]):boolean {
 const normalized=(s:string)=>s.replace(/\s+/g,' ').trim();
 const text=normalized(span);
 return !!text&&text.split(' ').length<=12&&normalized(quote).includes(text)&&(/\d/.test(text)||names.some(n=>n.length>1&&text.includes(n)));
}
/** Solve the initial growth rate; keep the original ten-year fade and discount rate. */
export function impliedGrowth(v:Valuation,price:number):number|null {
 if(v.method!=='owner_earnings'||!finite(price)||price<=0)return null;
 const at=(growth:number)=>{const model=valuationReturnModel({...v,growth});return model?modelValue(model,v.discountRate):NaN;};
 let low=-.95,high=1;
 if(!finite(at(low))||at(low)>price||at(high)<price)return null;
 for(let i=0;i<100;i++){const mid=(low+high)/2;if(at(mid)>price)high=mid;else low=mid;}
 return (low+high)/2;
}
export function numericMemo(a:Analysis,years:Year[],price:number|null):MemoLine[] {
 const rows:MemoLine[]=[],ordered=[...years].sort((x,y)=>x.fy-y.fy),last=ordered.at(-1);
 const source=(quote:string,field?:string):Evidence=>({quote,url:(field&&last?.provenance?.[field]?.source?.startsWith('https:')?last.provenance[field].source:null)??a.report?.url??'https://eodhd.com/financial-apis/stock-etfs-fundamental-data-feeds/',filed:a.report?.filed??a.asOf??'',section:'Calculated from annual statements'});
 const add=(question:number,answer:string,quote:string,chart?:MemoLine['chart'])=>{if(answer.split(/\s+/).length<=18)rows.push({question,answer,evidence:[source(quote)],basis:'computed',chart});};
 const margins:Series=ordered.slice(-10).filter(y=>finite(y.revenue)&&y.revenue>0&&finite(y.grossProfit)).map(y=>[y.fy,y.grossProfit!/y.revenue!]);
 if(last&&finite(last.grossProfit)&&finite(last.revenue)&&last.revenue>0&&a.company.kind==='operating'){
  add(1,`Gross margin ${pct(last.grossProfit/last.revenue)} in the latest annual accounts.`, `FY${last.fy}: gross profit ${last.grossProfit}; revenue ${last.revenue}; gross margin = gross profit / revenue.`,{label:'Gross margin, including 2021–23',unit:'percent',points:margins});
 }
 const inflation=margins.filter(([fy])=>fy>=2021&&fy<=2023);
 if(a.company.kind==='operating'&&!a.company.investmentHolding&&inflation.length===3&&new Set(inflation.map(p=>p[0])).size===3){
  const values=inflation.map(p=>p[1]!),floor=Math.min(...values);
  if(floor>=.4&&Math.max(...values)-floor<=.04)add(2,`Gross margin stayed above ${pct(Math.floor(floor*1000)/1000)} through 2021–23 inflation.`,inflation.map(([fy,margin])=>`FY${fy}: gross profit / revenue = ${pct(margin!)}`).join('; '));
 }
 if(last){
  const bridge=ownerEarningsBridge(ordered),current=bridge.at(-1);
  if(a.company.kind==='operating'&&current&&finite(current.value)&&current.value>0&&finite(last.capex)&&finite(last.acquisitions)&&!last.acquisitionsProxy){
   const rate=(Math.max(0,last.capex-current.maintenanceCapex!)+last.acquisitions)/current.value;
   if(finite(rate))add(4,`Growth investment used ${pct(rate)} of owner earnings${finite(a.tests?.economics?.metrics.roiic)?`; incremental return ${pct(a.tests.economics.metrics.roiic)}`:''}.`, `Growth capex = max(0, capex ${last.capex} − upkeep ${current.maintenanceCapex}); acquisitions ${last.acquisitions}; owner earnings ${current.value}.`, {label:'Growth investment / owner earnings',unit:'percent',points:bridge.flatMap(b=>finite(b.value)&&b.value>0&&finite(b.maintenanceCapex)&&finite(b.year.capex)&&finite(b.year.acquisitions)&&!b.year.acquisitionsProxy?[[b.year.fy,(Math.max(0,b.year.capex-b.maintenanceCapex)+b.year.acquisitions)/b.value] as [number,number]]:[])});
  }
  if(!rows.some(r=>r.question===4)&&finite(last.buybacks)&&last.buybacks>0&&finite(last.netIncome)&&last.netIncome>0)add(4,`Annual buybacks used ${pct(last.buybacks/last.netIncome)} of profit.`,`Cash repurchases ${last.buybacks} / net income ${last.netIncome}.`,{label:'Cash repurchases',unit:'money',points:ordered.slice(-10).map(y=>[y.fy,y.buybacks])});
  if(!rows.some(r=>r.question===4)&&finite(last.dividendsPaid)&&last.dividendsPaid>0&&finite(last.netIncome)&&last.netIncome>0)add(4,`Annual dividends distributed ${pct(last.dividendsPaid/last.netIncome)} of profit.`,`Dividends paid ${last.dividendsPaid} / net income ${last.netIncome}.`);
 }
 const relationship=a.businessDepth?.relationships.filter(r=>r.from===a.id&&r.type==='customer'&&r.metric==='revenue'&&finite(r.percent)&&r.evidence.length).sort((a,b)=>b.percent!-a.percent!)[0];
 if(relationship){const answer=`${relationship.name} accounts for ${pct(relationship.percent!)} of revenue.`;if(answer.split(/\s+/).length<=18)rows.push({question:6,answer,evidence:relationship.evidence,basis:'filing',tone:'red'});}
 const oe=(a.series?.ownerEarningsPerShare??[]).filter((p):p is [number,number]=>finite(p[1])).sort((x,y)=>x[0]-y[0]);
 const end=oe.at(-1),start=end?oe.find(p=>p[0]===end[0]-10):null;
 if(a.valuation&&price!==null&&start&&end&&start[1]>0&&end[1]>0){
  const fx=a.valuation.perShareTrading?.fxRate??(a.valuation.currency===a.company.currency?1:null);
  const implied=fx?impliedGrowth(a.valuation,price/fx):null;
  if(implied!==null){const actual=(end[1]/start[1])**.1-1;
   add(7,`Price implies ${pct(implied)} initial growth; ten-year owner earnings/share growth was ${pct(actual)}.`,`Price ${price}; FX ${fx}; discount ${a.valuation.discountRate}; initial growth fades to ${a.valuation.terminalGrowth}. FY${start[0]} earnings/share ${start[1]} → FY${end[0]} ${end[1]}.`,{label:'Owner earnings per share',unit:'money',points:oe.slice(-11)});
  }
 }
 return rows;
}
