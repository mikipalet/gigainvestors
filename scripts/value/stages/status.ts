import { existsSync, readdirSync } from 'node:fs';
import { corpusPath, readCorpusJson, readJsonl } from '../../../lib/value/corpus';
import { validCompanyId } from '../../../lib/value/companies';
import { readStore } from '../../../lib/value/store';
import { budgetUsage } from '../../../lib/value/budget';
import { callsUsedToday } from '../../../lib/value/eodhd';
import { readPrices } from '../../../lib/value/price-files';
import { mergeSeed } from '../../../lib/value/price-seed';
import type { Company, ReportMeta } from '../../../lib/value/types';

export function collectStatus() {
  const companies = readJsonl<Company>("universe.jsonl").filter(company => validCompanyId(company.id, "status"));
  const reports: Record<string, number> = {};
  let fundamentals = 0, analysed = 0;
  for (const company of companies) {
    if (existsSync(corpusPath(`fundamentals/${company.id}.json`))) fundamentals++;
    if (existsSync(corpusPath(`analysis/${company.id}.json`))) analysed++;
    const report = readCorpusJson<ReportMeta>(`reports/${company.id}/meta.json`);
    if (report) reports[report.kind] = (reports[report.kind] ?? 0) + 1;
  }
  const quotes = readPrices(corpusPath('publish-repo/prices'));
  for (const [id, seed] of Object.entries(readPrices(corpusPath('prices')))) quotes[id] = mergeSeed(quotes[id], seed);
  const prices = { eodhd: 0, yahoo: 0, seed: 0, missing: 0 };
  for (const company of companies) {
    const quote = quotes[company.id];
    if (!quote) prices.missing++;
    else if (quote[2] === 'seed') prices.seed++;
    else prices[company.id.endsWith('.JP') ? 'yahoo' : 'eodhd']++;
  }
  const meta = readCorpusJson<{ asOf: string; counts: { analysed?: number; scored: number; insufficient: number } }>('publish-repo/meta.json');
  const date = new Date().toISOString().slice(0, 10);
  const jevTokens = readJsonl<{ at: string; input_tokens: number }>('jev-usage.jsonl')
    .filter(row => row.at?.slice(0, 10) === date).reduce((sum, row) => sum + row.input_tokens, 0);
  const cachedFundamentals = existsSync(corpusPath('fundamentals'))
    ? readdirSync(corpusPath('fundamentals')).filter(file => file.endsWith('.json')).length : 0;
  return { date, universe: companies.length, fundamentals, cachedFundamentals, reports, analysed,
    published: meta ? { count: meta.counts.analysed ?? meta.counts.scored + meta.counts.insufficient, asOf: meta.asOf, source: 'local publish-repo snapshot' } : null,
    prices, eodhd: budgetUsage(), jevTokens };
}
export default async function status(): Promise<void> {
  let usageError: string | undefined;
  try { await callsUsedToday(); } catch (error) { usageError = error instanceof Error ? error.message : 'Usage unavailable'; }
  const result = collectStatus();
  let publishedError: string | undefined;
  try {
    const meta = await readStore<{ asOf: string; counts: { analysed?: number; scored: number; insufficient: number } }>('meta.json');
    result.published = meta ? { count: meta.counts.analysed ?? meta.counts.scored + meta.counts.insufficient, asOf: meta.asOf, source: 'published store' } : { count: 0, asOf: '', source: 'published store (no snapshot)' };
  } catch (error) { publishedError = error instanceof Error ? error.message : 'Published store unavailable'; }
  console.log(JSON.stringify({ ...result, ...(usageError ? { usageError } : {}), ...(publishedError ? { publishedError } : {}) }, null, 2));
}
