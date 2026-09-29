'use client';
import { useEffect, useRef, useState } from 'react';
import { DataTable } from './DataTable';
import { AsOf } from './Events';
export const gateLabels = ['Analysed', '+ Understandable', '+ Moat', '+ Economics', '+ Management', '+ Accounting', '+ Required margin of safety'];
export function BuffettFunnel({ counts, onlyFailures, selected, onSelect, date }: { counts: number[]; onlyFailures: number[]; selected: number | null; onSelect: (gate: number) => void; date?: string | null }) {
  const [active, setActive] = useState<number | null>(null);
  const [roving, setRoving] = useState(0);
  const controls = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    if (active === null) return;
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(null); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [active]);
  const total = counts[0] || 1;
  return <figure onPointerLeave={() => setActive(null)} onKeyDown={e => { if (e.key === "Escape") setActive(null); if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) { e.preventDefault(); const i = e.key === "Home" ? 0 : e.key === "End" ? 6 : Math.max(0, Math.min(6, roving + (["ArrowLeft", "ArrowUp"].includes(e.key) ? -1 : 1))); setRoving(i); controls.current[i]?.focus(); } }} className="value-viz min-w-0" aria-labelledby="funnel-title"><figcaption><h2 id="funnel-title" className="text-lg font-semibold">{counts[6]} of {counts[0]} companies clear every gate</h2><p className="mb-4 mt-1 text-xs text-ink/55">The Buffett funnel, company counts. Each step keeps companies passing every preceding gate.</p></figcaption>
    <div className="space-y-1" role="group" aria-label="Filter by cumulative gate">{counts.map((count, i) => <button key={gateLabels[i]} type="button" ref={node => { controls.current[i] = node; }} tabIndex={roving === i ? 0 : -1} onFocus={() => { setRoving(i); setActive(i); }} onPointerEnter={() => setActive(i)} aria-pressed={selected === i} aria-label={`${gateLabels[i]}: ${count}. Fails only this test: ${onlyFailures[i] ?? 0}`} onClick={() => { setActive(i); onSelect(i); }} className={`grid w-full grid-cols-[minmax(0,1fr)_110px] items-center gap-3 py-1.5 text-left text-xs sm:grid-cols-[190px_minmax(0,1fr)] ${selected === i ? 'font-semibold' : ''}`}><span>{gateLabels[i]}</span><svg aria-hidden="true" width="100%" height="18"><rect width={`${count / total * 76}%`} y="4" height="10" fill="var(--viz-ink)" /><text x={`${count / total * 76}%`} dx="5" y="13">{count}</text></svg></button>)}</div>
    <p className="viz-tooltip" role={active === null ? undefined : "tooltip"}>{active === null ? "Select a gate to filter the table." : `Fails only this test: ${onlyFailures[active] ?? 0}`}</p><span aria-live="polite" className="sr-only">{active === null ? "" : `${gateLabels[active]}, ${counts[active]} companies, fails only this test: ${onlyFailures[active] ?? 0}`}</span>
    <AsOf date={date}/><DataTable caption="Cumulative quality gates" headers={['Gate', 'Companies', 'Fails only this test']} rows={counts.map((n, i) => [gateLabels[i], n, onlyFailures[i] ?? 0])} />
  </figure>;
}
