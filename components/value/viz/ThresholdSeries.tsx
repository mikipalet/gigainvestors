'use client';
import { seriesDomain } from '@/lib/value/presentation';
import { useState } from 'react';
import type { Dossier, Series } from '@/lib/value/types';
import { axisTick, compactMoney, niceTicks, scale, seriesPath } from '@/lib/value/viz/layout';
import { cagr, growthLabel, logSeries, logTicks } from '@/lib/value/viz/research';
import { useWidth } from '@/lib/value/viz/use-width';
import { DataTable } from './DataTable';
import { ChartInteraction } from './ChartInteraction';

type Props = { returnMedian?:string; label: string; series: Series; domain: [number, number]; currency: string; format?: 'pct' | 'money' | 'index'; threshold?: number; better?: 'higher' | 'lower'; inflation?: boolean; allowedBelow?: number; caption?: string; comparison?: { label: string; series: Series }; logarithmic?: boolean; events?: Dossier['events'] };
export function ThresholdSeries({ label, series: rawSeries, domain: suppliedDomain, currency, format = 'pct', threshold, better = 'higher', inflation, allowedBelow, caption, comparison, logarithmic, events, returnMedian }: Props) {
  const { ref, width } = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const domain = seriesDomain(rawSeries);
  const series = logarithmic ? logSeries(rawSeries) : rawSeries;
  const points = series.filter((p): p is [number, number] => p[1] !== null && Number.isFinite(p[1]));
  const fmt = (n: number) => format === 'pct' ? `${(n * 100).toFixed(1)}%` : format === 'money' ? compactMoney(n, currency) : n.toFixed(1);
  const values = [...points.map(p => p[1]), ...(comparison?.series.flatMap(p => p[1] === null ? [] : [p[1]]) ?? []), ...(threshold === undefined ? [] : [threshold])];
  const min = format==='index'?Math.min(95,...values):!logarithmic&&format==='money'?Math.min(0,...values):Math.min(...values), max = format==='index'?Math.max(105,...values):Math.max(...values);
  const ticks = logarithmic && points.length ? logTicks([min, max],87) : niceTicks([min, max], 3);
  const left = 48, right = width - (comparison ? 100 : 76), top = 24, bottom = 111;
  const x = scale({ domain, range: [left, right] });
  const linear = scale({ domain: logarithmic ? [Math.log(ticks[0]), Math.log(ticks.at(-1)!)] : [ticks[0], ticks.at(-1)!], range: [bottom, top] });
  const y = (n: number) => Number(linear(logarithmic ? Math.log(n) : n).toFixed(4));
  const last = points.at(-1), first = points[0], otherLast = comparison?.series.filter((p): p is [number, number] => p[1] !== null).at(-1);
  const selected = active === null ? null : series[active];
  const growth = logarithmic ? cagr(rawSeries) : null;
  const passes = (value: number) => threshold === undefined || (better === 'higher' ? value >= threshold : value < threshold);
  const cleared = points.filter(p => passes(p[1])).length;
  let conclusion = !last ? `${label} has no plottable values` : threshold !== undefined ? `${label} ${better === 'higher' ? 'cleared' : 'stayed below'} ${fmt(threshold)} in ${cleared} of ${points.length} years` : growth !== null ? `${label} compounded at ${growthLabel(growth)}` : comparison && otherLast && otherLast[1] > 0 ? `FY${last[0]}: ${label.toLowerCase()} ran ${Math.abs((last[1] / otherLast[1] - 1) * 100).toFixed(0)}% ${last[1] >= otherLast[1] ? 'above' : 'below'} ${comparison.label.toLowerCase()}` : label === 'Owner earnings' ? `Annual owner earnings ended at ${fmt(last[1])}` : `${label} ${last[1] >= first[1] ? 'rose' : 'fell'} from ${fmt(first[1])} to ${fmt(last[1])}`;
  const inflationBase=points.filter(p=>p[0]===2019||p[0]===2020), inflationEnd=points.find(p=>p[0]===2023);
  const baseline=inflationBase.length===2?(inflationBase[0][1]+inflationBase[1][1])/2:null;
  if(inflation&&baseline!==null&&inflationEnd) conclusion=`FY2019–20 avg ${fmt(baseline)} → FY2023 ${fmt(inflationEnd[1])}: ${((inflationEnd[1]-baseline)*100).toFixed(1)} pp`;
  if((label==='ROIC'||label==='Return on tangible equity')&&points.length) conclusion=`Median ${returnMedian??fmt([...points].sort((a,b)=>a[1]-b[1])[Math.floor(points.length/2)][1])}; lowest year ${fmt(Math.min(...points.map(p=>p[1])))}`;
  if(comparison&&last&&otherLast&&otherLast[1]>0) conclusion=`FY${last[0]}: owner earnings ${(Number(last[1].toPrecision(3))/Number(otherLast[1].toPrecision(3))).toFixed(2)}× net income`;
  let endLabelY = last ? y(last[1]) : 0, otherLabelY = otherLast ? y(otherLast[1]) : 0;
  if (last && otherLast && Math.abs(endLabelY - otherLabelY) < 16) { const middle = (endLabelY + otherLabelY) / 2, ownerAbove = last[1] >= otherLast[1]; endLabelY = middle + (ownerAbove ? -8 : 8); otherLabelY = middle + (ownerAbove ? 8 : -8); }
  const rule = threshold === undefined ? '' : allowedBelow !== undefined ? `pass: median ≥ ${fmt(threshold)}; ≥ ${fmt(allowedBelow)} in 9 of 10 years` : `pass: ${better === 'higher' ? '≥' : '<'} ${fmt(threshold)}`;
  const height = 144;
  return <figure ref={ref} className="value-viz min-w-0" data-testid="threshold-series">
    <figcaption><h3 className="text-sm font-semibold">{conclusion}</h3><p className="mt-1 text-[11px] text-ink/60">{label}, {format === 'pct' ? '%' : format === 'money' ? currency : 'first year = 100'} by fiscal year{logarithmic ? ' · log scale' : ''}. {caption ?? ''}</p></figcaption>

    {threshold !== undefined && <p className="mt-2 text-[10px] text-ink/65">{rule}</p>}
    {comparison && <p className="mt-1 flex flex-wrap gap-4 text-[10px] text-ink/60"><span><i className="mr-1 inline-block w-4 border-t-2 border-ink align-middle" />{label}</span><span><i className="mr-1 inline-block w-4 border-t-2 border-ink/55 align-middle" />{comparison.label}</span></p>}
    {points.length ? <ChartInteraction label={`${label} fiscal years`} width={width} height={height} onActive={setActive} points={rawSeries.map(([fy, value]) => ({ x: x(fy), y: value === null ? undefined : y(value), text: `FY${fy}${events?.some(e=>e.fy===fy) ? '; '+events.filter(e=>e.fy===fy).map(e=>e.note).join('; ') : ''}, ${label} ${value === null ? 'not reported' : fmt(value)}${value !== null && threshold !== undefined ? `, ${passes(value) ? 'meets' : 'below the passing standard for'} the ${fmt(threshold)} bar` : ''}${logarithmic && value !== null && value <= 0 ? ', non-positive value omitted from log plot' : ''}${comparison ? `; ${comparison.label} ${comparison.series.find(p => p[0] === fy)?.[1] == null ? 'not reported' : fmt(comparison.series.find(p => p[0] === fy)![1]!)}` : ''}` }))}>
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {inflation && domain[0] <= 2020 && domain[1] >= 2023 && <g><rect x={x(2020)} y={top} width={x(2023) - x(2020)} height={bottom - top} fill="var(--viz-grid)" opacity=".6" /><text className="viz-tick" x={(x(2020) + x(2023)) / 2} textAnchor="middle" y="12">inflation test</text></g>}
      {ticks.map(t => <g key={t}><line x1={left} x2={right} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" /><text className="viz-tick" x={left - 6} y={y(t) + 3} textAnchor="end">{format === 'pct' ? `${+(t * 100).toFixed(1)}%` : axisTick(t)}</text></g>)}
      {threshold !== undefined && <line x1={left} x2={right} y1={y(threshold)} y2={y(threshold)} stroke="var(--viz-muted)" />}
      {threshold!==undefined&&<text x={right-4} y={y(threshold)-6} textAnchor="end" className="viz-tick">{+(threshold*100).toFixed(1)}% bar</text>}
      {comparison && <path d={seriesPath({ series: comparison.series, x, y })} fill="none" stroke="var(--viz-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      <path d={seriesPath({ series, x, y })} fill="none" stroke="var(--viz-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {threshold !== undefined && points.filter(p => !passes(p[1])).map(([fy, value]) => <path key={fy} d={`M${x(fy)-3},${y(value)-3}l6,6m0,-6l-6,6`} stroke="var(--viz-sell)" strokeWidth="2" />)}

      {threshold!==undefined&&points.length>0&&(()=>{const critical=points.reduce((a,b)=>(better==='higher'?b[1]<a[1]:b[1]>a[1])?b:a);return <circle cx={x(critical[0])} cy={y(critical[1])} r="6" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.5"/>;})()}
      {inflation&&baseline!==null&&inflationEnd&&<path d={`M${x(2019)},${y(baseline)}H${x(2020)}M${x(2023)-5},${y(inflationEnd[1])}h10`} stroke="var(--ink)" strokeWidth="3"/>}
      {last && <g>{comparison && <line x1={x(last[0])} x2={right + 8} y1={y(last[1])} y2={endLabelY} stroke="var(--viz-ink)" />}<text x={right + (comparison ? 11 : 12)} y={endLabelY + 3}>{growth !== null ? growthLabel(growth) : `${comparison ? 'OE ' : ''}${fmt(last[1])}`}</text></g>}
      {otherLast && <g><line x1={x(otherLast[0])} x2={right + 8} y1={y(otherLast[1])} y2={otherLabelY} stroke="var(--viz-muted)" /><text className="viz-tick" x={right + 11} y={otherLabelY + 3}>NI {fmt(otherLast[1])}</text></g>}
      {selected && <g><line x1={x(selected[0])} x2={x(selected[0])} y1={top} y2={bottom} stroke="var(--viz-muted)" />{selected[1] !== null && <circle cx={x(selected[0])} cy={y(selected[1])} r="4" stroke="var(--paper)" strokeWidth="2" fill="var(--viz-ink)" />}</g>}
      <text x={left} y="132" className="viz-tick">FY{domain[0]}</text><text x={right} y="132" textAnchor="end" className="viz-tick">FY{Math.floor(domain[1])}</text>
      {events?.map((event, i) => { const point = points.find(p => p[0] === event.fy); const previous = events.slice(0,i).map(e=>points.find(p=>p[0]===e.fy)).filter((p):p is [number,number]=>!!p); const numbered = point && !previous.some(p=>Math.abs(x(point[0])-x(p[0]))<18 && Math.abs(y(point[1])-y(p[1]))<18); return point ? <g key={i}><title>{event.note}</title><circle cx={x(point[0])} cy={y(point[1])} r="7" fill="var(--paper)" stroke="var(--ink)"/>{numbered && <text x={x(point[0])} y={y(point[1])+3} textAnchor="middle" className="viz-event-number">{i+1}</text>}</g> : null; })}
    </svg></ChartInteraction> : <p className="py-8 text-xs text-ink/55">No positive reported data for this scale.</p>}
    {logarithmic && rawSeries.some(p => p[1] !== null && p[1] <= 0) && <p className="text-xs text-ink/60">Non-positive values are gaps on a log scale; all values remain in the table.</p>}
    <DataTable caption={label} headers={['Fiscal year', label, ...(comparison ? [comparison.label] : [])]} rows={rawSeries.map(([fy, value]) => [fy, value === null ? 'Not reported' : fmt(value), ...(comparison ? [comparison.series.find(p => p[0] === fy)?.[1] == null ? 'Not reported' : fmt(comparison.series.find(p => p[0] === fy)![1]!)] : [])])} />
  </figure>;
}
