import { summarizeSnapshots } from './snapshots';
import type { HistoryIndex, SnapshotRow } from './types';

/** Listing access is today's coverage, like the current-universe historical baseline. */
export function westernHistory(index: HistoryIndex, snapshots: Record<string, SnapshotRow[]>, ids: ReadonlySet<string>): HistoryIndex {
  return {...index, western: {perYear: Object.fromEntries(index.years.map(year => [year,
    summarizeSnapshots((snapshots[year] ?? []).filter(row => ids.has(row[0]))),
  ]))}};
}
