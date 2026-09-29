import type { Result } from '@/lib/value/types';
import { formatMetric, type MetricFormat } from '@/lib/value/metric-labels';
import { dataBarPath, scale } from '@/lib/value/viz/layout';
import { ValueLink } from '../ValueLink';
import { StatusGlyph } from './StatusGlyph';
export function BulletRow({ label, value, threshold, better, strict, format, currency, resultOverride, nonNegative = false }: { label: string; value: number | null; threshold: number; better: 'higher' | 'lower'; strict?: boolean; format: MetricFormat; currency: string; resultOverride?: Result; nonNegative?: boolean }) {
  const result = resultOverride ?? (value === null ? 'unclear' : (better === 'higher' ? strict ? value > threshold : value >= threshold : strict ? value < threshold : value <= threshold) ? 'pass' : 'fail');
  const lo = Math.min(0, value ?? 0, threshold), hi = Math.max(0, value ?? 0, threshold);
  const pad = (hi - lo) * .15 || 1;
  const x = scale({ domain: [lo < 0 ? lo - pad : lo, hi + pad], range: [2, 118] });
  const fmt = (n: number | null) => formatMetric({ value: n, format, currency });
  return <div className="value-viz metric-bullet">
    <dt><ValueLink title="How computed" href="/method">{label}</ValueLink><span className="mt-0.5 block text-[10px] text-ink/55">{better === 'higher' ? strict ? 'Above' : 'At least' : strict ? 'Below' : 'At most'} {fmt(threshold)}</span></dt>
    <dd className="bullet-track"><figure><figcaption className="sr-only">{label}: {fmt(value)}, {result}. Passing threshold: {fmt(threshold)}.</figcaption><svg width="120" height="22" viewBox="0 0 120 22" aria-hidden="true"><title>{`${label}: ${fmt(value)}; threshold ${fmt(threshold)}`}</title><rect x="2" y="7" width="116" height="8" fill="var(--viz-ink)" opacity=".08" />{value !== null && (!nonNegative ? <circle cx={x(value)} cy="11" r="4" fill="var(--viz-ink)" /> : <path d={dataBarPath({ x: Math.min(x(0), x(value)), y: 7, width: Math.max(1, Math.abs(x(value) - x(0))), height: 8, direction: value >= 0 ? "right" : "left" })} fill="var(--viz-ink)" />)}<line x1={x(threshold)} x2={x(threshold)} y1="3" y2="19" stroke="var(--viz-muted)" strokeWidth="2" /></svg></figure></dd>
    <dd className="bullet-value">{fmt(value)}<span><StatusGlyph result={result} label={`${label}: ${result}`} /></span></dd>
  </div>;
}
