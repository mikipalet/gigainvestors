'use client';
import { useEffect, useMemo, useRef } from 'react';
import { beeswarm, scale } from '@/lib/value/viz/layout';
import { useWidth } from '@/lib/value/viz/use-width';
import { valueHref } from '@/lib/value/href';
import { usePathname } from 'next/navigation';
import { DataTable } from './DataTable';
import { ChartInteraction } from './ChartInteraction';
import { AsOf } from './Events';
type Entry = { id: string; name: string; mos: number; requiredMos: number; date?: string };
export function MarginStrip({ entries, date }: { entries: Entry[]; date?: string | null }) {
  const { ref, width } = useWidth();
  const pathname = usePathname();
  const canvas = useRef<HTMLCanvasElement>(null);
  const useCanvas = entries.length > 1500;
  const layout = useMemo(() => beeswarm({ points: entries.map(e => ({ id: e.id, value: e.mos })), width: width - 40, gap: useCanvas ? 5 : 10 }), [entries, width, useCanvas]);
  const byId = new Map(entries.map(e => [e.id, e]));
  const radius = Math.max(27, ...layout.map(p => Math.abs(p.y) + 8)), height = radius * 2 + 76;
  const x = scale({ domain: [-1, 1], range: [20, width - 20] });
  useEffect(() => {
    if (!useCanvas || !canvas.current) return;
    const node = canvas.current, ratio = window.devicePixelRatio || 1;
    node.width = width * ratio; node.height = height * ratio;
    const ctx = node.getContext('2d'); if (!ctx) return;
    ctx.scale(ratio, ratio);
    const style = getComputedStyle(node);
    ctx.fillStyle = style.getPropertyValue('--ink').trim();
    ctx.strokeStyle = style.getPropertyValue('--paper').trim(); ctx.lineWidth = 1;
    for (const p of layout) { ctx.beginPath(); ctx.arc(p.x + 20, p.y + radius + 32, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  }, [layout, width, height, radius, useCanvas]);
  const minimumDiscount = Math.min(1, ...entries.map(e => e.requiredMos));
  const buys = entries.filter(e => e.mos >= e.requiredMos).length;
  return <figure ref={ref} className="value-viz hidden min-w-0 sm:block" aria-labelledby="strip-title"><figcaption><h2 id="strip-title" className="text-lg font-semibold">{buys} quality companies meet their buy discount</h2><p className="mt-1 text-xs text-ink/55">Margin of safety, %. {entries.length} companies pass all five tests and have a price. Required discounts vary by company.</p></figcaption>
    <ChartInteraction label="Quality companies by margin of safety" width={width} height={height} points={layout.map(p => { const e = byId.get(p.id)!; return { x: p.x+20, y: p.y+radius+32, text: `${e.name}, ${(e.mos*100).toFixed(1)}% margin of safety; required ${e.requiredMos*100}%; as of ${e.date ?? 'unknown'}, last fiscal year: see dossier`, href: valueHref(`/${e.id.toLowerCase()}`, pathname) }; })}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <rect x={x(minimumDiscount)} y="27" width={x(1)-x(minimumDiscount)} height={radius*2+10} fill="var(--viz-buy-tint)"/><line x1={x(minimumDiscount)} x2={x(minimumDiscount)} y1="27" y2={height-32} stroke="var(--viz-ink)"/><text x={x(minimumDiscount)+4} y="19">minimum buy discount</text>
        <line x1={x(0)} x2={x(0)} y1="27" y2={height-32} stroke="var(--viz-muted)"/>
        <line x1={20} x2={width-20} y1={height-32} y2={height-32} stroke="var(--viz-grid)"/>
        {[-1, -.5, 0, .5, 1].map(t => <text key={t} className="viz-tick" textAnchor="middle" x={x(t)} y={height-14}>{t*100}%</text>)}
        {!useCanvas && layout.map(p => <circle key={p.id} cx={p.x+20} cy={p.y+radius+32} r="4" fill="var(--viz-ink)" stroke="var(--paper)" strokeWidth="2"/>)}
      </svg>
      {useCanvas && <canvas ref={canvas} aria-hidden="true" className="absolute inset-0" style={{ width, height }}/>}
    </ChartInteraction>
    <p className="text-[10px] text-ink/55">Positions capped at ±100%. Tooltips retain the actual margin.</p><AsOf date={date}/>
    <DataTable caption="Quality companies by margin of safety" headers={['Company', 'Margin', 'Required']} rows={entries.map(e => [<a key={e.id} href={valueHref(`/${e.id.toLowerCase()}`, pathname)}>{e.name}</a>, `${(e.mos*100).toFixed(1)}%`, `${e.requiredMos*100}%`])}/>
  </figure>;
}
