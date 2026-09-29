import { readJsonFile } from '../blob';
import { existsSync, readdirSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';
import { corpusPath, readCorpusJson } from './corpus';
import { mergeSeed } from './price-seed';
import type { PriceMap } from './types';

export function readPrices(directory: string): PriceMap {
  if (!existsSync(directory)) return {};
  return Object.assign({}, ...readdirSync(directory).filter(file => /^[A-Z]{2}\.json$/.test(file)).sort()
    .map(file => readJsonFile<PriceMap>(path.join(directory,file),{missingOnly:true}) ?? {}));
}
/** Bring local seeds into the fetched data repo without replacing any real close. */
export function mergeSeedFiles(repo: string): void {
  const local = corpusPath('prices');
  if (!existsSync(local)) return;
  const unpriced = new Set(readCorpusJson<string[]>('prices/unpriced.json') ?? []);
  for (const name of readdirSync(local).filter(file => /^[A-Z]{2}\.json$/.test(file))) {
    const seeds: PriceMap = readJsonFile<PriceMap>(path.join(local,name),{missingOnly:true}) ?? {};
    const file = path.join(repo, 'prices', name);
    const prices: PriceMap = readJsonFile<PriceMap>(file,{missingOnly:true}) ?? {};
    for (const id of unpriced) if (prices[id]?.[2] === 'seed') delete prices[id];
    for (const [id, seed] of Object.entries(seeds)) if (seed[2] === 'seed') prices[id] = mergeSeed(prices[id], seed);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(`${file}.tmp`, JSON.stringify(prices) + '\n');
    renameSync(`${file}.tmp`, file);
  }
}
