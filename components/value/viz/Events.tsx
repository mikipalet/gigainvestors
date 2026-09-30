import { dateLabel } from '@/lib/value/presentation';
import type { Dossier } from '@/lib/value/types';
export function EventNotes({ events = [] }: { events?: Dossier['events'] }) {
  return events.length ? <ul className="mb-2 space-y-1 text-[13px] text-ink/65">{events.map((event, i) => <li key={i}>{i + 1}. FY{event.fy} · {event.note}</li>)}</ul> : null;
}
export function AsOf({ date, fy }: { date?: string | null; fy?: number }) {
  return <p className="sr-only">As of {dateLabel(date)} · {fy ? `last fiscal year FY${fy}` : 'fiscal year unavailable'}</p>;
}
