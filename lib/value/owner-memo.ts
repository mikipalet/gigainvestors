import {modelValue,valuationReturnModel} from './return-model';
import {ownerEarningsBridge} from './owner-earnings';
import {median,roiic} from './metrics';
import type {Analysis,PriceMap,Series,Valuation,Year} from './types';
import type {Evidence} from './judgement/types';
export const MEMO_QUESTIONS = ['How it makes money','Why customers stay','Can it raise prices','Where the cash goes','Are managers owners','What could break it','What the price says'] as const;
export interface MemoCapitalYear {fy:number;currency:string;reinvestmentRate?:number;reinvestmentBasis?:'growth_capex'|'growth_capex_and_cash_acquisitions';incrementalReturn?:number;buybacks?:number;dividendsPaid?:number;repurchase?:{currency:string;paidPerShare:number;valuePerShare:number;premium:number;basis:'historical_value_at_current_rates'}}
export interface MemoLine {capitalAllocation?:MemoCapitalYear[];question:number;answer:string;evidence:Evidence[];basis:'computed'|'filing';chart?:{label:string;unit:'percent'|'money'|'ratio';points:Series};tone?:'red'|'green'|'neutral'}
export interface OwnerMemo {version:1;asOf:string;lines:MemoLine[];inputHash:string}
export interface MemoFacts {
 moat?:{type:string;evidence:Evidence};
 product?:string; productEvidence?:Evidence;
 insiderPercent?:number; insiderEvidence?:Evidence;
 control?:{name:string;percent:number;kind:'votes'|'shares';evidence:Evidence};
 segment?:{name:string;share:number;fy:number;metric?:string;evidence:Evidence};
 repurchases?:Array<{fy:number;paidPerShare:number;currency:string;evidence:Evidence}>;
}
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const pct=(n:number)=>`${Number((100*n).toFixed(1))}%`;
const amount=(n:number)=>{const [scale,suffix]=Math.abs(n)>=1e12?[1e12,'tn']:Math.abs(n)>=1e9?[1e9,'bn']:Math.abs(n)>=1e6?[1e6,'m']:[1,''];return `${Number((n/Number(scale)).toFixed(1))}${suffix}`;};
export function validMemoSpan(span:string,quote:string,names:string[]):boolean {
 const normalized=(s:string)=>s.replace(/\s+/g,' ').trim();
 const text=normalized(span);
 return !!text&&text.split(' ').length<=12&&normalized(quote).includes(text)&&(/\d/.test(text)||names.some(n=>n.length>1&&text.includes(n)));
}
/** Invert only an existing operating valuation. Its normalization, cash, fade,
 * terminal growth and discount rate remain fixed. No synthetic bank DCF. */
