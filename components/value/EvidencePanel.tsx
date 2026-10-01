'use client';
import {useState} from 'react';
import {T} from '@/lib/value/config';
import type {Dossier,TestOutcome,PriceMap} from '@/lib/value/types';
import {tileMetric,tileReason,tileSentence} from '@/lib/value/tile-metric';
import {formatMetric,metricLabels} from '@/lib/value/metric-labels';
import {sharePrice} from '@/lib/value/listing-details';
import {comparableValuation} from '@/lib/value/site-valuation';
import {ownerReturn} from '@/lib/value/owner-return';
import {PanelTabs,PagedItems} from './PanelTabs';
import {ThresholdSeries} from './viz/ThresholdSeries';
import {MiniDollar,MiniPrice} from './viz/TileCharts';
import {OwnerEarningsWaterfall} from './viz/OwnerEarningsWaterfall';

function Numbers({items}:{items:Array<[string,string]>}){return <dl className="panel-numbers">{items.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
function SeriesData({test}:{test:TestOutcome}){
 const keys=Object.keys(test.series).filter(k=>test.series[k].some(p=>p[1]!==null)),[key,setKey]=useState(keys[0]??'');const series=test.series[key]??[];
 return <><label className="data-series">Series <select value={key} onChange={e=>setKey(e.target.value)}>{keys.map(k=><option key={k}>{k}</option>)}</select></label><PagedItems size={6} items={series.filter(([,n])=>n!==null).map(([fy,n])=><div className="data-pair"><span>FY{fy}</span><b>{['roic','roe'].includes(key)&&n===1.000001?'> 100%':Number(n!.toPrecision(6)).toLocaleString('en-US')}</b></div>)}/></>;
}
export function EvidencePanel({dossier,test}:{dossier:Dossier;test:TestOutcome}){
 const metric=tileMetric(test,dossier.company.kind,dossier.tests.understandable.series.netIncome??dossier.series.netIncome);
 const currency=dossier.reportingCurrency??dossier.valuation?.currency??dossier.company.currency;
 const metrics=Object.entries(test.metrics).filter(([k,v])=>metricLabels[k]&&v!==null);
 const fmt=(v:number|null)=>formatMetric({value:v,format:metric.format,currency});
 const observations=metric.series.filter(([,value])=>value!==null&&Number.isFinite(value)).length;
 const period=test.key==='management'&&test.metrics.retainedStartFy!=null&&test.metrics.retainedEndFy!=null?test.metrics.retainedEndFy-test.metrics.retainedStartFy:0;
 const years=observations||period;
 const filing=test.reasons.length>0||test.jev.length>0||Boolean(dossier.report.url);
 const endpointSummary=test.key==='management'&&test.metrics.perShareStart!=null&&test.metrics.perShareEnd!=null&&metric.id!=='retainedDollar'?`Three-year endpoint medians: ${formatMetric({value:test.metrics.perShareStart,format:'money',currency})} → ${formatMetric({value:test.metrics.perShareEnd,format:'money',currency})}`:undefined;
 const chart=metric.series.length?<ThresholdSeries summary={endpointSummary} allowedBelow={test.key==='moat'?(dossier.company.kind==='operating'?T.moat.roicSecondLowest:T.moat.roeSecondLowestFin):undefined} label={metric.chart} series={metric.series} domain={[metric.series[0][0],metric.series.at(-1)![0]]} currency={currency} format={(metric.chartFormat??metric.format)==='money'?'money':metric.format==='pct'||test.key==='understandable'?'pct':'ratio'} returnMedian={test.key==='moat'?fmt(metric.value):undefined} threshold={test.key==='understandable'||metric.chartThreshold===null?undefined:metric.chartThreshold??metric.threshold} better={metric.better}/>:test.key==='management'&&metric.id==='retainedDollar'?<MiniDollar retained={test.metrics.retainedEarnings??null} created={test.metrics.marketCapGain??null} first={test.metrics.retainedStartFy} last={test.metrics.retainedEndFy}/>:null;
 return <PanelTabs tabs={[
  {label:'Answer',content:<><p className="panel-answer">{test.result!=='pass'?tileReason(test):tileSentence(test,metric,dossier.company.kind)}</p><Numbers items={[[metric.label,fmt(metric.value)],['Passing bar',`${metric.better==='higher'?'≥':'≤'} ${fmt(metric.threshold)}`],...(years?[['Years',String(years)] as [string,string]]:[])]}/><div className="panel-chart">{chart}</div></>},
  {label:'Measures',content:<PagedItems size={4} items={metrics.map(([k,v])=><div className="measure-row"><span>{metricLabels[k].label}</span><b>{formatMetric({value:v,format:metricLabels[k].format,currency})}</b>{metricLabels[k].threshold!==undefined&&<small>{`${metricLabels[k].better==='higher'?'≥':'≤'} ${formatMetric({value:metricLabels[k].threshold!,format:metricLabels[k].format})} to pass`}</small>}</div>)}/>},
  ...(filing?[{label:'Filing',content:<><PagedItems size={1} items={[...test.reasons.map(r=><p>{r}</p>),...test.jev.map(a=><article><h3>{a.label}</h3><p>{a.probability==null?'':`${Math.round(a.probability*100)}% likelihood`}{a.trusted?'':' · Informational only'}</p>{a.evidence&&<p>{a.evidence.length>360?a.evidence.slice(0,357)+'…':a.evidence}</p>}</article>)]}/>{dossier.report.url&&<a href={dossier.report.url}>Original filing ↗</a>}</>}]:[]),
  ...(Object.values(test.series).some(series=>series.some(([,value])=>value!==null))?[{label:'Data',content:<SeriesData test={test}/>}]:[]),
 ]}/>;
}
export function ValuationPanel({dossier,quote}:{dossier:Dossier;quote:PriceMap[string]|null}){
 const v=dossier.valuation,comparable=comparableValuation(v,dossier.company.currency),owner=ownerReturn(v,dossier.company.currency,dossier.company.marketCapUsd,quote?.[0]??null),mos=dossier.requiredMos??.25;
 if(!v)return null;
 const pct=(n:number)=>`${(n*100).toFixed(1)}%`,money=(n:number|null)=>sharePrice(n,dossier.company.currency);
 return <PanelTabs tabs={[
  {label:'Valuation',content:<><p className="panel-answer">{dossier.b?'The price clears the safety discount and required return.':'Wait for a price that clears the safety discount and required return.'}</p><Numbers items={[["Share price",money(quote?.[0]??null)],["Estimated value",money(comparable?.perShare.mid??null)],["Buy price",money(comparable?comparable.perShare.mid*(1-mos):null)]]}/><div className="panel-chart"><MiniPrice dossier={dossier} quote={quote}/></div><p>{owner?`${pct(owner.expected)} expected yearly return · ${pct(v.discountRate)} required`:`${pct(v.discountRate)} required yearly return`}</p></>},
  {label:'Owner cash',content:<><p className="panel-answer">Cash left for owners after maintaining the business.</p><Numbers items={[["Growth",pct(v.growth)],["Required return",pct(v.discountRate)],["Long-run growth",pct(v.terminalGrowth)]]}/><OwnerEarningsWaterfall valuation={v}/></>},
  {label:'Data',content:<PagedItems size={5} items={v.bridge.map(r=><div className="measure-row"><span>{r.label}</span><b>{formatMetric({value:r.value,format:/shares/i.test(r.label)?'count':/return.*equity/i.test(r.label)?'pct':/factor|price to book/i.test(r.label)?'x':'money',currency:v.currency})}</b></div>)}/>},
  {label:'Sources',content:<><PagedItems size={2} items={v.assumptions.map(a=><p>{a}</p>)}/>{dossier.report.url&&<a href={dossier.report.url}>Original filing ↗</a>}<p>Analysed {dossier.asOf.slice(0,10)}</p></>},
 ]}/>;
}
