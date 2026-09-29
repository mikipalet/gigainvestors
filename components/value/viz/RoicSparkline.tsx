import { T } from '@/lib/value/config';
import { scale, seriesPath } from '@/lib/value/viz/layout';
export function RoicSparkline({ values }: { values?: Array<number | null> }) {
  if (!values?.some(n => n !== null)) return null;
  const data = values.slice(-10), reported = data.filter((n): n is number => n !== null && Number.isFinite(n));
  if (!reported.length) return null;
  const x = scale({ domain: [0, data.length - 1], range: [2, 78] }), y = scale({ domain: [Math.min(0, ...reported), Math.max(T.moat.roicMedian, ...reported)], range: [21, 2] });
  const failures = data.flatMap((value, i) => value !== null && value < T.moat.roicMedian ? [{ value, i }] : []);
  return <figure className="value-viz mt-1"><figcaption className="text-[10px] text-ink/55">ROIC: {reported.length - failures.length}/{reported.length} ≥ {T.moat.roicMedian * 100}%</figcaption><svg width="80" height="24" aria-hidden="true"><path d={seriesPath({ series: data.map((value, i) => [i, value]), x, y })} stroke="var(--viz-ink)" strokeWidth="2" fill="none" />{failures.map(({ value, i }) => <rect key={i} x={x(i)-2} y={y(value)-2} width="4" height="4" fill="var(--viz-sell)"/>)}</svg><span className="sr-only">Ten-year ROIC, oldest first: {data.map(n => n === null ? 'not reported' : `${(n*100).toFixed(1)}%`).join(', ')}. Square marks are below the bar.</span></figure>;
}
