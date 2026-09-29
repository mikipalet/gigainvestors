import { renameSync, writeFileSync } from 'node:fs';
import { loadCompanies } from '../../../lib/value/companies';
import { corpusPath, writeCorpusJson } from '../../../lib/value/corpus';
import { collapseListings } from '../../../lib/value/universe';

/** Reapply the universe's issuer rules after fundamentals have enriched identity. */
export default async function dedupe(options: { only?: string[]; limit?: number }): Promise<void> {
  if (options.only || options.limit) throw new Error('dedupe requires the full universe');
  const companies = loadCompanies({});
  if (!companies.length) throw new Error('Run universe before dedupe');
  const byId = new Map(companies.map(company => [company.id, company]));
  const groups = collapseListings(companies);
  const rows = groups.map(group => ({ ...byId.get(group.primary)!, listings: [...new Set(group.listings.flatMap(id => byId.get(id)!.listings))].sort() }));
  rows.sort((a, b) => (b.marketCapUsd ?? -Infinity) - (a.marketCapUsd ?? -Infinity) || a.id.localeCompare(b.id));
  // Keep the input for operational recovery, never delete cached company data.
  writeCorpusJson(`dedupe/universe-${new Date().toISOString().replace(/:/g, '-')}.json`, companies);
  const file = corpusPath('universe.jsonl');
  writeFileSync(`${file}.${process.pid}.tmp`, rows.map(row => JSON.stringify(row) + '\n').join(''));
  renameSync(`${file}.${process.pid}.tmp`, file);
  console.log(`dedupe: ${companies.length} -> ${rows.length} companies`);
}
