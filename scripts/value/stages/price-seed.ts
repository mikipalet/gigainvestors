import { existsSync, readdirSync, statSync } from 'node:fs';
import { loadCompanies } from '../../../lib/value/companies';
import { corpusPath, readCorpusJson, writeCorpusJson } from '../../../lib/value/corpus';
import { mergeSeed, seedPrice } from '../../../lib/value/price-seed';
import { readPriceHistory } from '../../../lib/value/price-history';
import type { PriceMap } from '../../../lib/value/types';

type CachedClose = { code: string; exchange: string; adjusted_close: number; last_day_data_date?: string };
/** Local and free: screener closes are already in the listing's trading units. */
export default async function priceSeed(options: { only?: string[]; limit?: number }): Promise<void> {
  const countries = new Map<string, PriceMap>();
  const screeners = new Map<string, { row: CachedClose; date: string }>();
  const directory = corpusPath('raw/eodhd/universe');
  for (const file of existsSync(directory) ? readdirSync(directory).filter(name => /^screener-.*\.json$/.test(name)).sort() : []) {
    const cached = readCorpusJson<{ date: string; data: CachedClose[] }>(`raw/eodhd/universe/${file}`);
    for (const row of cached?.data ?? []) {
      if (!(Number.isFinite(row.adjusted_close) && row.adjusted_close > 0)) continue;
      const id = `${row.code}.${row.exchange}`.toUpperCase();
      const date = row.last_day_data_date ?? cached!.date;
      if (!screeners.has(id) || screeners.get(id)!.date < date) screeners.set(id, { row, date });
    }
  }
  const unpriced = new Set(readCorpusJson<string[]>('prices/unpriced.json') ?? []);
  let written = 0, removed = 0;
  for (const company of loadCompanies(options)) {
    if (!/^[A-Z]{2}$/.test(company.country)) continue;
    let prices = countries.get(company.country);
    if (!prices) { prices = readCorpusJson<PriceMap>(`prices/${company.country}.json`) ?? {}; countries.set(company.country, prices); }
    const existing = prices[company.id];
    if (existing && existing[2] !== 'seed') continue;
    const rawFile = `raw/eodhd/${company.id}.json`;
    const cached = screeners.get(company.id);
    const hasRaw = existsSync(corpusPath(rawFile));
    const reference = cached ? undefined : readPriceHistory(company.id)?.at(-1)?.[1];
    const seed = seedPrice({ raw: !cached && hasRaw ? readCorpusJson(rawFile) : null,
      fetchedAt: cached?.date ?? (hasRaw ? statSync(corpusPath(rawFile)).mtime.toISOString() : ''), screener: cached?.row, reference });
    if (!seed) { unpriced.add(company.id); if (existing?.[2] === 'seed') { delete prices[company.id]; removed++; } continue; }
    unpriced.delete(company.id);
    const next = mergeSeed(existing, seed);
    if (JSON.stringify(next) !== JSON.stringify(existing)) { prices[company.id] = next; written++; }
  }
  for (const [country, prices] of countries) writeCorpusJson(`prices/${country}.json`, prices);
  writeCorpusJson('prices/unpriced.json', [...unpriced].sort());
  console.log(`price-seed: ${written} cached/validated quotes written, ${removed} unverified seeds removed (local; published by publish)`);
}
