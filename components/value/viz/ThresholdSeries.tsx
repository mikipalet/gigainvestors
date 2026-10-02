'use client';
import { formatMetric, isCapitalReturn } from '@/lib/value/metric-labels';
import { seriesDomain } from '@/lib/value/presentation';
import type { Dossier, Series } from '@/lib/value/types';
import { axisTick, compactMoney, niceTicks, scale, seriesPath } from '@/lib/value/viz/layout';
import { cagr, growthLabel, logSeries, logTicks } from '@/lib/value/viz/research';
import { useWidth } from '@/lib/value/viz/use-width';
import { DataTable } from './DataTable';
import { ChartInteraction } from './ChartInteraction';

type Props = { dense?:boolean; height?:number; summary?:string; returnMedian?:string; label: string; series: Series; domain: [number, number]; currency: string; format?: 'pct' | 'money' | 'index' | 'ratio'; threshold?: number; better?: 'higher' | 'lower'; inflation?: boolean; allowedBelow?: number; caption?: string; comparison?: { label: string; series: Series }; logarithmic?: boolean; events?: Dossier['events'] };
export function ThresholdSeries({ dense=false, label, series: rawSeries, domain: suppliedDomain, currency, format = 'pct', threshold, better = 'higher', inflation, allowedBelow, caption, comparison, logarithmic, events, returnMedian, summary, height = 144 }: Props) {
  const { ref, width } = useWidth();
  const domain = seriesDomain(rawSeries);
  const series = logarithmic ? logSeries(rawSeries) : rawSeries;
  const points = series.filter((p): p is [number, number] => p[1] !== null && Number.isFinite(p[1]));
  const fmt = (n: number) => format === 'pct' ? formatMetric({value:n,format:'pct',returnRatio:isCapitalReturn(label)}) : format === 'money' ? formatMetric({value:n,format:'money',currency}) : format==='ratio'?formatMetric({value:n,format:'x'}):formatMetric({value:n,format:'count'});
  const values = [...points.map(p => p[1]), ...(comparison?.series.flatMap(p => p[1] === null ? [] : [p[1]]) ?? []), ...(threshold === undefined ? [] : [threshold])];
  const min = format==='index'?Math.min(95,...values):!logarithmic&&format==='money'?Math.min(0,...values):Math.min(...values), max = format==='index'?Math.max(105,...values):Math.max(...values);
  const allTicks = logarithmic && points.length ? logTicks([min, max],87) : niceTicks([min, max], dense?3:5);
  const ticks=dense&&height<105?[allTicks[0],allTicks.at(-1)!]:allTicks;
  const tickLabel=(value:number)=>format==='pct'&&isCapitalReturn(label)?fmt(value):format==='pct'?(Math.abs(value*100)>=10000?`${(value*100).toExponential(1)}%`:`${+(value*100).toFixed(1)}%`):axisTick(value);
  const endLabels=[points.at(-1)?.[1],comparison?.series.filter(p=>p[1]!==null).at(-1)?.[1]].filter((v):v is number=>v!=null).map(fmt);
  const endSpace=Math.max(comparison?100:76,...endLabels.map(text=>text.length*8+28));
  const left = Math.max(48,...ticks.map(value=>tickLabel(value).length*10+16)), right = width - endSpace, top = dense?14:24, bottom = height-(dense?25:33);
  const x = scale({ domain, range: [left, right] });
  const linear = scale({ domain: logarithmic ? [Math.log(ticks[0]), Math.log(ticks.at(-1)!)] : [ticks[0], ticks.at(-1)!], range: [bottom, top] });
  const y = (n: number) => Number(linear(logarithmic ? Math.log(n) : n).toFixed(4));
  const last = points.at(-1), first = points[0], otherLast = comparison?.series.filter((p): p is [number, number] => p[1] !== null).at(-1);
  const growth = logarithmic ? cagr(rawSeries) : null;
  const passes = (value: number) => threshold === undefined || (better === 'higher' ? value >= threshold : value < threshold);
  const cleared = points.filter(p => passes(p[1])).length;
  let conclusion = !last ? `${label} has no plottable values` : threshold !== undefined ? `${label} ${better === 'higher' ? 'cleared' : 'stayed below'} ${fmt(threshold)} in ${cleared} of ${points.length} years` : growth !== null ? `${label} compounded at ${growthLabel(growth)}` : comparison && otherLast && otherLast[1] > 0 ? `FY${last[0]}: ${label.toLowerCase()} ran ${Math.abs((last[1] / otherLast[1] - 1) * 100).toFixed(0)}% ${last[1] >= otherLast[1] ? 'above' : 'below'} ${comparison.label.toLowerCase()}` : label === 'Owner earnings' ? `Annual owner earnings ended at ${fmt(last[1])}` : `${label} ${last[1] >= first[1] ? 'rose' : 'fell'} from ${fmt(first[1])} to ${fmt(last[1])}`;
  const inflationBase=points.filter(p=>p[0]===2019||p[0]===2020), inflationEnd=points.find(p=>p[0]===2023);
  const baseline=inflationBase.length===2?(inflationBase[0][1]+inflationBase[1][1])/2:null;
  if(inflation&&baseline!==null&&inflationEnd) conclusion=`FY2019–20 avg ${fmt(baseline)} → FY2023 ${fmt(inflationEnd[1])}: ${((inflationEnd[1]-baseline)*100).toFixed(1)} pp`;
  if((label==='ROIC'||label==='ROE'||label==='Return on tangible equity')&&points.length) conclusion=`Median ${returnMedian??fmt([...points].sort((a,b)=>a[1]-b[1])[Math.floor(points.length/2)][1])}; lowest year ${fmt(Math.min(...points.map(p=>p[1])))}`;
  if(comparison&&last&&otherLast&&otherLast[1]>0) conclusion=`FY${last[0]}: owner earnings ${(Number(last[1].toPrecision(3))/Number(otherLast[1].toPrecision(3))).toFixed(2)}× net income`;
  let endLabelY = last ? y(last[1]) : 0, otherLabelY = otherLast ? y(otherLast[1]) : 0;
  if (last && otherLast && Math.abs(endLabelY - otherLabelY) < 16) { const middle = (endLabelY + otherLabelY) / 2, ownerAbove = last[1] >= otherLast[1]; endLabelY = middle + (ownerAbove ? -8 : 8); otherLabelY = middle + (ownerAbove ? 8 : -8); }
  const rule = threshold === undefined ? '' : allowedBelow !== undefined ? `pass: median ≥ ${fmt(threshold)}; ≥ ${fmt(allowedBelow)} in all but one reported year` : `pass: ${better === 'higher' ? '≥' : '<'} ${fmt(threshold)}`;
  return <figure ref={ref} className="value-viz min-w-0" data-testid="threshold-series" data-series={JSON.stringify(rawSeries)} data-series-label={label} data-format={format==='ratio'?'x':format==='index'?'count':format} data-currency={currency}>
    <figcaption><h3 className="text-sm font-semibold">{summary??conclusion}</h3><p className="mt-1 text-[13px] text-ink/60">{label}, {format === 'pct' ? '%' : format === 'money' ? currency : format==='ratio'?'×':'first year = 100'} by fiscal year{logarithmic ? ' · log scale' : ''}. {caption ?? ''}</p></figcaption>

    {threshold !== undefined && <p className="mt-2 text-[13px] text-ink/65">{rule}</p>}
    {comparison && <p className="mt-1 flex flex-wrap gap-4 text-[13px] text-ink/60"><span><i className="mr-1 inline-block w-4 border-t-2 border-ink align-middle" />{label}</span><span><i className="mr-1 inline-block w-4 border-t-2 border-ink/55 align-middle" />{comparison.label}</span></p>}
    {points.length ? <ChartInteraction label={`${label} fiscal years`} width={width} height={height} points={points.map(([fy, value]) => ({ x: x(fy), y: value === null ? undefined : y(value), text: `FY${fy}${events?.some(e=>e.fy===fy) ? '; '+events.filter(e=>e.fy===fy).map(e=>e.note).join('; ') : ''}, ${label} ${value === null ? '' : fmt(value)}${value !== null && threshold !== undefined ? `, ${passes(value) ? 'meets' : 'below the passing standard for'} the ${fmt(threshold)} bar` : ''}${logarithmic && value !== null && value <= 0 ? ', non-positive value omitted from log plot' : ''}${comparison ? `; ${comparison.label} ${comparison.series.find(p => p[0] === fy)?.[1] == null ? '' : fmt(comparison.series.find(p => p[0] === fy)![1]!)}` : ''}` }))}>
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {inflation && domain[0] <= 2020 && domain[1] >= 2023 && <g><rect x={x(2020)} y={top} width={x(2023) - x(2020)} height={bottom - top} fill="var(--viz-grid)" opacity=".6" /><text className="viz-tick" x={(x(2020) + x(2023)) / 2} textAnchor="middle" y="12">inflation test</text></g>}
      {dense&&points.map(([fy,value])=><g key={`year-${fy}`}><line x1={x(fy)} x2={x(fy)} y1={top} y2={bottom} stroke="var(--viz-grid)"/><circle cx={x(fy)} cy={y(value)} r="2.5" fill="var(--viz-ink)"/></g>)}
      {ticks.map(t => <g key={t}><line x1={left} x2={right} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" /><text className="viz-tick" x={left - 6} y={y(t) + 3} textAnchor="end">{tickLabel(t)}</text></g>)}
      {threshold !== undefined && <line x1={left} x2={right} y1={y(threshold)} y2={y(threshold)} stroke="var(--viz-muted)" />}

      {comparison && <path d={seriesPath({ series: comparison.series, x, y })} fill="none" stroke="var(--viz-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      <path d={seriesPath({ series, x, y })} fill="none" stroke="var(--viz-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {threshold !== undefined && points.filter(p => !passes(p[1])).map(([fy, value]) => <path key={fy} d={`M${x(fy)-3},${y(value)-3}l6,6m0,-6l-6,6`} stroke="var(--viz-sell)" strokeWidth="2" />)}

      {threshold!==undefined&&points.length>0&&(()=>{const critical=points.reduce((a,b)=>(better==='higher'?b[1]<a[1]:b[1]>a[1])?b:a);return <circle cx={x(critical[0])} cy={y(critical[1])} r="6" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.5"/>;})()}
      {inflation&&baseline!==null&&inflationEnd&&<path d={`M${x(2019)},${y(baseline)}H${x(2020)}M${x(2023)-5},${y(inflationEnd[1])}h10`} stroke="var(--ink)" strokeWidth="3"/>}
      {last && <g>{comparison && <line x1={x(last[0])} x2={right + 8} y1={y(last[1])} y2={endLabelY} stroke="var(--viz-ink)" />}<text x={right + (comparison ? 11 : 12)} y={endLabelY + 3}>{growth !== null ? growthLabel(growth) : `${comparison ? 'OE ' : ''}${fmt(last[1])}`}</text></g>}
      {otherLast && <g><line x1={x(otherLast[0])} x2={right + 8} y1={y(otherLast[1])} y2={otherLabelY} stroke="var(--viz-muted)" /><text className="viz-tick" x={right + 11} y={otherLabelY + 3}>NI {fmt(otherLast[1])}</text></g>}
      <text x={left} y={height-12} className="viz-tick">{dense?'':'FY'}{domain[0]}</text><text x={right} y={height-12} textAnchor="end" className="viz-tick">{dense?'':'FY'}{Math.floor(domain[1])}</text>
      {events?.map((event, i) => { const point = points.find(p => p[0] === event.fy); const previous = events.slice(0,i).map(e=>points.find(p=>p[0]===e.fy)).filter((p):p is [number,number]=>!!p); const numbered = point && !previous.some(p=>Math.abs(x(point[0])-x(p[0]))<18 && Math.abs(y(point[1])-y(p[1]))<18); return point ? <g key={i}><title>{event.note}</title><circle cx={x(point[0])} cy={y(point[1])} r="7" fill="var(--paper)" stroke="var(--ink)"/>{numbered && <text x={x(point[0])} y={y(point[1])+3} textAnchor="middle" className="viz-event-number">{i+1}</text>}</g> : null; })}
    </svg></ChartInteraction> : <p className="py-8 text-xs text-ink/55">No positive reported data for this scale.</p>}
    {logarithmic && rawSeries.some(p => p[1] !== null && p[1] <= 0) && <p className="text-xs text-ink/60">Non-positive values are gaps on a log scale; all values remain in the table.</p>}
    <DataTable caption={label} headers={['Fiscal year', label, ...(comparison ? [comparison.label] : [])]} rows={rawSeries.filter(([,v])=>v!==null).map(([fy, value]) => [fy, value === null ? '' : format==='pct'?formatMetric({value,format:'pct',returnRatio:isCapitalReturn(label)}):fmt(value), ...(comparison ? [comparison.series.find(p => p[0] === fy)?.[1] == null ? '' : fmt(comparison.series.find(p => p[0] === fy)![1]!)] : [])])} />
  </figure>;
}
