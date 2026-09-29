'use client';
import { useState } from 'react';
import type { Series } from '@/lib/value/types';
import { compactMoney, niceTicks, scale, seriesPath } from '@/lib/value/viz/layout';
import { useWidth } from '@/lib/value/viz/use-width';
import { DataTable } from './DataTable';

type Props = { label: string; series: Series; domain: [number, number]; currency: string; format?: 'pct' | 'money' | 'index'; threshold?: number; better?: 'higher' | 'lower'; inflation?: boolean; allowedBelow?: number; caption?: string; comparison?: { label: string; series: Series } };
export function ThresholdSeries({ label, series, domain, currency, format = 'pct', threshold, better = 'higher', inflation, allowedBelow, caption, comparison }: Props) {
  const { ref, width } = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const points = series.filter((p): p is [number, number] => p[1] !== null && Number.isFinite(p[1]));
  const fmt = (n: number) => format === 'pct' ? `${(n * 100).toFixed(1)}%` : format === 'money' ? compactMoney(n, currency) : n.toFixed(1);
  const values = [...points.map(p => p[1]), ...(comparison?.series.flatMap(p => p[1] === null ? [] : [p[1]]) ?? []), ...(threshold === undefined ? [] : [threshold])];
  const ticks = niceTicks([Math.min(...values), Math.max(...values)], 3);
  const left = 48, right = width - 110, top = 24, bottom = 111;
  const x = scale({ domain, range: [left, right] });
  const y = scale({ domain: [ticks[0], ticks.at(-1)!], range: [bottom, top] });
  const last = points.at(-1), otherLast = comparison?.series.filter((p): p is [number, number] => p[1] !== null).at(-1);
  const selected = active === null ? null : series[active];
  const allowed = allowedBelow === undefined ? undefined : [...points].filter(p => p[1] < allowedBelow).sort((a, b) => a[1] - b[1])[0]?.[0];
  let endLabelY = last ? y(last[1]) : 0;
  let otherLabelY = otherLast ? y(otherLast[1]) : 0;
  if (last && otherLast && Math.abs(endLabelY - otherLabelY) < 16) {
    const middle = (endLabelY + otherLabelY) / 2;
    const ownerAbove = last[1] >= otherLast[1];
    endLabelY = middle + (ownerAbove ? -8 : 8);
    otherLabelY = middle + (ownerAbove ? 8 : -8);
  }
  return <div ref={ref} className="value-viz min-w-0" data-testid="threshold-series">
    <h3 className="text-xs font-medium">{label}</h3>
    {comparison && <p className="mt-1 flex flex-wrap gap-4 text-[10px] text-ink/60"><span><i className="mr-1 inline-block w-4 border-t-2 border-ink align-middle" />{label}</span><span><i className="mr-1 inline-block w-4 border-t-2 border-ink/55 align-middle" />{comparison.label}</span></p>}
    {points.length ? <svg width="100%" height="140" viewBox={`0 0 ${width} 140`} role="img" aria-label={`${label}, fiscal years ${domain[0]} to ${domain[1]}, latest ${fmt(last![1])}${threshold === undefined ? '' : `; ${fmt(threshold)} threshold, ${better} is better`}`} tabIndex={0}
      onFocus={() => setActive(series.length - 1)} onBlur={() => setActive(null)}
      onKeyDown={e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); setActive(i => e.key === 'Home' ? 0 : e.key === 'End' ? series.length - 1 : Math.max(0, Math.min(series.length - 1, (i ?? series.length - 1) + (e.key === 'ArrowLeft' ? -1 : 1)))); } }}
      onPointerMove={e => { const rect = e.currentTarget.getBoundingClientRect(); const target = domain[0] + ((e.clientX - rect.left) / rect.width * width - left) / (right - left) * (domain[1] - domain[0]); setActive(series.reduce((best, p, i) => Math.abs(p[0] - target) < Math.abs(series[best][0] - target) ? i : best, 0)); }} onPointerLeave={() => setActive(null)}>
      {threshold !== undefined && <rect x={left} y={better === 'higher' ? top : y(threshold)} width={right - left} height={better === 'higher' ? y(threshold) - top : bottom - y(threshold)} fill="var(--viz-buy-tint)" opacity=".5" />}
      {inflation && domain[0] <= 2020 && domain[1] >= 2023 && <g><rect x={x(2020)} y={top} width={x(2023) - x(2020)} height={bottom - top} fill="var(--viz-grid)" opacity=".6" /><text className="viz-tick" x={(x(2020) + x(2023)) / 2} textAnchor="middle" y="12">inflation test</text></g>}
      {ticks.map(t => <g key={t}><line x1={left} x2={right} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" /><text className="viz-tick" x={left - 6} y={y(t) + 3} textAnchor="end">{format === 'pct' ? `${+(t * 100).toFixed(1)}%` : compactMoney(t)}</text></g>)}
      {threshold !== undefined && <g><line x1={left} x2={right} y1={y(threshold)} y2={y(threshold)} stroke="var(--viz-muted)" /><text className="viz-tick" x={right + 6} y={y(threshold) + (Math.abs(y(threshold) - endLabelY) < 14 ? -9 : 3)}>{+(threshold * 100).toFixed(1)}% bar</text></g>}
      {comparison && <path d={seriesPath({ series: comparison.series, x, y })} fill="none" stroke="var(--viz-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      <path d={seriesPath({ series, x, y })} fill="none" stroke="var(--viz-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {threshold !== undefined && points.filter(p => better === 'higher' ? p[1] < threshold : p[1] >= threshold).map(([fy, value]) => <g key={fy}><circle cx={x(fy)} cy={y(value)} r="5" fill="var(--paper)" /><circle cx={x(fy)} cy={y(value)} r="4" fill={fy === allowed ? 'var(--paper)' : 'var(--viz-sell)'} stroke={fy === allowed ? 'var(--viz-muted)' : 'var(--paper)'} strokeWidth="2" /><title>{`${fy === allowed ? 'Allowed bad year' : 'Below the passing standard'}: FY${fy}, ${fmt(value)}`}</title></g>)}
      {inflation && points.filter(p => p[0] === 2020 || p[0] === 2023).map(([fy, value]) => <text key={fy} x={x(fy)} y={y(value) + (fy === 2020 ? -9 : 15)} textAnchor="middle" paintOrder="stroke" stroke="var(--paper)" strokeWidth="3">{fmt(value)}</text>)}
      {last && <g>{comparison && <line x1={right} x2={right + 8} y1={y(last[1])} y2={endLabelY} stroke="var(--viz-ink)" />}<text x={right + (comparison ? 11 : 6)} y={endLabelY + 3}>{comparison ? 'OE ' : ''}{fmt(last[1])}</text></g>}
      {otherLast && <g><line x1={right} x2={right + 8} y1={y(otherLast[1])} y2={otherLabelY} stroke="var(--viz-muted)" /><text className="viz-tick" x={right + 11} y={otherLabelY + 3}>NI {fmt(otherLast[1])}</text></g>}
      {selected && <g><line x1={x(selected[0])} x2={x(selected[0])} y1={top} y2={bottom} stroke="var(--viz-muted)" />{selected[1] !== null && <circle cx={x(selected[0])} cy={y(selected[1])} r="4" stroke="var(--paper)" strokeWidth="2" fill="var(--viz-ink)" />}</g>}
      <text x={left} y="132" className="viz-tick">FY{domain[0]}</text><text x={right} y="132" textAnchor="end" className="viz-tick">FY{domain[1]}</text>
    </svg> : <p className="py-8 text-xs text-ink/55">No reported data</p>}
    <div className="viz-tooltip" role={selected ? 'tooltip' : undefined}>{selected ? <><strong className="text-ink">{selected[1] === null ? 'Not reported' : fmt(selected[1])}</strong> · FY{selected[0]} · {label}{comparison && ` · ${comparison.label} ${comparison.series.find(p => p[0] === selected[0])?.[1] == null ? 'not reported' : fmt(comparison.series.find(p => p[0] === selected[0])![1]!)}`}</> : caption ?? 'Hover or use arrow keys to inspect each fiscal year.'}</div>
    {allowedBelow !== undefined && <p className="text-[10px] text-ink/55">○ one bad year allowed below {fmt(allowedBelow)} · filled dots below the median bar</p>}
    <DataTable caption={label} headers={['Fiscal year', label, ...(comparison ? [comparison.label] : [])]} rows={series.map(([fy, value]) => [fy, value === null ? 'Not reported' : fmt(value), ...(comparison ? [comparison.series.find(p => p[0] === fy)?.[1] == null ? 'Not reported' : fmt(comparison.series.find(p => p[0] === fy)![1]!)] : [])])} />
  </div>;
}