export function impliedGrowth(v:Valuation,price:number):number|null {
 if(v.method!=='owner_earnings'||!finite(price)||price<=0)return null;
 const at=(growth:number)=>{const model=valuationReturnModel({...v,growth});return model?modelValue(model,v.discountRate):NaN;};
 let low=-.999999,high=1;
 while(finite(at(high))&&at(high)<price&&high<1024)high*=2;
 if(!finite(at(low))||!finite(at(high))||at(low)>price||at(high)<price)return null;
 for(let i=0;i<100;i++){const mid=(low+high)/2;if(at(mid)>price)high=mid;else low=mid;}
 return (low+high)/2;
}
export function numericMemo(a:Analysis,years:Year[],price:number|null,facts:MemoFacts={}):MemoLine[] {
 const rows:MemoLine[]=[],ordered=[...years].sort((x,y)=>x.fy-y.fy),last=ordered.at(-1);
 const source=(quote:string,year=last,field?:string):Evidence=>({quote,url:(field&&year?.provenance?.[field]?.source?.startsWith('https:')?year.provenance[field].source:null)??(field&&year?.end===a.report?.period?a.report?.url:null)??'https://eodhd.com/financial-apis/stock-etfs-fundamental-data-feeds/',filed:a.report?.filed??a.asOf??'',section:'Calculated from annual statements'});
 const add=(question:number,answer:string,evidence:Evidence[],chart?:MemoLine['chart'])=>{if(answer.split(/\s+/).length<=18&&/\d/.test(answer))rows.push({question,answer,evidence,basis:'computed',chart});};
 const operating=a.company.kind==='operating'&&!a.company.investmentHolding;
 const marginField=last&&finite(last.grossProfit)&&operating?'grossProfit':'operatingIncome';
 const margins:Series=ordered.filter(y=>finite(y.revenue)&&y.revenue>0&&finite(y[marginField])).map(y=>[y.fy,y[marginField]!/y.revenue!]);
 const marginName=marginField==='grossProfit'?'gross':'operating';
 if(last&&finite(last.revenue)&&last.revenue>0){
  const margin=operating&&finite(last[marginField])?`${marginName} margin ${pct(last[marginField]!/last.revenue)}`:'';
  const segment=facts.segment?.fy===last.fy&&finite(facts.segment.share)&&facts.segment.share>=0&&facts.segment.share<=1?facts.segment:null;
  const product=facts.product??a.company.industry??a.company.sector??'Sales';
  const description=segment?`${segment.name} ${pct(segment.share)} of ${segment.metric??'sales'}`:`${product}; revenue ${a.reportingCurrency??last.currency??a.company.currency} ${amount(last.revenue)}`;
  const evidence=[source(`FY${last.fy}: revenue ${last.revenue}${operating&&finite(last[marginField])?`; ${marginField} ${last[marginField]}; margin = ${marginField} / revenue`:''}.`,last,'revenue'),...(segment?[segment.evidence]:facts.productEvidence?[facts.productEvidence]:[])];
  add(1,`${description}${margin?`; ${margin}`:''}.`,evidence,operating&&margins.length?{label:`${marginName==='gross'?'Gross':'Operating'} margin`,unit:'percent',points:margins.slice(-10)}:undefined);
 }
 const inflation=margins.filter(([fy])=>fy>=2021&&fy<=2023);
 const capitalKey=operating?'roic':'roe',capitalLabel=operating?'ROIC':'return on tangible equity';
 const capitalWindow=(a.tests?.moat?.series?.[capitalKey]??[]).slice(-10);
 const capitalSeries=capitalWindow.filter((p):p is [number,number]=>finite(p[1]));
 const capitalYears=capitalWindow.length?capitalWindow.at(-1)![0]-capitalWindow[0][0]+1:0;
 const capital=median(capitalSeries.map(p=>p[1]));
 const parts:string[]=[],stayEvidence:Evidence[]=[];
 if(operating&&inflation.length===3&&new Set(inflation.map(p=>p[0])).size===3){
  const values=inflation.map(p=>p[1]!);
  parts.push(`2021–23 ${marginName} margins ${pct(Math.min(...values))}–${pct(Math.max(...values))}`);
  for(const [fy,m]of inflation)stayEvidence.push(source(`FY${fy}: ${marginField} / revenue = ${pct(m!)}.`,ordered.find(y=>y.fy===fy),marginField));
 }
 if(capital!==null){
  parts.push(`${capitalYears}-year median ${capitalLabel} ${pct(capital)}`);
  stayEvidence.push(source(`${capitalLabel} observations ${JSON.stringify(capitalSeries)}; median ${capital}. ROIC follows the displayed moat series; financial companies use return on tangible equity.`));
 }
 const moat=facts.moat;
 if(moat&&parts.join(' ').split(/\s+/).length+moat.type.split(/\s+/).length+1<=18){parts.push(`${moat.type} advantage`);stayEvidence.push(moat.evidence);}
 if(parts.length)add(2,parts.join('; ')+'.',stayEvidence,{label:capitalLabel,unit:'percent',points:capitalSeries});
 if(last){
  const bridge=ownerEarningsBridge(ordered),current=bridge.at(-1),cashParts:string[]=[],cashEvidence:Evidence[]=[],rates:Series=[];
  for(const b of bridge.slice(-10))if(operating&&finite(b.value)&&b.value>0&&finite(b.maintenanceCapex)&&finite(b.year.capex)){
   const growth=Math.max(0,b.year.capex-b.maintenanceCapex),acquisitions=finite(b.year.acquisitions)&&!b.year.acquisitionsProxy?b.year.acquisitions:null;
   rates.push([b.year.fy,(growth+(acquisitions??0))/b.value]);
   cashEvidence.push(source(`FY${b.year.fy}: growth capex ${growth}; upkeep ${b.maintenanceCapex}; ${acquisitions===null?'':`cash acquisitions ${acquisitions}; `}owner earnings ${b.value}. ${acquisitions===null?'Growth capex / owner earnings':'Growth capex plus acquisitions / owner earnings'} = ${rates.at(-1)![1]}.`,b.year,'capex'));
  }
  const rate=rates.find(p=>p[0]===last.fy)?.[1];
  if(operating&&finite(rate)&&current){const complete=finite(last.acquisitions)&&!last.acquisitionsProxy;cashParts.push(`${complete?'Reinvestment':'Growth capex/earnings'} ${pct(rate)}`);}
  const incremental=a.tests?.economics?.metrics?.roiic;
  if(operating&&finite(incremental)){cashParts.push(`incremental return ${pct(incremental)}`);cashEvidence.push(source(`Incremental return on capital ${incremental}, from the economics test's unchanged annual inputs.`));}
  const dividends=ordered.slice(-10).filter(y=>finite(y.dividendsPaid)&&(y.dividendsPaid!>0||y.provenance?.dividendsPaid?.method==='absent-in-complete-statement'||y.statementCoverage?.cashFlow));
  if(dividends.length){cashParts.push(`dividends ${dividends.filter(y=>y.dividendsPaid!>0).length}/${dividends.length} years`);cashEvidence.push(source(`Dividend observations: ${JSON.stringify(dividends.map(y=>[y.fy,y.dividendsPaid]))}. Zero only counted when supported by a complete cash-flow statement.`));}
  const purchases=(facts.repurchases??[]).flatMap(p=>{
   const value=a.valueHistory?.find(v=>v[0]===p.fy)?.[2];
   if(p.currency!==a.company.currency||!finite(value)||value<=0||!finite(p.paidPerShare)||p.paidPerShare<=0)return [];
   const premium=p.paidPerShare/value-1;
   cashEvidence.push({...p.evidence,section:'Calculated repurchase comparison',quote:`${p.evidence.quote} FY${p.fy}: paid/share ${p.paidPerShare} ${p.currency}; our historic value/share ${value} ${p.currency}; premium ${premium}. Historic values use today's bond yield and FX, not a point-in-time investment signal.`});
   return [{fy:p.fy,premium}];
  }).sort((x,y)=>x.fy-y.fy);
  const purchase=purchases.at(-1);
  if(purchase)cashParts.push(`${purchase.fy} buybacks ${pct(Math.abs(purchase.premium))} ${purchase.premium>=0?'above':'below'} value`);
  else if(finite(last.buybacks)&&last.buybacks>0){cashParts.push(`buybacks ${amount(last.buybacks)}`);cashEvidence.push(source(`FY${last.fy}: cash repurchases ${last.buybacks} ${a.reportingCurrency??last.currency??a.company.currency}.`,last,'buybacks'));}
  // Drop whole optional clauses, never truncate an answer mid-fact.
  while(cashParts.join('; ').split(/\s+/).length>18)cashParts.splice(purchase?cashParts.length-2:cashParts.length-1,1);
  if(cashParts.length){
   add(4,cashParts.join('; ')+'.',cashEvidence,rates.length?{label:'Growth investment / owner earnings',unit:'percent',points:rates}:undefined);
   const line=rows.find(l=>l.question===4);
   if(line)line.capitalAllocation=ordered.slice(-10).map(y=>{
    const rate=rates.find(p=>p[0]===y.fy)?.[1],incremental=roiic(ordered.filter(p=>p.fy<=y.fy));
    const paid=facts.repurchases?.find(p=>p.fy===y.fy&&p.currency===a.company.currency),value=a.valueHistory?.find(p=>p[0]===y.fy)?.[2];
    return {fy:y.fy,currency:a.reportingCurrency??y.currency??a.company.currency,
     ...(finite(rate)?{reinvestmentRate:rate,reinvestmentBasis:finite(y.acquisitions)&&!y.acquisitionsProxy?'growth_capex_and_cash_acquisitions' as const:'growth_capex' as const}:{}),
     ...(operating&&finite(incremental)?{incrementalReturn:incremental}:{}),
     ...(finite(y.buybacks)?{buybacks:y.buybacks}:{}),...(finite(y.dividendsPaid)?{dividendsPaid:y.dividendsPaid}:{}),
     ...(paid&&finite(value)&&value>0?{repurchase:{currency:paid.currency,paidPerShare:paid.paidPerShare,valuePerShare:value,premium:paid.paidPerShare/value-1,basis:'historical_value_at_current_rates' as const}}:{}),
    };
   });
  }
 }
 if(finite(facts.insiderPercent)&&facts.insiderPercent>=0&&facts.insiderPercent<=100){
  const evidence=facts.insiderEvidence??source(`EODHD SharesStats.PercentInsiders ${facts.insiderPercent}; provider percentage points, not a fractional ratio.`);
  const control=facts.control;
  add(5,`Insiders own ${facts.insiderPercent>0&&facts.insiderPercent<.05?'<0.1%':pct(facts.insiderPercent/100)}${control?`; ${control.name}: ${pct(control.percent/100)} ${control.kind==='votes'?'voting power':'shareholding'}`:''}.`,[evidence,...(control?[control.evidence]:[])]);
 }
 const oe=(a.series?.ownerEarningsPerShare??[]).filter((p):p is [number,number]=>finite(p[1])).sort((x,y)=>x[0]-y[0]);
 const end=oe.at(-1),start=end?oe.find(p=>p[0]===end[0]-10):null;
 if(a.valuation&&price!==null){
  const fx=a.valuation.perShareTrading?.fxRate??(a.valuation.currency===a.company.currency?1:null);
  const implied=finite(fx)&&fx>0?impliedGrowth(a.valuation,price/fx):null;
  if(finite(fx)&&fx>0&&a.valuation.method==='book_value'&&a.valuation.financialReturn&&price>0&&price/fx<4*a.valuation.normalized){
   const v=a.valuation,growth=v.discountRate-v.financialReturn!.cashPerShare/(price/fx);
   const model=valuationReturnModel({...v,growth});
   if(growth> -1&&model&&Math.abs(modelValue(model,v.discountRate)-price/fx)<1e-7*Math.max(1,price/fx))add(7,`Price implies ${pct(growth)} perpetual growth in our book-value model.`,[source(`Price ${price}; FX ${fx}; original perpetual distributable cash ${v.financialReturn!.cashPerShare}; discount ${v.discountRate}; growth ${growth}. Same book-value model and 4× ceiling; no ten-year operating fade applies.`)]);
  }
  if(finite(fx)&&fx>0&&a.valuation.method==='nav'&&a.valuation.normalized>0&&price>0){
   const v=a.valuation,growth=(price/fx/v.normalized)**.1*(1+v.discountRate)-1;
   add(7,`Price implies ${pct(growth)} annual NAV growth over ten years.`,[source(`Price ${price}; FX ${fx}; reported NAV ${v.normalized}; ten-year realization discounted at ${v.discountRate}; required annual NAV growth ${growth}.`)]);
  }
  if(implied!==null){
   const actual=start&&end&&start[1]>0&&end[1]>0?(end[1]/start[1])**.1-1:null;
   const comparison=actual!==null?`; ten-year earnings/share growth ${pct(actual)}`:'';
   add(7,`Price implies ${pct(implied)} initial growth over ten years${comparison}.`,[source(`Price ${price}; FX ${fx}; discount ${a.valuation.discountRate}; same ${a.valuation.tier??'standard'} ten-year fade to terminal ${a.valuation.terminalGrowth}. ${start&&end?`FY${start[0]} owner earnings/share ${start[1]} → FY${end[0]} ${end[1]}.`:''}`)],{label:'Owner earnings per share',unit:'money',points:oe.slice(-11)});
  }
 }
 return rows.sort((x,y)=>x.question-y.question);
}

/** Publication can change quotes, currency conversion or withhold a valuation.
 * Reprice the memo from that final public model, preserving all other answers. */
export function memoAtPrice(a:Analysis,quote?:PriceMap[string]|null):OwnerMemo|undefined {
 if(!a.ownerMemo)return undefined;
 const priceLine=quote?numericMemo(a,[],quote[0]).find(l=>l.question===7):undefined;
 if(priceLine)priceLine.evidence[0].quote+=` Closing-price date ${quote![1]}.`;
 return {...a.ownerMemo,lines:[...a.ownerMemo.lines.filter(l=>l.question!==7),...(priceLine?[priceLine]:[])].sort((x,y)=>x.question-y.question)};
}
