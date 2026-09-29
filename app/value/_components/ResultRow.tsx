import { T } from '@/lib/value/config';
import { RoicSparkline } from '@/components/value/viz/RoicSparkline';
import { MarginBar } from '@/components/value/viz/MarginBar';
import type { IndexRow } from '@/lib/value/types';
import { formatMetric } from '@/lib/value/metric-labels';
import { ValueLink } from '@/components/value/ValueLink';
import { QualityDots } from './QualityDots';
export type ResultEntry = { row: IndexRow; mos: number | null; quote: number | null; date?: string | null; rowIndex?: number };
export function ResultRow({ row, mos, quote, date, rowIndex }: ResultEntry) {
  return <tr aria-rowindex={rowIndex} data-company-row className={`border-b border-ink/15 ${row.st === 'i' ? 'opacity-40' : ''}`}>
    <td className="py-3 pr-2 sm:p-3"><ValueLink className="break-words underline decoration-ink/30 underline-offset-4" href={`/${encodeURIComponent(row.id.toLowerCase())}`}>{row.n}</ValueLink><div className="mt-1 text-xs text-ink/60">{row.id}{row.st === 'i' && ' · Insufficient data'}</div><RoicSparkline values={row.r}/><div className="mt-2 sm:hidden"><QualityDots tests={row.t} /></div></td>
    <td className="hidden p-3 sm:table-cell">{row.c}</td>
    <td className="px-1 py-3 tabular-nums sm:p-3">{row.mc === null ? 'Not available' : formatMetric({ value: row.mc, format: 'money', currency: 'USD' })}</td>
    <td title={`As of ${date ?? "price unavailable"}; last fiscal year unavailable in index. Required margin ${((row.m ?? T.price.requiredMos.stable)*100).toFixed(0)}%.`} className="px-1 py-3 tabular-nums sm:p-3">{mos == null ? quote === null ? 'No price yet' : 'Not valued' : <><MarginBar value={mos} />{date && <time className="mt-1 block whitespace-nowrap text-[9px] text-ink/55" dateTime={date}>As of {date}</time>}<span className="sr-only">Last fiscal year unavailable in index. Required discount {(row.m ?? T.price.requiredMos.stable)*100}%.</span></>}</td>
    <td className="hidden p-3 sm:table-cell">{row.h}</td>
    <td className="hidden p-3 sm:table-cell"><QualityDots tests={row.t} /></td>
  </tr>;
}
