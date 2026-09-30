import { bondObservation, type BondObservation } from '../../../lib/value/bond-yields';
import { readJsonl, writeCorpusJson } from '../../../lib/value/corpus';
import type { Company } from '../../../lib/value/types';

export default async function yields(): Promise<void> {
  const countries = [...new Set(readJsonl<Company>('universe.jsonl').map(c=>c.country))].sort();
  const table: Record<string, BondObservation> = {};
  // One EODHD series request per country, plus one Yahoo cross-check for the US.
  for (const country of countries) table[country] = await bondObservation(country);
  // Compatibility snapshot for history tools; analysis reads independent country files.
  writeCorpusJson('bonds.json', table);
  writeCorpusJson(`bonds/tables/${new Date().toISOString().slice(0,10)}.json`, table);
  console.table(Object.entries(table).map(([country,row])=>({country,yield:row.yield===null?'unavailable':`${(row.yield*100).toFixed(4)}%`,source:row.source,flags:row.flags.join(', ')})));
}
