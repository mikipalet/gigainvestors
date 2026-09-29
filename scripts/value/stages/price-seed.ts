import { existsSync, statSync } from 'node:fs';
import { loadCompanies } from '../../../lib/value/companies';
import { corpusPath, readCorpusJson, writeCorpusJson } from '../../../lib/value/corpus';
import { mergeSeed, seedPrice } from '../../../lib/value/price-seed';
import type { PriceMap } from '../../../lib/value/types';

/** Local, free and safe to run after today's provider budget has been exhausted. */
export default async function priceSeed(options: { only?: string[]; limit?: number }): Promise<void> {
  const countries = new Map<string, PriceMap>();
  let written = 0;
  for (const company of loadCompanies(options)) {
    if (!/^[A-Z]{2}$/.test(company.country)) continue;
    const rawFile = `raw/eodhd/${company.id}.json`;
    if (!existsSync(corpusPath(rawFile))) continue;
    const seed = seedPrice({ raw: readCorpusJson(rawFile), fetchedAt: statSync(corpusPath(rawFile)).mtime.toISOString() });
    if (!seed) continue;
    let prices = countries.get(company.country);
    if (!prices) {
      prices = readCorpusJson<PriceMap>(`prices/${company.country}.json`) ?? {};
      countries.set(company.country, prices);
    }
    const next = mergeSeed(prices[company.id], seed);
    if (next !== prices[company.id]) { prices[company.id] = next; written++; }
  }
  for (const [country, prices] of countries) writeCorpusJson(`prices/${country}.json`, prices);
  console.log(`price-seed: ${written} derived quotes written (local; published by publish)`);
}
