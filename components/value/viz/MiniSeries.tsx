import type { Series } from '@/lib/value/types';
export function MiniSeries({ series, label, threshold }: { series: Series; label: string; threshold?: number }) {
  const values = series.flatMap(p => p[1] !== null && Number.isFinite(p[1]) ? [p[1]] : []);
  if (values.length < 2) return <figure className="mini-series"><figcaption>{label} · history unavailable</figcaption><svg viewBox="0 0 300 48" aria-hidden="true"><path d="M0 25H300" stroke="currentColor" strokeDasharray="2 5" opacity=".25"/></svg></figure>;
  const lo = Math.min(...values, threshold ?? Infinity), hi = Math.max(...values, threshold ?? -Infinity);
  const y = (v:number) => 42 - (v-lo)/(hi-lo||1)*36;
  const first=series[0][0], last=series.at(-1)![0];
  let gap=true;
  const path=series.map(([t,v])=>{if(v===null){gap=true;return '';} const part=`${gap?'M':'L'}${(t-first)/(last-first||1)*300},${y(v)}`;gap=false;return part;}).join(' ');
  return <figure className="mini-series"><figcaption>{label} <span>{Math.floor(first)}–{Math.floor(last)}</span></figcaption><svg viewBox="0 0 300 48" preserveAspectRatio="none" aria-hidden="true">{threshold!==undefined&&<path d={`M0 ${y(threshold)}H300`} stroke="var(--buy)" strokeDasharray="3 4" opacity=".6"/>}<path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/></svg></figure>;
}
