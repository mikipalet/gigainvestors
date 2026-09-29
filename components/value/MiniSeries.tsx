import type { Series } from "@/lib/value/types";

export function MiniSeries({ label, series }: { label: string; series: Series }) {
  const values = series.flatMap(([, value]) => value !== null && Number.isFinite(value) ? [value] : []);
  if (!values.length) return <p className="text-sm text-ink/40">{label}: no data</p>;
  const min = Math.min(...values), max = Math.max(...values);
  const years = series.map(([year]) => year);
  const start = Math.min(...years), span = Math.max(...years) - start || 1;
  const segments: string[][] = [[]];
  for (const [year, value] of series) {
    if (value === null || !Number.isFinite(value)) { segments.push([]); continue; }
    segments[segments.length - 1].push(`${2 + (year - start) / span * 196},${max === min ? 20 : 38 - (value - min) / (max - min) * 36}`);
  }
  return <figure>
    <figcaption className="text-xs text-ink/60">{label} · {start} to {Math.max(...years)}</figcaption>
    <svg role="img" aria-label={label} viewBox="0 0 200 40" className="h-10 w-full text-ink">
      {segments.filter((segment) => segment.length).map((segment, i) => <polyline key={i} points={segment.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.5" />)}
    </svg>
  </figure>;
}
