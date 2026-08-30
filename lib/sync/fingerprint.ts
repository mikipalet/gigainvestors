import type { ManagerRow } from "../dataroma/parse-managers";

export type SyncState = Record<string, string>;

export const fingerprint = (m: ManagerRow) => `${m.portfolioValue}|${m.stockCount}`;

export function diffManagers(rows: ManagerRow[], state: SyncState): string[] {
  return rows.filter((m) => state[m.code] !== fingerprint(m)).map((m) => m.code);
}
