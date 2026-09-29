import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';
import { corpusPath } from './corpus';
import { mergeSeed } from './price-seed';
import type { PriceMap } from './types';

export function readPrices(directory: string): PriceMap {
  if (!existsSync(directory)) return {};
  return Object.assign({}, ...readdirSync(directory).filter(file => /^[A-Z]{2}\.json$/.test(file)).sort()
    .map(file => JSON.parse(readFileSync(path.join(directory, file), 'utf8')) as PriceMap));
}
/** Bring local seeds into the fetched data repo without replacing any real close. */
export function mergeSeedFiles(repo: string): void {
  const local = corpusPath('prices');
  if (!existsSync(local)) return;
  for (const name of readdirSync(local).filter(file => /^[A-Z]{2}\.json$/.test(file))) {
    const seeds: PriceMap = JSON.parse(readFileSync(path.join(local, name), 'utf8'));
    const file = path.join(repo, 'prices', name);
    const prices: PriceMap = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
    for (const [id, seed] of Object.entries(seeds)) if (seed[2] === 'seed') prices[id] = mergeSeed(prices[id], seed);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(`${file}.tmp`, JSON.stringify(prices) + '\n');
    renameSync(`${file}.tmp`, file);
  }
}
