import type {Dossier, TestOutcome} from '@/lib/value/types';
import type {TileMetric} from '@/lib/value/tile-metric';
import {seriesSummary} from '@/lib/value/density';
import {formatMetric, type MetricFormat} from '@/lib/value/metric-labels';
import {ChartInteraction} from './viz/ChartInteraction';
import {useWidth} from '@/lib/value/viz/use-width';
import {MiniSeries} from './viz/MiniSeries';

export function TileNumbers({metric,test,currency}:{metric:TileMetric;test:TestOutcome;currency:string}) {
 const format:MetricFormat=metric.chartFormat==='index'?'count':metric.chartFormat==='ratio'?'x':metric.chartFormat??(test.key==='understandable'&&metric.id==='opMarginCv'?'pct':metric.format);
 const summary=seriesSummary(metric.series,metric.chartBetter??(test.key==='understandable'?'higher':metric.better));
 const fmt=(value:number|null,kind:MetricFormat=format)=>formatMetric({value,format:kind,currency});
 const items=summary?[[`${summary.years}y median`,fmt(summary.median)],['Worst year',fmt(summary.worst)],[`Latest · ${summary.last}`,fmt(summary.latest)]]:
 test.key==='management'&&test.metrics.retainedEarnings!=null?[
 ['Retained',fmt(test.metrics.retainedEarnings,'money')],['Value created',fmt(test.metrics.marketCapGain??null,'money')],['Share growth / yr',fmt(test.metrics.shareCagr??null,'pct')]]:
 [[metric.label,fmt(metric.value,metric.format)],['Passing bar',`${metric.better==='higher'?'≥':'≤'} ${fmt(metric.threshold,metric.format)}`]];
 return <dl className="tile-support">{items.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function FinancialHighlights({dossier:d}:{dossier:Dossier}) {
 const currency=d.reportingCurrency??d.valuation?.currency??d.company.currency;
 const short=d.status==='insufficient_data';
 const candidates:Array<[string,string,MetricFormat]>=short?
 [['revenuePerShare','Revenue / share','money'],['ownerEarningsPerShare','Owner earnings / share','money'],['tangibleBookValuePerShare','Tangible book / share','money'],['bookValuePerShare','Book value / share','money']]:d.company.kind==='operating'?
 [['revenue','Revenue','money'],['ownerEarnings','Owner earnings','money'],['operatingMargin','Operating margin','pct'],['netCash','Net cash','money'],['shares','Shares','count']]:
 [['netIncome','Net income','money'],['bookPerShare','Book / share','money'],['dividendsPerShare','Dividend / share','money'],['roe','Return on equity','pct'],['shares','Shares','count']];
 return <section className={`financial-strip${short?' financial-strip-short':''}`} aria-label="Financial highlights">{candidates.map(([key,label,format])=>{
 const source=d.series[key]??[],end=Math.max(...source.map(p=>p[0])),series=source.filter(p=>p[0]>end-10),latest=series.filter(p=>p[1]!==null).at(-1);
 if(!latest&&key!=='netCash')return null;
 const snapshot=key==='netCash'&&!latest&&d.valuation?.netDebt!=null?-d.valuation.netDebt:null;
 if(!latest&&snapshot===null)return null;
 return <div key={key}><div className="financial-label"><span>{label}</span><b>{formatMetric({value:latest?.[1]??snapshot,format,currency})}</b></div>{latest?<MiniSeries series={series} label={label} format={format} height={short?180:64} fluid={short}/>:<p className="financial-snapshot">Latest balance sheet<br/>Cash less total debt<br/>History not supplied</p>}</div>;
 })}</section>;
}

/** Current filing signals are not an annual financial series. Keep their provenance visible. */
export function FilingSignals({test}:{test:TestOutcome}) {
 const labels:Record<string,string>={material_weakness:'Control weakness',auditor_changed:'Auditor change',going_concern:'Going concern',related_party:'Related parties'};
 const answers=test.jev.filter(a=>a.probability!==null&&Number.isFinite(a.probability)).slice(0,4);
 const {ref,width,height:availableHeight}=useWidth();
 if(!answers.length)return null;
 const left=142,right=width-36,height=Math.max(96,availableHeight-48),rowHeight=height/answers.length;
 return <figure ref={ref} className="filing-signals"><figcaption>Filing signals · estimated likelihood</figcaption><ChartInteraction width={width} height={height} label="Filing signal likelihoods" points={answers.map((a,i)=>({x:left+(right-left)*a.probability!,y:i*rowHeight+rowHeight/2,text:`${a.label}: ${Math.round(a.probability!*100)}% estimated likelihood. ${a.trusted?'Filing signal.':'Informational only.'} ${a.evidence??'No extract supplied.'}`}))}><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Current filing signals, not a time series">{answers.map((a,i)=><g key={a.q}><text x={0} y={i*rowHeight+rowHeight/2+4}>{labels[a.q]??a.label}</text><path d={`M${left} ${i*rowHeight+rowHeight/2}H${right}`} stroke="var(--viz-grid)" strokeWidth={8}/><path d={`M${left} ${i*rowHeight+rowHeight/2}h${(right-left)*a.probability!}`} stroke="var(--ink)" strokeWidth={8}/><text x={width} y={i*rowHeight+rowHeight/2+4} textAnchor="end">{Math.round(a.probability!*100)}%</text></g>)}</svg></ChartInteraction><p>Informational only · {answers.every(a=>!a.evidence)?'no filing extracts supplied':'see evidence for source extracts'}.</p></figure>;
}
