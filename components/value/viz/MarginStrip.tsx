'use client';
import { useMemo, useState } from 'react';
import { T } from '@/lib/value/config';
import { beeswarm, scale } from '@/lib/value/viz/layout';
import { useWidth } from '@/lib/value/viz/use-width';
import { valueHref } from '@/lib/value/href';
import { ValueLink } from '../ValueLink';
import { DataTable } from './DataTable';
type Entry = { id: string; name: string; mos: number };
export function MarginStrip({ entries }: { entries: Entry[] }) {
  const { ref, width } = useWidth();
  const [active, setActive] = useState<string | null>(null);
  const layout = useMemo(() => beeswarm({ points: entries.map(e => ({ id: e.id, value: e.mos })), width: width - 40 }), [entries, width]);
  const radius = Math.max(27, ...layout.map(p => Math.abs(p.y) + 8)), height = radius * 2 + 76;
  const x = scale({ domain: [-1, 1], range: [20, width - 20] });
  const selected = entries.find(e => e.id === active);
  return <section ref={ref} className="value-viz hidden min-w-0 sm:block" aria-labelledby="strip-title"><h2 id="strip-title" className="text-lg font-semibold">Quality, at what price?</h2><p className="mt-1 text-xs text-ink/55">{entries.length} companies pass all five tests and have a price.</p>
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Margin of safety for ${entries.length} quality companies, from minus 100% to plus 100%; buy zone starts at ${T.price.passMos * 100}%`} onPointerLeave={() => setActive(null)}>
      <rect x={x(T.price.passMos)} y="27" width={x(1) - x(T.price.passMos)} height={radius * 2 + 10} fill="var(--viz-buy-tint)" /><text x={x(T.price.passMos) + 6} y="19">buy zone</text>
      <line x1={x(T.price.passMos)} x2={x(T.price.passMos)} y1="27" y2={height - 32} stroke="var(--viz-muted)" />
      <line x1={20} x2={width - 20} y1={height - 32} y2={height - 32} stroke="var(--viz-grid)" />
      {[-1, -.5, 0, T.price.passMos, 1].map(t => <text key={t} className="viz-tick" textAnchor="middle" x={x(t)} y={height - 14}>{t * 100}%</text>)}
      {/* The nearest-point layer fills the plot, so sparse marks remain easy to hit. */}
      <rect x="0" y="25" width={width} height={radius * 2 + 14} fill="transparent" onPointerMove={e => {
        const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect(); const px = e.clientX - rect.left, py = e.clientY - rect.top;
        const nearest = layout.reduce<typeof layout[number] | null>((best, p) => !best || Math.hypot(p.x + 20 - px, p.y + radius + 32 - py) < Math.hypot(best.x + 20 - px, best.y + radius + 32 - py) ? p : best, null); setActive(nearest?.id ?? null);
      }} onClick={() => { if (active) window.location.assign(valueHref(`/${active.toLowerCase()}`, window.location.pathname)); }} />
      {layout.map(p => { const entry = entries.find(e => e.id === p.id)!; return <ValueLink key={p.id} href={`/${p.id.toLowerCase()}`} tabIndex={0} aria-label={`${entry.name}, ${(entry.mos * 100).toFixed(1)}% margin of safety. Open dossier`} onFocus={() => setActive(p.id)} onBlur={() => setActive(null)} onPointerEnter={() => setActive(p.id)}><circle cx={p.x + 20} cy={p.y + radius + 32} r={active === p.id ? 5 : 4} fill="var(--viz-ink)" stroke="var(--paper)" strokeWidth="2" /><title>{`${entry.name}: ${(entry.mos * 100).toFixed(1)}%`}</title></ValueLink>; })}
    </svg>
    <p className="viz-tooltip" role={selected ? 'tooltip' : undefined}>{selected ? <><strong className="text-ink">{(selected.mos * 100).toFixed(1)}%</strong> · {selected.name}</> : 'Hover or focus a dot; open it to read the company dossier.'}</p>
    <p className="text-[10px] text-ink/55">Positions capped at ±100%. Tooltips retain the actual margin.</p>
    <DataTable caption="Quality companies by margin of safety" headers={['Company', 'Margin of safety']} rows={entries.map(e => [<ValueLink key={e.id} href={`/${e.id.toLowerCase()}`}>{e.name}</ValueLink>, `${(e.mos * 100).toFixed(1)}%`])} />
  </section>;
}
