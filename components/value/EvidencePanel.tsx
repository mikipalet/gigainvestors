'use client';
import {useState} from 'react';
import {T} from '@/lib/value/config';
import type {Dossier,TestOutcome,PriceMap} from '@/lib/value/types';
import {tileMetric,tileReason,tileSentence} from '@/lib/value/tile-metric';
import {formatMetric,metricLabels,isCapitalReturn,displayReturnText} from '@/lib/value/metric-labels';
import {sharePrice} from '@/lib/value/listing-details';
import {comparableValuation} from '@/lib/value/site-valuation';
import {ownerReturn} from '@/lib/value/owner-return';
import {PanelTabs,PagedItems} from './PanelTabs';
import {ThresholdSeries} from './viz/ThresholdSeries';
import {MiniDollar,MiniPrice} from './viz/TileCharts';
import {OwnerEarningsWaterfall} from './viz/OwnerEarningsWaterfall';

function evidencePages(text:string){
 const words=text.split(/\s+/),pages:string[]=[];let page='';
 for(const word of words){if((page+' '+word).length>480){pages.push(page);page=word;}else page+=(page?' ':'')+word;}
 if(page)pages.push(page);return pages;
}
function Numbers({items}:{items:Array<[string,string]>}){return <dl className="panel-numbers">{items.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
function SeriesData({test}:{test:TestOutcome}){
 const keys=Object.keys(test.series).filter(k=>test.series[k].some(p=>p[1]!==null)),[key,setKey]=useState(keys[0]??'');const series=test.series[key]??[];
 return <><label className="data-series">Series <select value={key} onChange={e=>setKey(e.target.value)}>{keys.map(k=><option key={k} value={k}>{k==='roic'?'ROIC excluding acquisitions':k==='totalRoic'?'ROIC including acquisitions':k}</option>)}</select></label><PagedItems size={6} items={series.filter(([,n])=>n!==null).map(([fy,n])=><div className="data-pair"><span>FY{fy}</span><b>{Number(n!.toPrecision(6)).toLocaleString('en-US')}</b></div>)}/></>;
}
export function EvidencePanel({dossier,test}:{dossier:Dossier;test:TestOutcome}){
 const metric=tileMetric(test,dossier.company.kind,dossier.tests.understandable.series.netIncome??dossier.series.netIncome);
 const currency=dossier.reportingCurrency??dossier.valuation?.currency??dossier.company.currency;
 const metrics=Object.entries(test.metrics).filter(([k,v])=>metricLabels[k]&&v!==null);
 const metadata=(key:string)=>({...metricLabels[key],...(/^roic/.test(key)?{label:`${metricLabels[key].label} · excluding acquisitions`}:{}),
  ...(key==='roeMedian'&&test.metrics.returnThreshold!=null?{threshold:test.metrics.returnThreshold,label:test.metrics.tangibleReturn?'Return on tangible common equity, median':'Return on common equity, median'}:{}),
  ...(key==='roeSecondLowest'&&'returnThreshold' in test.metrics?{threshold:dossier.company.kind==='bank'?.05:undefined}:{}),
  ...(key==='shareCagr'&&'retainedBookRatio' in test.metrics?{threshold:.02}:{}),
 });
 const fmt=(v:number|null)=>formatMetric({value:v,format:metric.format,currency,returnRatio:isCapitalReturn(metric.id)});
 const observations=metric.series.filter(([,value])=>value!==null&&Number.isFinite(value)).length;
 const period=test.key==='management'&&test.metrics.retainedStartFy!=null&&test.metrics.retainedEndFy!=null?test.metrics.retainedEndFy-test.metrics.retainedStartFy:0;
 const years=observations||period;
 const filing=test.reasons.length>0||test.jev.length>0||Boolean(dossier.report.url);
 const endpointSummary=test.key==='management'&&test.metrics.perShareStart!=null&&test.metrics.perShareEnd!=null&&metric.id!=='retainedDollar'?`Three-year endpoint medians: ${formatMetric({value:test.metrics.perShareStart,format:'money',currency})} → ${formatMetric({value:test.metrics.perShareEnd,format:'money',currency})}`:undefined;
 const chart=metric.series.length?<ThresholdSeries height={220} summary={endpointSummary} allowedBelow={test.key==='moat'?(dossier.company.kind==='operating'?T.moat.roicSecondLowest:dossier.company.kind==='bank'?.05:undefined):undefined} label={metric.chart} series={metric.series} domain={[metric.series[0][0],metric.series.at(-1)![0]]} currency={currency} format={metric.chartFormat??(metric.format==='money'?'money':metric.format==='pct'||test.key==='understandable'?'pct':'ratio')} returnMedian={test.key==='moat'?fmt(metric.value):undefined} threshold={metric.chartThreshold===null?undefined:metric.chartThreshold??(test.key==='understandable'?undefined:metric.threshold)} better={metric.chartBetter??metric.better}/>:test.key==='management'&&metric.id==='retainedDollar'?<MiniDollar retained={test.metrics.retainedEarnings??null} created={test.metrics.marketCapGain??null} first={test.metrics.retainedStartFy} last={test.metrics.retainedEndFy}/>:null;
 return <PanelTabs tabs={[
  {label:'Answer',content:<><p className="panel-answer">{test.key==='management'||test.result==='pass'?tileSentence(test,metric,dossier.company.kind):tileReason(test)}</p><div className="panel-chart">{chart}</div><Numbers items={[[metric.label,fmt(metric.value)],['Passing bar',`${metric.better==='higher'?'≥':'≤'} ${fmt(metric.threshold)}`],...(years?[['Years',String(years)] as [string,string]]:[])]}/></>},
  {label:'Measures',content:<PagedItems size={4} items={metrics.map(([k,v])=><div className="measure-row"><span>{metadata(k).label}</span><b>{formatMetric({value:v,format:metadata(k).format,currency,returnRatio:isCapitalReturn(k)})}</b>{metadata(k).threshold!==undefined&&<small>{`${metadata(k).better==='higher'?'≥':'≤'} ${formatMetric({value:metadata(k).threshold!,format:metadata(k).format})} to pass`}</small>}</div>)}/>},
  ...(filing?[{label:'Filing',content:<PagedItems size={1} items={[...test.reasons.map(r=><ul className="evidence-list"><li><p>{displayReturnText(r)}</p>{dossier.report.url&&<a href={dossier.report.url}>Read original filing ↗</a>}</li></ul>),...test.jev.flatMap(a=>(a.evidence?evidencePages(a.evidence):['']).map((excerpt,i)=><ul className="evidence-list"><li><h3>{a.label}</h3><p>{a.probability==null?'':`${Math.round(a.probability*100)}% likelihood`}</p>{excerpt&&<blockquote>{excerpt}</blockquote>}{dossier.report.url&&<a href={dossier.report.url}>Original filing{ i ? ' · continued' : ''} ↗</a>}</li></ul>))]}/>}]:[]),
  ...(Object.values(test.series).some(series=>series.some(([,value])=>value!==null))?[{label:'Data',content:<SeriesData test={test}/>}]:[]),
 ]}/>;
}
export function ValuationPanel({dossier,quote}:{dossier:Dossier;quote:PriceMap[string]|null}){
 const v=dossier.valuation,comparable=comparableValuation(v,dossier.company.currency),owner=ownerReturn(v,dossier.company.currency,dossier.company.marketCapUsd,quote?.[0]??null),mos=dossier.requiredMos??.25;
 if(!v)return null;
 const pct=(n:number)=>`${(n*100).toFixed(1)}%`,money=(n:number|null)=>sharePrice(n,dossier.company.currency);
 return <PanelTabs tabs={[
  {label:'Valuation',content:<><p className="panel-answer">{dossier.b?'The price clears the safety discount and required return.':'Wait for a price that clears the safety discount and required return.'}</p><div className="panel-chart"><MiniPrice dossier={dossier} quote={quote}/></div><Numbers items={[["Share price",money(quote?.[0]??null)],["Estimated value",money(comparable?.perShare.mid??null)],["Buy price",money(comparable?comparable.perShare.mid*(1-mos):null)],...(v.capitalReturns?[["ROIC excluding acquisitions",formatMetric({value:v.capitalReturns.excludingGoodwill,format:"pct",returnRatio:true})] as [string,string],["ROIC including acquisitions",formatMetric({value:v.capitalReturns.includingAcquisitions,format:"pct",returnRatio:true})] as [string,string]]:[])]}/>
  <p>{owner?`${pct(owner.expected)} expected yearly return · ${pct(v.discountRate)} required`:`${pct(v.discountRate)} required yearly return`}</p></>},
  {label:v.method==='nav'?'NAV return':'Owner cash',content:<><p className="panel-answer">{v.method==='nav'?'NAV per share plus reinvested dividends, compounded over ten years and capped at 12%. Expected return divides that rate by price / NAV.':'Cash left for owners after maintaining the business.'}</p><Numbers items={[[v.method==='nav'?"NAV total-return CAGR":"Growth",pct(v.growth)],["Required return",pct(v.discountRate)],...(v.method==='nav'?[]:[["Long-run growth",pct(v.terminalGrowth)] as [string,string]])]}/><OwnerEarningsWaterfall valuation={v}/></>},
  {label:'Data',content:<PagedItems size={5} items={[...(v.capitalReturns?[<Numbers items={[["ROIC excluding acquisitions",formatMetric({value:v.capitalReturns.excludingGoodwill,format:'pct'})],["ROIC including acquisitions",formatMetric({value:v.capitalReturns.includingAcquisitions,format:'pct'})]]}/>]:[]),...v.bridge.map(r=><div className="measure-row"><span>{r.label}</span><b>{formatMetric({value:r.value,format:/shares/i.test(r.label)?'count':/return|CAGR/i.test(r.label)?'pct':/factor|price to book/i.test(r.label)?'x':'money',currency:v.currency})}</b></div>)]}/>},
  {label:'Sources',content:<><PagedItems size={2} items={v.assumptions.map(a=><p>{a}</p>)}/>{dossier.report.url&&<a href={dossier.report.url}>Original filing ↗</a>}<p>Analysed {dossier.asOf.slice(0,10)}</p></>},
 ]}/>;
}
