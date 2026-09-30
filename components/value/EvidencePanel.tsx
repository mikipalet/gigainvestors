'use client';
import {useState} from 'react';
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
 const keys=Object.keys(test.series),[key,setKey]=useState(keys[0]??'');const series=test.series[key]??[];
 return <><label className="data-series">Series <select value={key} onChange={e=>setKey(e.target.value)}>{keys.map(k=><option key={k}>{k}</option>)}</select></label><PagedItems size={6} items={series.map(([fy,n])=><div className="data-pair"><span>FY{fy}</span><b>{n==null?'Not reported':Number(n.toPrecision(6)).toLocaleString('en-US')}</b></div>)}/></>;
}
export function EvidencePanel({dossier,test}:{dossier:Dossier;test:TestOutcome}){
 const metric=tileMetric(test,dossier.company.kind,dossier.tests.understandable.series.netIncome??dossier.series.netIncome);
 const metrics=Object.entries(test.metrics).filter(([k])=>metricLabels[k]);
 const fmt=(v:number|null)=>formatMetric({value:v,format:metric.format});
 const chart=metric.series.length?<ThresholdSeries label={metric.chart} series={metric.series} domain={[metric.series[0][0],metric.series.at(-1)![0]]} currency={dossier.company.currency} format={metric.format==='money'?'money':metric.format==='pct'||test.key==='understandable'?'pct':'ratio'} returnMedian={test.key==='moat'?fmt(metric.value):undefined} threshold={test.key==='understandable'?undefined:metric.threshold} better={metric.better}/>:test.key==='management'?<MiniDollar retained={test.metrics.retainedEarnings??null} created={test.metrics.marketCapGain??null} first={test.metrics.retainedStartFy} last={test.metrics.retainedEndFy}/>:<p>Annual observations are unavailable.</p>;
 return <PanelTabs tabs={[
  {label:'Answer',content:<><p className="panel-answer">{test.result!=='pass'?tileReason(test):tileSentence(test,metric,dossier.company.kind)}</p><Numbers items={[[metric.label,fmt(metric.value)],['Passing bar',`${metric.better==='higher'?'≥':'≤'} ${fmt(metric.threshold)}`],['Years',String(metric.series.length||Math.min(10,dossier.historyCoverage?.years||0))]]}/><div className="panel-chart">{chart}</div></>},
  {label:'Measures',content:<PagedItems size={4} items={metrics.map(([k,v])=><div className="measure-row"><span>{metricLabels[k].label}</span><b>{formatMetric({value:v,format:metricLabels[k].format,currency:dossier.company.currency})}</b>{metricLabels[k].threshold!==undefined&&<small>{`${metricLabels[k].better==='higher'?'≥':'≤'} ${formatMetric({value:metricLabels[k].threshold!,format:metricLabels[k].format})} to pass`}</small>}</div>)}/>},
  {label:'Filing',content:<><PagedItems size={1} items={[...test.reasons.map(r=><p>{r}</p>),...test.jev.map(a=><article><h3>{a.label}</h3><p>{a.probability==null?'Uncertain':`${Math.round(a.probability*100)}% likelihood`}{a.trusted?'':' · Informational only'}</p>{a.evidence&&<p>{a.evidence.length>360?a.evidence.slice(0,357)+'…':a.evidence}</p>}</article>)]}/>{dossier.report.url&&<a href={dossier.report.url}>Original filing ↗</a>}</>},
  {label:'Data',content:<SeriesData test={test}/>},
 ]}/>;
}
export function ValuationPanel({dossier,quote}:{dossier:Dossier;quote:PriceMap[string]|null}){
 const v=dossier.valuation,comparable=comparableValuation(v,dossier.company.currency),owner=ownerReturn(v,dossier.company.currency,dossier.company.marketCapUsd,quote?.[0]??null),mos=dossier.requiredMos??.25;
 if(!v)return <p>{dossier.valuationReason??'Reliable financial history is required to estimate value.'}</p>;
 const pct=(n:number)=>`${(n*100).toFixed(1)}%`,money=(n:number|null)=>sharePrice(n,dossier.company.currency);
 return <PanelTabs tabs={[
  {label:'Valuation',content:<><p className="panel-answer">{dossier.b?'The price clears the safety discount and required return.':'Wait for a price that clears the safety discount and required return.'}</p><Numbers items={[["Share price",money(quote?.[0]??null)],["Estimated value",money(comparable?.perShare.mid??null)],["Buy price",money(comparable?comparable.perShare.mid*(1-mos):null)]]}/><div className="panel-chart"><MiniPrice dossier={dossier} quote={quote}/></div><p>{owner?`${pct(owner.expected)} expected yearly return · ${pct(v.discountRate)} required`:`${pct(v.discountRate)} required yearly return`}</p></>},
  {label:'Owner cash',content:<><p className="panel-answer">Cash left for owners after maintaining the business.</p><Numbers items={[["Growth",pct(v.growth)],["Required return",pct(v.discountRate)],["Long-run growth",pct(v.terminalGrowth)]]}/><OwnerEarningsWaterfall valuation={v}/></>},
  {label:'Data',content:<PagedItems size={5} items={v.bridge.map(r=><div className="measure-row"><span>{r.label}</span><b>{formatMetric({value:r.value,format:/shares/i.test(r.label)?'count':/return.*equity/i.test(r.label)?'pct':/factor|price to book/i.test(r.label)?'x':'money',currency:v.currency})}</b></div>)}/>},
  {label:'Sources',content:<><PagedItems size={2} items={v.assumptions.map(a=><p>{a}</p>)}/>{dossier.report.url&&<a href={dossier.report.url}>Original filing ↗</a>}<p>Analysed {dossier.asOf.slice(0,10)}</p></>},
 ]}/>;
}
