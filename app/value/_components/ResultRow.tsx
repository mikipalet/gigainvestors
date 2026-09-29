import { MarginBar } from '@/components/value/viz/MarginBar';
import type { IndexRow } from '@/lib/value/types';
import { formatMetric } from '@/lib/value/metric-labels';
import { ValueLink } from '@/components/value/ValueLink';
import { QualityDots } from './QualityDots';
export type ResultEntry = { row: IndexRow; mos: number | null; quote: number | null };
export function ResultRow({ row, mos, quote }: ResultEntry) {
  return <tr className={`border-b border-ink/15 ${row.st === 'i' ? 'opacity-40' : ''}`}>
    <td className="py-3 pr-2 sm:p-3"><ValueLink className="break-words underline decoration-ink/30 underline-offset-4" href={`/${encodeURIComponent(row.id.toLowerCase())}`}>{row.n}</ValueLink><div className="mt-1 text-xs text-ink/60">{row.id}{row.st === 'i' && ' · Insufficient data'}</div><div className="mt-2 sm:hidden"><QualityDots tests={row.t} /></div></td>
    <td className="hidden p-3 sm:table-cell">{row.c}</td>
    <td className="px-1 py-3 tabular-nums sm:p-3">{row.mc === null ? 'Not available' : formatMetric({ value: row.mc, format: 'money', currency: 'USD' })}</td>
    <td className="px-1 py-3 tabular-nums sm:p-3">{mos == null ? quote === null ? 'No price yet' : 'Not valued' : <MarginBar value={mos} />}</td>
    <td className="hidden p-3 sm:table-cell">{row.h}</td>
    <td className="hidden p-3 sm:table-cell"><QualityDots tests={row.t} /></td>
  </tr>;
}
