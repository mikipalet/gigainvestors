'use client';
import { T } from '@/lib/value/config';
import { DataTable } from './DataTable';
export const gateLabels = ['Analysed', '+ Understandable', '+ Moat', '+ Economics', '+ Management', '+ Accounting', `+ Margin of safety ≥ ${T.price.passMos * 100}%`];
export function BuffettFunnel({ counts, selected, onSelect }: { counts: number[]; selected: number | null; onSelect: (gate: number) => void }) {
  const total = counts[0] || 1;
  return <section className="value-viz min-w-0" aria-labelledby="funnel-title"><h2 id="funnel-title" className="text-lg font-semibold">The Buffett funnel</h2><p className="mb-4 mt-1 text-xs text-ink/55">Each step keeps companies passing every gate before it.</p>
    <div className="space-y-1">{counts.map((count, i) => <button key={gateLabels[i]} type="button" aria-pressed={selected === i} onClick={() => onSelect(i)} className={`grid w-full grid-cols-[minmax(0,1fr)_110px_35px] items-center gap-3 py-1.5 text-left text-xs sm:grid-cols-[190px_minmax(0,1fr)_38px] ${selected === i ? 'font-semibold' : ''}`}><span>{gateLabels[i]}</span><svg role="img" aria-label={`${gateLabels[i]}: ${count}, ${(count / total * 100).toFixed(0)}% of analysed`} width="100%" height="18"><rect width={`${count / total * 76}%`} y="4" height="10" fill="var(--viz-ink)" /><text x={`${count / total * 76}%`} dx="5" y="13">{count}</text></svg><span className="text-right tabular-nums text-ink/55">{(count / total * 100).toFixed(0)}%</span></button>)}</div>
    <DataTable caption="Cumulative quality gates" headers={['Gate', 'Companies', '% analysed']} rows={counts.map((n, i) => [gateLabels[i], n, `${(n / total * 100).toFixed(1)}%`])} />
  </section>;
}
