import type { Series } from "@/lib/value/types";
import { formatMetric, type MetricFormat } from "@/lib/value/metric-labels";

const labels: Record<string, [string, MetricFormat]> = {
  roic: ['ROIC', 'pct'], roe: ['ROE', 'pct'], grossMargin: ['Gross margin', 'pct'],
  revenue: ['Revenue', 'money'], operatingMargin: ['Operating margin', 'pct'],
  ownerEarnings: ['Owner earnings', 'money'], shares: ['Diluted shares', 'count'], accruals: ['Accruals', 'pct'],
};
export function MiniSeries({ label, series, currency = '', markedYears = [] }: { label: string; series: Series; currency?: string; markedYears?: number[] }) {
  const [title, format] = labels[label] ?? [label, 'pct'];
  const values = series.flatMap(([, value]) => value !== null && Number.isFinite(value) ? [value] : []);
  if (!values.length) return <p className="text-sm text-ink/40">{title}: no data</p>;
  const min = Math.min(...values), max = Math.max(...values);
  const years = series.map(([year]) => year);
  const start = Math.min(...years), end = Math.max(...years), span = end - start || 1;
  const x = (year: number) => 4 + (year - start) / span * 216;
  const y = (value: number) => max === min ? 20 : 28 - (value - min) / (max - min) * 22;
  const segments: string[][] = [[]];
  for (const [year, value] of series) {
    if (value === null || !Number.isFinite(value)) { segments.push([]); continue; }
    segments[segments.length - 1].push(`${x(year)},${y(value)}`);
  }
  const latest = series.filter(([, value]) => value !== null && Number.isFinite(value)).at(-1)!;
  return <figure className="w-full sm:w-1/2 sm:pr-6">
    <figcaption className="mb-1 text-xs text-ink/60">{title} · {start} to {end}</figcaption>
    <svg role="img" aria-label={`${title}, ${start} to ${end}`} viewBox="0 0 330 40" className="h-10 w-full text-ink" preserveAspectRatio="none">
      {markedYears.filter(year => years.includes(year)).map(year => <g key={year}><line x1={x(year)} x2={x(year)} y1="2" y2="29" stroke="currentColor" opacity="0.2" strokeDasharray="2 2" /><text x={x(year)} y="39" textAnchor="middle" fill="currentColor" fontSize="9">{year}</text></g>)}
      {segments.filter(segment => segment.length).map((segment, i) => <polyline key={i} points={segment.join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
      <text x={x(latest[0]) + 6} y={Math.max(10, y(latest[1]!))} fontSize="10" fill="currentColor">{formatMetric({ value: latest[1], format, currency })}</text>
    </svg>
  </figure>;
}
