import {officerOwnership} from './business/ownership';
import {validMemoAnswer,validMemoLine,consistentMemoLines} from './business/memo-validation';
import {modelValue,valuationReturnModel} from './return-model';
import {ownerEarningsBridge} from './owner-earnings';
import {median,roiic} from './metrics';
import type {Analysis,PriceMap,Series,Valuation,Year} from './types';
import type {Evidence} from './judgement/types';
export const MEMO_QUESTIONS = ['How it makes money','Why customers stay','Can it raise prices','Where the cash goes','Are managers owners','What could break it','What the price says'] as const;
export interface MemoCapitalYear {fy:number;currency:string;reinvestmentRate?:number;reinvestmentBasis?:'growth_capex'|'growth_capex_and_cash_acquisitions';incrementalReturn?:number;buybacks?:number;dividendsPaid?:number;repurchase?:{currency:string;paidPerShare:number;valuePerShare:number;premium:number;basis:'historical_value_at_current_rates'}}
export interface MemoLine {capitalAllocation?:MemoCapitalYear[];question:number;answer:string;evidence:Evidence[];basis:'computed'|'filing';chart?:{label:string;unit:'percent'|'money'|'ratio';points:Series};tone?:'red'|'green'|'neutral'}
export interface OwnerMemo {version:1;asOf:string;lines:MemoLine[];inputHash:string;priceFx?:number;priceReference?:MemoPriceReference;priceQuote?:MemoPriceQuote}
export interface MemoPriceQuote {quote:PriceMap[string];label:string;evidence:Evidence}
export interface MemoPriceReference {value:number;currency:string;asOf:string;evidence:Evidence}
export interface MemoFacts {
 verifiedGrossMargin?:{fy:number;ratio:number;evidence:Evidence};
 priceReference?:MemoPriceReference;priceQuote?:MemoPriceQuote;
 moat?:{type:string;evidence:Evidence};
 product?:string; productEvidence?:Evidence;
 insiderPercent?:number; insiderEvidence?:Evidence;
 control?:{name:string;percent:number;kind:'votes'|'shares';evidence:Evidence};
 segment?:{name:string;share:number;fy:number;metric?:string;evidence:Evidence};
 repurchases?:Array<{fy:number;paidPerShare:number;currency:string;evidence:Evidence}>;
}
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const pct=(n:number)=>`${Number((100*n).toFixed(1))}%`;
const returnPct=(n:number)=>n>1?'over 100%':pct(n);
const amount=(n:number)=>{const [scale,suffix]=Math.abs(n)>=1e12?[1e12,' trillion']:Math.abs(n)>=1e9?[1e9,' billion']:Math.abs(n)>=1e6?[1e6,' million']:[1,''];return `${Number((n/Number(scale)).toFixed(1))}${suffix}`;};
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
/** Compound average of all ten model years; comparable to observed ten-year CAGR. */
export function impliedAverageGrowth(v:Valuation,price:number):number|null {
 const initial=impliedGrowth(v,price);
 if(initial===null)return null;
 const model=valuationReturnModel({...v,growth:initial});
 return model&&v.normalized>0&&v.shares>0?(model.annual[9]/(v.normalized/v.shares))**.1-1:null;
}
export function numericMemo(a:Analysis,years:Year[],price:number|null,facts:MemoFacts={}):MemoLine[] {
 const alternate=price===null?a.ownerMemo?.priceQuote:undefined;
 if(alternate)price=alternate.quote[0];
 const rows:MemoLine[]=[],ordered=[...years].sort((x,y)=>x.fy-y.fy),last=ordered.at(-1);
 const source=(quote:string,year=last,field?:string):Evidence=>({quote,url:(field&&year?.provenance?.[field]?.source?.startsWith('https:')?year.provenance[field].source:null)??(field&&year?.end===a.report?.period?a.report?.url:null)??'https://eodhd.com/financial-apis/stock-etfs-fundamental-data-feeds/',filed:a.report?.filed??a.asOf??'',section:'Calculated from annual statements'});
 const add=(question:number,answer:string,evidence:Evidence[],chart?:MemoLine['chart'])=>{if(question===7&&alternate){answer=answer.replace(/^The price/,`The ${alternate.label} price`);evidence=[...evidence,alternate.evidence];}if(validMemoAnswer(answer))rows.push({question,answer,evidence,basis:'computed',chart});};
 const operating=a.company.kind==='operating'&&!a.company.investmentHolding;
 const marginField=last&&finite(last.grossProfit)&&operating?'grossProfit':'operatingIncome';
 const margins:Series=ordered.filter(y=>finite(y.revenue)&&y.revenue>0&&finite(y[marginField])).map(y=>[y.fy,y[marginField]!/y.revenue!]);
 const marginName=marginField==='grossProfit'?'gross':'operating';
 if(last&&finite(last.revenue)&&last.revenue>0){
  const ratio=operating&&finite(last[marginField])?last[marginField]!/last.revenue:null;
  const marginSupported=!facts.verifiedGrossMargin||facts.verifiedGrossMargin.fy!==last.fy||ratio!==null&&Math.abs(ratio-facts.verifiedGrossMargin.ratio)<=.0005;
  const margin=marginSupported&&ratio!==null&&ratio>=0&&ratio<=1?`keeps ${Number((ratio*100).toFixed(1))} cents per sales dollar after ${marginField==='grossProfit'?'product':'operating'} costs`:'';
  const segment=facts.segment?.fy===last.fy&&finite(facts.segment.share)&&facts.segment.share>=0&&facts.segment.share<=1?facts.segment:null;
  // Vendor descriptions are unbounded prose, not reliable product noun phrases.
  const industry=a.company.industry??a.company.sector??'';
  const product=/^banks?\s*-\s*regional$/i.test(industry)?'regional banking':/^banks?\s*-\s*diversified$/i.test(industry)?'diversified banking':/^reit\b/i.test(industry)?'property rentals':industry.replace(/\s+-\s+/g,' ');
  const description=segment?.metric?.includes('interdivision')?`Sales from ${segment.name} bring ${pct(segment.share)} of revenue, including sales between divisions`:segment?`Gets ${pct(segment.share)} of ${segment.metric??'sales'} from ${segment.name==='Americas'?'the Americas':segment.name}`:`${product&&!/^(other|unknown|general)$/i.test(product)?`Operates in ${product.toLowerCase()}; annual sales are`:'Annual sales are'} ${a.reportingCurrency||last.currency||a.company.currency} ${amount(last.revenue)}`;
  const evidence=[source(`FY${last.fy}: revenue ${last.revenue}${operating&&finite(last[marginField])?`; ${marginField} ${last[marginField]}; margin = ${marginField} / revenue`:''}.`,last,'revenue'),...(segment?[segment.evidence]:facts.productEvidence?[facts.productEvidence]:[])];
  add(1,`${description}${segment&&margin&&`${description}; ${margin}.`.split(/\s+/).length<=18?`; ${margin}`:''}.`,evidence,operating&&margins.length?{label:`${marginName==='gross'?'Gross':'Operating'} margin`,unit:'percent',points:margins.slice(-10)}:undefined);
 }
 const inflation=margins.filter(([fy])=>fy>=2021&&fy<=2023);
 const capitalKey=operating?'roic':'roe',capitalLabel=operating?'return on capital':'return on tangible equity';
 const capitalWindow=(a.tests?.moat?.series?.[capitalKey]??[]).slice(-10);
 const capitalSeries=capitalWindow.filter((p):p is [number,number]=>finite(p[1]));
 const capitalYears=capitalWindow.length?capitalWindow.at(-1)![0]-capitalWindow[0][0]+1:0;
 const capital=median(capitalSeries.map(p=>p[1]));
 const parts:string[]=[],stayEvidence:Evidence[]=[];
 if(operating&&inflation.length===3&&new Set(inflation.map(p=>p[0])).size===3){
  const values=inflation.map(p=>p[1]!);
  if(values.every(v=>v>=0&&v<=1))parts.push(`Margins ranged from ${pct(Math.min(...values))} to ${pct(Math.max(...values))} during 2021–23`);
  for(const [fy,m]of inflation)stayEvidence.push(source(`FY${fy}: ${marginField} / revenue = ${pct(m!)}.`,ordered.find(y=>y.fy===fy),marginField));
 }
 if(capital!==null){
  if(capital>=0)parts.push(`it earns ${returnPct(capital)} on ${operating?'its capital':'shareholders’ money, excluding intangible assets'}`);
  else if(capital>=-1)parts.push(`it lost ${pct(-capital)} on ${operating?'its capital':'shareholders’ money, excluding intangible assets'}`);
  stayEvidence.push(source(`${capitalYears}-year ${capitalLabel} observations ${JSON.stringify(capitalSeries)}; median ${capital}. ROIC follows the displayed moat series; financial companies use return on tangible equity.`));
 }
 const moat=facts.moat;
 if(moat&&parts.length<2){parts.push(({brand:'customers trust its brand','switching costs':'customers pay dearly to switch',network:'customers benefit from its large user network',cost:'customers benefit from its lower costs',regulatory:'licenses restrict new competitors',scale:'its size lowers costs'} as Record<string,string>)[moat.type]??'');stayEvidence.push(moat.evidence);}
 if(parts.length)add(2,parts.join('; ').replace(/^./,c=>c.toUpperCase())+'.',stayEvidence,{label:capitalLabel,unit:'percent',points:capitalSeries});
 if(last){
  const bridge=ownerEarningsBridge(ordered),current=bridge.at(-1),cashParts:string[]=[],cashEvidence:Evidence[]=[],rates:Series=[];
  for(const b of bridge.slice(-10))if(operating&&finite(b.value)&&b.value>0&&finite(b.maintenanceCapex)&&finite(b.year.capex)){
   const growth=Math.max(0,b.year.capex-b.maintenanceCapex),acquisitions=finite(b.year.acquisitions)&&!b.year.acquisitionsProxy?b.year.acquisitions:null;
   rates.push([b.year.fy,(growth+(acquisitions??0))/b.value]);
   cashEvidence.push(source(`FY${b.year.fy}: growth capex ${growth}; upkeep ${b.maintenanceCapex}; ${acquisitions===null?'':`cash acquisitions ${acquisitions}; `}owner earnings ${b.value}. ${acquisitions===null?'Growth capex / owner earnings':'Growth capex plus acquisitions / owner earnings'} = ${rates.at(-1)![1]}.`,b.year,'capex'));
  }
  const rate=rates.find(p=>p[0]===last.fy)?.[1];
  if(operating&&finite(rate)&&rate>=.0005&&rate<=1&&current){const complete=finite(last.acquisitions)&&!last.acquisitionsProxy;cashParts.push(`${complete?'Reinvests':'Spends'} ${pct(rate)} of cash earnings${complete?'':' on expansion'}`);}
  const incremental=a.tests?.economics?.metrics?.roiic;
  if(operating&&finite(incremental)&&incremental>0&&Math.abs(incremental-1)>.0005&&finite(rate)&&rate>=.01){cashParts.push(`earns ${returnPct(incremental)} on new investment`);cashEvidence.push(source(`Incremental return on capital ${incremental}, from the economics test's unchanged annual inputs.`));}
  const dividends=ordered.slice(-10).filter(y=>finite(y.dividendsPaid)&&(y.dividendsPaid!>0||y.provenance?.dividendsPaid?.method==='absent-in-complete-statement'||y.statementCoverage?.cashFlow));
  if(dividends.length){cashParts.push(dividends.every(y=>y.dividendsPaid===0)?`paid no dividends in ${dividends.length} ${dividends.length===1?'year':'years'}`:`paid dividends in ${dividends.filter(y=>y.dividendsPaid!>0).length} of ${dividends.length} ${dividends.length===1?'year':'years'}`);cashEvidence.push(source(`Dividend observations: ${JSON.stringify(dividends.map(y=>[y.fy,y.dividendsPaid]))}. Zero only counted when supported by a complete cash-flow statement.`));}
  const purchases=(facts.repurchases??[]).flatMap(p=>{
   const value=a.valueHistory?.find(v=>v[0]===p.fy)?.[2];
   if(p.currency!==a.company.currency||!finite(value)||value<=0||!finite(p.paidPerShare)||p.paidPerShare<=0)return [];
   const premium=p.paidPerShare/value-1;
   cashEvidence.push({...p.evidence,section:'Calculated repurchase comparison',quote:`${p.evidence.quote} FY${p.fy}: paid/share ${p.paidPerShare} ${p.currency}; our historic value/share ${value} ${p.currency}; premium ${premium}. Historic values use today's bond yield and FX, not a point-in-time investment signal.`});
   return [{fy:p.fy,premium}];
  }).sort((x,y)=>x.fy-y.fy);
  const purchase=purchases.at(-1);
  if(purchase)cashParts.unshift(`Bought back shares ${pct(Math.abs(purchase.premium))} ${purchase.premium>=0?'above':'below'} our value in ${purchase.fy}`);
  else if(finite(last.buybacks)&&last.buybacks>0){cashParts.push(`bought back ${a.reportingCurrency??last.currency??a.company.currency} ${amount(last.buybacks)} of shares`);cashEvidence.push(source(`FY${last.fy}: cash repurchases ${last.buybacks} ${a.reportingCurrency??last.currency??a.company.currency}.`,last,'buybacks'));}
  // Drop whole optional clauses, never truncate an answer mid-fact.
  while(cashParts.length>2||cashParts.join('; ').split(/\s+/).length>18)cashParts.pop();
  if(cashParts.length){
   add(4,cashParts.map((s,i)=>i?s.replace(/^./,c=>c.toLowerCase()):s).join('; ').replace(/^./,c=>c.toUpperCase())+'.',cashEvidence,rates.length?{label:'Growth investment / owner earnings',unit:'percent',points:rates}:undefined);
   const line=rows.find(l=>l.question===4);
   if(line)line.capitalAllocation=ordered.slice(-10).map(y=>{
    const rate=rates.find(p=>p[0]===y.fy)?.[1],incremental=roiic(ordered.filter(p=>p.fy<=y.fy));
    const paid=facts.repurchases?.find(p=>p.fy===y.fy&&p.currency===a.company.currency),value=a.valueHistory?.find(p=>p[0]===y.fy)?.[2];
    return {fy:y.fy,currency:a.reportingCurrency??y.currency??a.company.currency,
     ...(finite(rate)&&rate>=.0005?{reinvestmentRate:rate,reinvestmentBasis:finite(y.acquisitions)&&!y.acquisitionsProxy?'growth_capex_and_cash_acquisitions' as const:'growth_capex' as const}:{}),
     ...(operating&&finite(incremental)&&Math.abs(incremental-1)>.0005?{incrementalReturn:incremental}:{}),
     ...(finite(y.buybacks)?{buybacks:y.buybacks}:{}),...(finite(y.dividendsPaid)?{dividendsPaid:y.dividendsPaid}:{}),
     ...(paid&&finite(value)&&value>0?{repurchase:{currency:paid.currency,paidPerShare:paid.paidPerShare,valuePerShare:value,premium:paid.paidPerShare/value-1,basis:'historical_value_at_current_rates' as const}}:{}),
    };
   });
  }
 }
 if(finite(facts.insiderPercent)&&facts.insiderPercent>=0&&facts.insiderPercent<=100){
  const evidence=facts.insiderEvidence??source(`EODHD SharesStats.PercentInsiders ${facts.insiderPercent}; provider percentage points, not a fractional ratio.`);
  const control=facts.control;
  add(5,`Insiders own ${facts.insiderPercent>0&&facts.insiderPercent<.05?'<0.1%':pct(facts.insiderPercent/100)} of the company${control&&control.percent>=0&&control.percent<=100?`; ${control.name} ${control.name.includes(' and ')?'hold':'holds'} ${pct(control.percent/100)} ${control.kind==='votes'?'of votes':'of shares'}`:''}.`,[evidence,...(control?[control.evidence]:[])]);
 }
 const oe=(a.series?.ownerEarningsPerShare??[]).filter((p):p is [number,number]=>finite(p[1])).sort((x,y)=>x[0]-y[0]);
 const end=oe.at(-1),start=end?oe.find(p=>p[0]===end[0]-10):null;
 if(a.valuation&&price!==null){
  const fx=a.valuation.perShareTrading?.fxRate??(a.valuation.currency===a.company.currency?1:null);
  const implied=finite(fx)&&fx>0?impliedAverageGrowth(a.valuation,price/fx):null;
  if(finite(fx)&&fx>0&&a.valuation.method==='book_value'&&a.valuation.financialReturn&&price>0&&price/fx<4*a.valuation.normalized){
   const v=a.valuation,growth=v.discountRate-v.financialReturn!.cashPerShare/(price/fx);
   const model=valuationReturnModel({...v,growth});
   if(growth> -1&&model&&Math.abs(modelValue(model,v.discountRate)-price/fx)<1e-7*Math.max(1,price/fx))add(7,`The price assumes profits ${growth<0?'shrink':'grow'} ${pct(Math.abs(growth))} a year forever.`,[source(`Price ${price}; FX ${fx}; original perpetual distributable cash ${v.financialReturn!.cashPerShare}; discount ${v.discountRate}; growth ${growth}. Same book-value model and 4× ceiling; no ten-year operating fade applies.`)]);
  }
  if(finite(fx)&&fx>0&&a.valuation.method==='nav'&&a.valuation.normalized>0&&price>0){
   const v=a.valuation,growth=(price/fx/v.normalized)**.1*(1+v.discountRate)-1;
   add(7,`The price assumes assets ${growth<0?'shrink':'grow'} ${pct(Math.abs(growth))} yearly for ten years.`,[source(`Price ${price}; FX ${fx}; reported NAV ${v.normalized}; ten-year realization discounted at ${v.discountRate}; required annual NAV growth ${growth}.`)]);
  }
  if(implied!==null){
   const actual=start&&end&&start[1]>0&&end[1]>0?(end[1]/start[1])**.1-1:null;
   const comparison=actual!==null?`; actual ${actual<0?'decline':'growth'} was ${returnPct(Math.abs(actual))}`:'';
   add(7,`The price assumes cash profits ${implied<0?'shrink':'grow'} ${returnPct(Math.abs(implied))} yearly over ten years${comparison}.`,[source(`Ten-year compound average after fade. Initial solved rate ${impliedGrowth(a.valuation,price/fx!)}. Price ${price}; FX ${fx}; discount ${a.valuation.discountRate}; same ${a.valuation.tier??'standard'} ten-year fade to terminal ${a.valuation.terminalGrowth}. ${start&&end?`FY${start[0]} owner earnings/share ${start[1]} → FY${end[0]} ${end[1]}.`:''}`)],{label:'Owner earnings per share',unit:'money',points:oe.slice(-11)});
  }
 }
 if(!rows.some(l=>l.question===7)&&finite(price)&&price>0){
  const fx=a.valuation?.perShareTrading?.fxRate??a.ownerMemo?.priceFx??((a.reportingCurrency??a.company.currency)===a.company.currency?1:null);
  if(finite(fx)&&fx>0){
   const latest=(key:string)=>(a.series?.[key]??[]).filter((p):p is [number,number]=>finite(p[1])).sort((x,y)=>x[0]-y[0]).at(-1);
   const sales=latest('revenuePerShare'),cash=latest('ownerEarningsPerShare'),book=latest('bookValuePerShare'),nav=latest('navPerShare');
   const basis=sales&&sales[1]>0&&sales[0]>=Math.max(book?.[0]??0,nav?.[0]??0)&&price/fx/sales[1]<=10000?{row:sales,label:'annual sales'}:nav&&nav[1]>0?{row:nav,label:'net assets'}:book&&book[1]>0?{row:book,label:'net assets'}:null;
   if(basis){
    const multiple=price/fx/basis.row[1];
    if(multiple>0&&multiple<=10000){
     const value=multiple<.05?'less than 0.1':String(Number(multiple.toFixed(1)));
     add(7,`The price is ${value} times ${basis.label}${cash&&cash[0]===basis.row[0]&&cash[1]<0?'; cash earnings are negative':''}.`,[source(`Closing price ${price} ${a.company.currency}; reporting-to-trading FX ${fx}; FY${basis.row[0]} ${basis.label} per share ${basis.row[1]}; price multiple ${multiple}. ${cash?`FY${cash[0]} cash earnings/share ${cash[1]}.`:''}`)]);
    }
   }
  }
 }
 if(!rows.some(l=>l.question===7)&&finite(price)&&price>0){
  const reference=facts.priceReference??a.ownerMemo?.priceReference;
  if(reference&&reference.currency===a.company.currency&&finite(reference.value)&&reference.value>0){
   const change=price/reference.value-1;
   add(7,`The price is ${pct(Math.abs(change))} ${change>0?'above':'below'} its 52-week high.`,[{...reference.evidence,quote:`${reference.evidence.quote} Closing price ${price}; reference ${reference.value}; change ${change}; reference checked ${reference.asOf}.`}]);
  }
 }
 const ownership=officerOwnership(a.id);
 return [...rows.filter(l=>!ownership||l.question!==5),...(ownership?[ownership]:[])].sort((x,y)=>x.question-y.question);
}

/** Publication can change quotes, currency conversion or withhold a valuation.
 * Reprice the memo from that final public model, preserving all other answers. */
export function memoAtPrice(a:Analysis,quote?:PriceMap[string]|null):OwnerMemo|undefined {
 if(!a.ownerMemo)return undefined;
 const priceLine=numericMemo(a,[],quote?.[0]??null).find(l=>l.question===7);
 const ownership=officerOwnership(a.id);
 if(priceLine)priceLine.evidence[0].quote+=` Closing-price date ${quote?.[1]??a.ownerMemo.priceQuote?.quote[1]}.`;
 return {...a.ownerMemo,lines:consistentMemoLines(a,[...a.ownerMemo.lines.filter(l=>l.question!==7&&(!ownership||l.question!==5)),...(ownership?[ownership]:[]),...(priceLine?[priceLine]:[])]).sort((x,y)=>x.question-y.question)};
}
