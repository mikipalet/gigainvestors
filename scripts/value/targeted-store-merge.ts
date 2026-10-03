import type { SearchShard } from '../../lib/value/types';

export function mergeRows<T>(live: T[], candidate: T[], ids: ReadonlySet<string>, key: (row: T) => string): T[] {
  for (const rows of [live, candidate]) if (new Set(rows.map(key)).size !== rows.length) throw Error('Duplicate company ID');
  const selected = new Map(candidate.filter(row => ids.has(key(row))).map(row => [key(row), row]));
  const existing = new Set(live.map(key));
  return [...live.map(row => selected.get(key(row)) ?? row), ...[...selected].filter(([id]) => !existing.has(id)).map(([, row]) => row)];
}

export function mergeSearch(live: SearchShard, candidate: SearchShard, ids: ReadonlySet<string>): SearchShard {
  const rows = mergeRows(live.rows, candidate.rows, ids, row => row[0]);
  const offsets = new Map(rows.map((row, i) => [row[0], i]));
  const aliases = structuredClone(live.aliases);
  for (const [alias, indexes] of Object.entries(candidate.aliases)) {
    const selected = indexes.map(i => candidate.rows[i][0]).filter(id => ids.has(id)).map(id => offsets.get(id)!);
    if (selected.length) aliases[alias] = [...new Set([...(aliases[alias] ?? []), ...selected])];
  }
  return { rows, aliases };
}
