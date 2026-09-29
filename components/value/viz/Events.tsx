import { dateLabel } from '@/lib/value/presentation';
import type { Dossier } from '@/lib/value/types';
export function EventTicks({ events = [], x, y }: { events?: Dossier['events']; x: (fy: number) => number; y: number }) {
  return <g>{events.map((event, i) => <g key={i}><line x1={x(event.fy)} x2={x(event.fy)} y1={y} y2={y + 7} stroke="var(--viz-ink)" /><text x={x(event.fy)} y={y + 18} textAnchor="middle" className="viz-tick">{i + 1}</text></g>)}</g>;
}
export function EventNotes({ events = [] }: { events?: Dossier['events'] }) {
  return events.length ? <ul className="mb-2 space-y-1 text-[11px] text-ink/65">{events.map((event, i) => <li key={i}>{i + 1}. FY{event.fy} · {event.note}</li>)}</ul> : null;
}
export function AsOf({ date, fy }: { date?: string | null; fy?: number }) {
  return <p className="sr-only">As of {dateLabel(date)} · {fy ? `last fiscal year FY${fy}` : 'fiscal year unavailable'}</p>;
}
