'use client';
import {useId,useState,useEffect} from 'react';
import {PointerTooltip} from '@/components/PointerTooltip';
import {MEMO_QUESTIONS,impliedAverageGrowth,type MemoLine} from '@/lib/value/owner-memo';
import {formatMetric,isCapitalReturn} from '@/lib/value/metric-labels';
import {sharePrice} from '@/lib/value/listing-details';
import type {Analysis} from '@/lib/value/types';
import type {Evidence} from '@/lib/value/judgement/types';
import {ChartInteraction} from './viz/ChartInteraction';
import {MiniSeries} from './viz/MiniSeries';
import {AnnualValueBar} from './AnnualValueBar';
function SourceLink({evidence}:{evidence:Evidence}){
 const computed=evidence.section.startsWith('Calculated');
 const id=useId();
 const [point,setPoint]=useState<{x:number;y:number}|null>(null);
 return <span className="memo-source"><button onPointerMove={e=>setPoint({x:e.clientX,y:e.clientY})} onPointerLeave={()=>setPoint(null)} popoverTarget={id} aria-label={computed?"Read calculation":"Read source quote"}>{computed?"Calculation":"Quote"} ↗</button>{point&&<PointerTooltip {...point}>{evidence.quote.length>600?(computed?'Open the calculations.':'Open the source quote.'):evidence.quote}</PointerTooltip>}<span id={id} popover="auto" className="memo-quote">{computed?<p>{evidence.quote}</p>:<blockquote>{evidence.quote}</blockquote>}<a href={evidence.url} target="_blank" rel="noreferrer">{evidence.section} · {evidence.filed.slice(0,10)} ↗</a></span><a href={evidence.url} target="_blank" rel="noreferrer" aria-label="Open original source">Source ↗</a></span>;
}
function Sources({evidence}:{evidence:Evidence[]}){
 const id=useId();
 if(evidence.length===1)return <SourceLink evidence={evidence[0]}/>;
 if(!evidence.length)return null;
 return <span className="memo-source"><button popoverTarget={id}>Sources ({evidence.length}) ↗</button><span id={id} popover="auto" className="memo-quote">{evidence.map((item,i)=><section key={i}><p>{item.quote}</p><a href={item.url} target="_blank" rel="noreferrer">{item.section} · {item.filed.slice(0,10)} ↗</a></section>)}</span></span>;
}
export function groupedEvidence(evidence:Evidence[]):Evidence[]{
 const groups=new Map<string,Evidence>();
 for(const e of evidence){
  // SEC companyfacts fragments identify rows inside the same JSON resource,
  // not separate source documents. Keep every calculation in one disclosure.
  const url=e.section.startsWith('Calculated')&&/^https:\/\/data\.sec\.gov\/api\/xbrl\/companyfacts\/CIK\d+\.json#/.test(e.url)?e.url.split('#')[0]:e.url;
  const key=JSON.stringify([url,e.filed,e.section.startsWith('Calculated')]);
  const previous=groups.get(key);
  if(previous){if(!previous.quote.includes(e.quote))previous.quote+='\n\n'+e.quote;}
  else groups.set(key,{...e,url});
 }
 return [...groups.values()];
}
function Comparison({items}:{items:Array<[string,number]>}){
 const min=Math.min(0,...items.map(([,n])=>n)),max=Math.max(.01,...items.map(([,n])=>n));
 const x=(n:number)=>(n-min)/(max-min)*240;
 return <div className="memo-comparison">{items.map(([label,value])=><div key={label}><span>{label}</span><b>{formatMetric({value,format:'pct',returnRatio:/return on/.test(label)})}</b><ChartInteraction width={240} height={12} label={label} points={[{x:120,y:6,text:`${label}: ${formatMetric({value,format:'pct',returnRatio:/return on/.test(label)})}`}]}><svg viewBox="0 0 240 12" aria-hidden="true"><rect x={Math.min(x(0),x(value))} width={Math.abs(x(value)-x(0))} height="8" fill="var(--viz-ink)" opacity=".5"/></svg></ChartInteraction></div>)}</div>;
}
function Answer({line,selected,currency,analysis,price}:{line:MemoLine;selected:string;currency:string;analysis:Analysis;price:number|null}){
 const yearsFor=()=>typeof window==='undefined'?8:innerWidth>=768?(innerHeight<850?6:10):8;
 const [tableYears,setTableYears]=useState(yearsFor);
 useEffect(()=>{const resize=()=>setTableYears(yearsFor());resize();window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
 const comparisons:Array<[string,number]>=[];
 if(line.question===4&&line.chart?.unit==='percent'){
  const reinvestment=line.chart.points.at(-1)?.[1],roiic=analysis.tests.economics.metrics.roiic;
  if(reinvestment!=null)comparisons.push(['Growth investment / owner earnings',reinvestment]);
  if(roiic!=null)comparisons.push(['Incremental return on invested capital',roiic]);
 }
 if(line.question===7&&analysis.valuation&&price!==null){
  const v=analysis.valuation,fx=v.perShareTrading?.fxRate??(v.currency===analysis.company.currency?1:null);
  const implied=fx?impliedAverageGrowth(v,price/fx):null;
  const oe=analysis.series?.ownerEarningsPerShare??[],last=oe.at(-1),first=last?oe.find(([fy])=>fy===last[0]-10):null;
  if(implied!==null)comparisons.push([`Ten-year implied growth at ${sharePrice(price,analysis.company.currency)}`,implied]);
  if(implied!==null&&first?.[1]&&last?.[1]&&first[1]>0&&last[1]>0)comparisons.push(['Actual ten-year growth per share',(last[1]/first[1])**.1-1]);
 }
 return <article className="memo-evidence" data-selected={selected===String(line.question)}>
  <h3>{MEMO_QUESTIONS[line.question-1]}</h3><p>{line.answer}</p>
  {!!comparisons.length&&<Comparison items={comparisons}/>}{line.question===7&&!!comparisons.length&&<small className="memo-comparison-basis">Current quote and valuation; the source calculation retains its original price.</small>}
  {line.chart&&!comparisons.length&&<MiniSeries dense series={line.chart.points} label={line.chart.label} format={line.chart.unit==='percent'?'pct':line.chart.unit==='ratio'?'x':'money'} currency={currency} height={75}/>}
  {line.chart&&<table className="memo-years" aria-label={`Recent annual values: ${line.chart.label}`}>{!!comparisons.length&&<caption>{line.chart.label}</caption>}<thead><tr><th>Year</th><th>{line.chart.unit==='percent'?'Percent':line.chart.unit==='ratio'?'Ratio':currency}</th><th title="Change from the previous displayed observation">Change</th></tr></thead><tbody>{line.chart.points.slice(-tableYears).map(([fy,value],i,points)=><tr key={fy}><th>FY{fy}</th><td>{formatMetric({value,format:line.chart!.unit==='percent'?'pct':line.chart!.unit==='ratio'?'x':'money',currency,returnRatio:isCapitalReturn(line.chart!.label)}).replace(`${currency} `,'')}{value!==null&&<AnnualValueBar value={value} values={points.map(p=>p[1])}/>}</td><td>{i>0&&value!==null&&points[i-1][1]&&!(isCapitalReturn(line.chart!.label)&&(value>1||points[i-1][1]!>1))?line.chart!.unit==='percent'?`${((value-points[i-1][1]!)*100).toFixed(1)}pp`:`${((value-points[i-1][1]!)/Math.abs(points[i-1][1]!)*100).toFixed(1)}%`:'—'}</td></tr>)}</tbody></table>}
  <footer><Sources evidence={groupedEvidence(line.evidence)}/></footer>
 </article>;
}
function AnnualRecord({analysis,currency}:{analysis:Analysis;currency:string}){
 const fields:Array<{key:string;label:string;format:'money'|'pct'|'count'}>=[
  {key:'revenue',label:'Revenue',format:'money'},
  {key:'netIncome',label:'Net income',format:'money'},
  {key:'ownerEarnings',label:'Cash for owners',format:'money'},
  {key:'grossMargin',label:'Gross margin',format:'pct'},
  {key:'operatingMargin',label:'Operating margin',format:'pct'},
  {key:'commonRoe',label:'Return on common equity',format:'pct'},
  {key:'roe',label:analysis.company.kind==='bank'||analysis.tests.moat.metrics.tangibleReturn?'Return on tangible equity':'Return on equity',format:'pct'},
  {key:'totalRoic',label:'ROIC including acquisitions',format:'pct'},
  {key:'roic',label:'ROIC excluding acquisitions',format:'pct'},
  {key:'bookPlusDividendReturn',label:'Book value + dividend return',format:'pct'},
  {key:'netCash',label:'Net cash / debt',format:'money'},
  {key:'revenuePerShare',label:'Revenue per share',format:'money'},
  {key:'ownerEarningsPerShare',label:'Owner cash per share',format:'money'},
  {key:analysis.company.kind==='operating'?'bookValuePerShare':'bookPerShare',label:analysis.company.kind==='operating'?'Book value per share':analysis.company.kind==='bank'?'Tangible common book per share':'Common book per share',format:'money'},
  {key:'dividendsPerShare',label:'Dividend per share',format:'money'},
  {key:'tangibleBookValuePerShare',label:'Tangible book per share',format:'money'},
  {key:'shares',label:'Diluted shares',format:'count'},
 ];
 const rows=fields.flatMap(field=>{
  if(analysis.company.kind!=='operating'&&['ownerEarnings','ownerEarningsPerShare','tangibleBookValuePerShare','revenuePerShare'].includes(field.key))return [];
  if((analysis.ownerMemo?.lines.length??0)===3&&!['revenue','ownerEarnings','grossMargin','operatingMargin','totalRoic','netCash','shares','bookPerShare','roe','netIncome'].includes(field.key))return [];
  const source=analysis.series?.[field.key]??[],end=Math.max(...source.map(([fy])=>fy));
  const series=source.filter((p):p is [number,number]=>p[0]>end-10&&p[1]!==null&&Number.isFinite(p[1]));
  if(!series.length)return [];
  const sorted=series.map(([,n])=>n).sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);
  return [{...field,year:series.at(-1)![0],latest:series.at(-1)![1],median:sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2}];
 });
 if(!rows.length)return null;
 const fmt=(r:typeof rows[number],value:number)=>formatMetric({value,format:r.format,currency,returnRatio:/ROIC|Return on/.test(r.label)});
 return <section className="memo-evidence memo-record"><h3>The financial record · {currency}</h3><table className="memo-years"><thead><tr><th>Measure</th><th>Latest</th><th>Recent median</th></tr></thead><tbody>{rows.map(r=><tr key={r.key}><th>{r.label}</th><td title={`FY${r.year}`}>{fmt(r,r.latest).replace(`${currency} `,'')}</td><td>{fmt(r,r.median).replace(`${currency} `,'')}</td></tr>)}</tbody></table><footer>Latest FY{Math.max(...rows.map(r=>r.year))} · median of the last ten fiscal years. {analysis.report.url&&<a href={analysis.report.url}>Original filing ↗</a>}</footer></section>;
}
export function BusinessDepth({analysis,selected,price=null}:{analysis:Analysis;selected:string;price?:number|null}){
 const currency=analysis.reportingCurrency??analysis.company.currency;
 const lines=(analysis.ownerMemo?.lines??[]).map(line=>{
  if(line.chart)return line;
  const financial=analysis.company.kind!=='operating';
  const key=line.question===2?'grossMargin':financial&&line.question===4?'dividendsPerShare':financial&&line.question===7?'bookPerShare':null;
  const points=key?analysis.series?.[key]:undefined;
  if(!points?.some(([,value])=>value!==null))return line;
  return {...line,chart:{label:key==='grossMargin'?'Gross margin through inflation':key==='dividendsPerShare'?'Dividends per share':analysis.company.kind==='bank'?'Tangible common book per share':'Common book per share',unit:key==='grossMargin'?'percent' as const:'money' as const,points:points.slice(-10)}};
 });
 return <div className="owner-memo-depth" data-answers={lines.length} data-charts={lines.filter(l=>l.chart).length} data-kind={analysis.company.kind} data-profile={lines.length<=2&&!!analysis.company.description}>
  {lines.map(l=><Answer key={l.question} line={l} selected={selected} currency={currency} analysis={analysis} price={price}/>)}
  {lines.length<=2&&analysis.company.description&&<section className="memo-evidence memo-profile" aria-label="Company profile"><p>{analysis.company.description}</p></section>}
  {lines.length<=3&&<AnnualRecord analysis={analysis} currency={currency}/>}
 </div>;
}
