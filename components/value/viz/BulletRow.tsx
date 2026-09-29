import type { Result } from '@/lib/value/types';
import { formatMetric, type MetricFormat } from '@/lib/value/metric-labels';
import { dataBarPath, scale } from '@/lib/value/viz/layout';
import { StatusGlyph } from './StatusGlyph';
export function BulletRow({ label, value, threshold, better, strict, format, currency, resultOverride }: { label: string; value: number | null; threshold: number; better: 'higher' | 'lower'; strict?: boolean; format: MetricFormat; currency: string; resultOverride?: Result }) {
  const result = resultOverride ?? (value === null ? 'unclear' : (better === 'higher' ? strict ? value > threshold : value >= threshold : strict ? value < threshold : value <= threshold) ? 'pass' : 'fail');
  const lo = Math.min(0, value ?? 0, threshold), hi = Math.max(0, value ?? 0, threshold);
  const pad = (hi - lo) * .15 || 1;
  const x = scale({ domain: [lo < 0 ? lo - pad : lo, hi + pad], range: [2, 118] });
  const fmt = (n: number | null) => formatMetric({ value: n, format, currency });
  return <div className="value-viz grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-t border-ink/15 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_120px_100px_12px]">
    <dt>{label}<span className="mt-0.5 block text-[10px] text-ink/55">{better === 'higher' ? strict ? 'Above' : 'At least' : strict ? 'Below' : 'At most'} {fmt(threshold)}</span></dt>
    <dd className="col-start-1 row-start-2 sm:col-auto sm:row-auto"><svg width="120" height="22" viewBox="0 0 120 22" role="img" tabIndex={0} aria-label={`${label}: ${fmt(value)}; threshold ${fmt(threshold)}, ${better} is better; ${result}`}><title>{`${label}: ${fmt(value)}; threshold ${fmt(threshold)}`}</title><rect x="2" y="7" width="116" height="8" fill="var(--viz-ink)" opacity=".08" />{value !== null && <path d={dataBarPath({ x: Math.min(x(0), x(value)), y: 7, width: Math.max(1, Math.abs(x(value) - x(0))), height: 8, direction: value >= 0 ? "right" : "left" })} fill="var(--viz-ink)" />}<line x1={x(threshold)} x2={x(threshold)} y1="3" y2="19" stroke="var(--viz-muted)" strokeWidth="2" /></svg></dd>
    <dd className="flex items-center justify-end gap-2 text-right tabular-nums">{fmt(value)}<span className="sm:hidden"><StatusGlyph result={result} label={`${label}: ${result}`} /></span></dd><dd className="hidden sm:block"><StatusGlyph result={result} label={`${label}: ${result}`} /></dd>
  </div>;
}
