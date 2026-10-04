import type {Dossier, TestOutcome} from '@/lib/value/types';
import type {TileMetric} from '@/lib/value/tile-metric';
import {seriesSummary} from '@/lib/value/density';
import {formatMetric, isCapitalReturn, type MetricFormat} from '@/lib/value/metric-labels';
import {ChartInteraction} from './viz/ChartInteraction';
import {useWidth} from '@/lib/value/viz/use-width';
import {MiniSeries} from './viz/MiniSeries';

export function TileNumbers({metric,test,currency}:{metric:TileMetric;test:TestOutcome;currency:string}) {
 const format:MetricFormat=metric.chartFormat==='index'?'count':metric.chartFormat==='ratio'?'x':metric.chartFormat??(test.key==='understandable'&&metric.id==='opMarginCv'?'pct':metric.format);
 const summary=seriesSummary(metric.series,metric.chartBetter??(test.key==='understandable'?'higher':metric.better),Infinity);
 const fmt=(value:number|null,kind:MetricFormat=format)=>formatMetric({value,format:kind,currency,returnRatio:isCapitalReturn(metric.chart)});
 const items=test.key==='management'&&test.metrics.retainedEarnings!=null&&test.metrics.marketCapGain!=null?[
 ['Retained',fmt(test.metrics.retainedEarnings,'money')],['Value created',fmt(test.metrics.marketCapGain??null,'money')],['Shares / yr',fmt(test.metrics.shareCagr??null,'pct')]]:
 summary?[[`${summary.years}y median`,fmt(summary.median)],['Worst year',fmt(summary.worst)],[test.provisional?.fy===summary.last?'Latest · LTM':`Latest · ${summary.last}`,fmt(summary.latest)]]:
 [[metric.label,fmt(metric.value,metric.format)],['Passing bar',`${metric.better==='higher'?'≥':'≤'} ${fmt(metric.threshold,metric.format)}`]];
 return <dl className="tile-support">{items.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function FinancialHighlights({dossier:d}:{dossier:Dossier}) {
 const currency=d.reportingCurrency??d.valuation?.currency??d.company.currency;
 const short=d.status==='insufficient_data';
 const candidates:Array<[string,string,MetricFormat]>=short?
 [['revenuePerShare','Revenue / share','money'],['ownerEarningsPerShare','Owner earnings / share','money'],['tangibleBookValuePerShare','Tangible book / share','money'],['bookValuePerShare','Book value / share','money']]:d.company.kind==='operating'?
 [['revenue','Revenue','money'],['ownerEarnings','Owner earnings','money'],['operatingMargin','Operating margin','pct'],['netCash','Net cash / debt','money'],['shares','Diluted shares','count']]:
 [['netIncome','Net income','money'],['bookPerShare','Book / share','money'],['dividendsPerShare','Dividend / share','money'],['roe',d.company.kind==='bank'||d.tests.moat.metrics.tangibleReturn?'Return on tangible equity':'Return on equity','pct'],['shares','Diluted shares','count']];
 return <section className={`financial-strip${short?' financial-strip-short':''}`} aria-label="Financial highlights">{candidates.map(([key,label,format])=>{
 const source=d.series[key]??[],end=Math.max(...source.map(p=>p[0])),series=source.filter(p=>p[0]>end-10),latest=series.filter(p=>p[1]!==null).at(-1);
 const snapshot=key==='netCash'&&!latest&&d.valuation?.netDebt!=null?-d.valuation.netDebt:null;
 if(!latest&&snapshot===null)return null;
 return <div key={key} data-financial={key} data-fy={latest?.[0]}><div className="financial-label"><span title={key==='netCash'?'Cash + short-term investments − reported total debt, in reporting currency. Lease treatment follows the annual source.':undefined}>{label}{snapshot!==null?' · snapshot':''}</span><b>{formatMetric({value:latest?.[1]??snapshot,format,currency,returnRatio:isCapitalReturn(label)})}</b></div>{series.filter(p=>p[1]!==null).length>0?<MiniSeries currency={currency} series={series} label={label} format={format} height={short?180:48} fluid={short}/>:null}</div>;
 })}</section>;
}

/** Current filing likelihoods use their own caption and chart rows. */
export function FilingSignals({test,dense=false}:{test:TestOutcome;dense?:boolean}) {
 const labels:Record<string,string>={material_weakness:'Control weakness',auditor_changed:'Auditor change',going_concern:'Going concern',related_party:'Related parties'};
 const answers=test.jev.filter(a=>a.probability!==null&&Number.isFinite(a.probability)).slice(0,4);
 const {ref,width,height:availableHeight}=useWidth();
 if(!answers.length)return null;
 const ceiling=dense?Math.max(.1,Math.ceil(Math.max(...answers.map(a=>a.probability!))*10)/10):1;
 const compact=dense||availableHeight<answers.length*30+24;
 const left=compact?Math.min(135,width*.55):0,right=compact?width-36:width,height=Math.max(answers.length*(compact?16:30),availableHeight-(dense?40:24)),rowHeight=height/answers.length,barOffset=compact?8:22;
 return <figure ref={ref} className="filing-signals" data-signals={JSON.stringify(answers.map(a=>({question:a.q,probability:a.probability,unit:'probability'})))}><figcaption>Filing signals · estimated likelihood{dense&&` · 0–${Math.round(ceiling*100)}%`}</figcaption><ChartInteraction width={width} height={height} label="Filing signal likelihoods" points={answers.map((a,i)=>({x:left+(right-left)*a.probability!/ceiling,y:i*rowHeight+barOffset,text:`${a.label}: ${Math.round(a.probability!*100)}% estimated likelihood. ${a.evidence??''}`}))}><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Current filing signals, not a time series">{answers.map((a,i)=><g key={a.q}><text style={compact?{fontSize:13}:undefined} x={0} y={i*rowHeight+12}>{labels[a.q]??a.label.replace(/^Describes /,'')}</text><path d={`M${left} ${i*rowHeight+barOffset}H${right}`} stroke="var(--viz-grid)" strokeWidth={8}/><path d={`M${left} ${i*rowHeight+barOffset}h${(right-left)*a.probability!/ceiling}`} stroke="var(--ink)" strokeWidth={8}/><text style={compact?{fontSize:13}:undefined} x={width} y={i*rowHeight+12} textAnchor="end">{Math.round(a.probability!*100)}%</text></g>)}</svg></ChartInteraction></figure>;
}
