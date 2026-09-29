import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { appendJsonl, corpusPath, readCorpusJson, writeCorpusJson } from '@/lib/value/corpus';
import { budgetUsage, reserveEodhd, syncBudget } from '@/lib/value/budget';
import { eodhd } from '@/lib/value/eodhd';
import { getPrice } from '@/lib/value/store';
import { mergeSeedFiles } from '@/lib/value/price-files';
import seed from '@/scripts/value/stages/price-seed';
import history from '@/scripts/value/stages/price-history';
import { refreshPrices } from '@/scripts/value/stages/prices';
import { collectStatus } from '@/scripts/value/stages/status';
import type { Company } from '@/lib/value/types';

let root: string;
const company = (id: string): Company => ({ id, code: id.split('.')[0], exchange: id.split('.')[1], name: id, country: 'US', currency: 'USD', listings: [id], kind: 'operating', source: 'eodhd', isin: null, cik: null, lei: null, edinetCode: null, sector: null, industry: null, marketCapUsd: null, description: null });
beforeEach(() => {
  const base = tmpdir();
  root = mkdtempSync(path.join(base, 'ops-test-'));
  vi.stubEnv('VALUE_CORPUS_DIR', root); vi.stubEnv('EODHD_API_KEY', 'fixture');
  vi.stubGlobal('fetch', () => { throw new Error('Unexpected network'); });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); rmSync(root, { recursive: true, force: true }); });
it('persists history quota across invocations, rejects overspend, and resets at UTC midnight', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-29T23:59:59Z'));
  writeCorpusJson('usage/eodhd-2026-09-29.json', { date: '2026-09-29', used: 99999, history: 14999 });
  reserveEodhd({ endpoint: 'eod/KO.US', monthly: true });
  expect(budgetUsage()).toMatchObject({ used: 100000, history: 15000 });
  expect(() => reserveEodhd({ endpoint: 'eod/KO.US', monthly: true })).toThrow();
  expect(() => reserveEodhd({ endpoint: 'fundamentals/KO.US' })).toThrow();
  reserveEodhd({ endpoint: 'eod/EURUSD.FOREX' });
  expect(syncBudget(99800)).toBe(100001);
  vi.setSystemTime(new Date('2026-09-30T00:00:00Z'));
  reserveEodhd({ endpoint: 'fundamentals/KO.US' });
  expect(budgetUsage()).toMatchObject({ used: 10, history: 0 });
});
it('counts retries as paid attempts and prevents a retry past the history cap', async () => {
  const date = new Date().toISOString().slice(0, 10);
  writeCorpusJson(`usage/eodhd-${date}.json`, { date, used: 100, history: 14999 });
  const fetch = vi.fn(async () => new Response(null, { status: 503, headers: { 'Retry-After': '0' } }));
  vi.stubGlobal('fetch', fetch);
  await expect(eodhd('eod/KO.US', { period: 'm' })).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(budgetUsage()).toMatchObject({ used: 101, history: 15000 });
});
it('does not request history for companies without fundamentals', async () => {
  appendJsonl('universe.jsonl', company('KO.US'));
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  await history({});
  expect(fetch).not.toHaveBeenCalled();
});
it('writes fetched-date seeds, merges safely for publish, and reads both tuple formats', async () => {
  for (const id of ['KO.US', 'NEW.US']) {
    appendJsonl('universe.jsonl', company(id));
    writeCorpusJson(`raw/eodhd/${id}.json`, { Highlights: { MarketCapitalization: 500 }, SharesStats: { SharesOutstanding: 20 } });
    utimesSync(corpusPath(`raw/eodhd/${id}.json`), new Date('2026-09-20'), new Date('2026-09-20'));
  }
  writeCorpusJson('raw/eodhd/universe/screener-US-0.json', { date: '2026-09-20', data: ['KO', 'NEW'].map(code => ({ code, exchange: 'US', adjusted_close: 25 })) });
  await seed({});
  expect(readCorpusJson('prices/US.json')).toEqual({ 'KO.US': [25, '2026-09-20', 'seed'], 'NEW.US': [25, '2026-09-20', 'seed'] });
  writeCorpusJson('publish-repo/prices/US.json', { 'KO.US': [24, '2026-09-19'] });
  mergeSeedFiles(corpusPath('publish-repo'));
  vi.stubEnv('VALUE_STORE_DIR', corpusPath('publish-repo'));
  expect(await getPrice('KO.US', 'US')).toEqual([24, '2026-09-19']);
  expect(await getPrice('NEW.US', 'US')).toEqual([25, '2026-09-20', 'seed']);
  await refreshPrices({ repo: corpusPath('publish-repo'), companies: [company('NEW.US')], bulk: async () => [{ code: 'NEW', close: 23, date: '2026-09-19' }] });
  expect(await getPrice('NEW.US', 'US')).toEqual([23, '2026-09-19']);
  mergeSeedFiles(corpusPath('publish-repo'));
  expect(await getPrice('NEW.US', 'US')).toEqual([23, '2026-09-19']);
});
it('counts only universe members and only todays Jev usage', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-29T12:00:00Z'));
  for (const id of ['KO.US', 'NEW.US', '8058.JP']) appendJsonl('universe.jsonl', company(id));
  writeCorpusJson('fundamentals/KO.US.json', {}); writeCorpusJson('fundamentals/REMOVED.US.json', {});
  writeCorpusJson('analysis/KO.US.json', {}); writeCorpusJson('reports/KO.US/meta.json', { kind: '10-K' });
  writeCorpusJson('publish-repo/meta.json', { asOf: '2026-09-28', counts: { scored: 1, insufficient: 1 } });
  writeCorpusJson('prices/US.json', { 'NEW.US': [2, '2026-09-29', 'seed'] });
  writeCorpusJson('publish-repo/prices/US.json', { 'KO.US': [2, '2026-09-28'], '8058.JP': [3, '2026-09-28'] });
  appendJsonl('jev-usage.jsonl', { at: '2026-09-28T23:59:59Z', input_tokens: 99 });
  appendJsonl('jev-usage.jsonl', { at: '2026-09-29T00:00:00Z', input_tokens: 10 });
  expect(collectStatus()).toMatchObject({ universe: 3, fundamentals: 1, analysed: 1, reports: { '10-K': 1 }, published: { count: 2 }, prices: { eodhd: 1, yahoo: 1, seed: 1, missing: 0 }, jevTokens: 10 });
});
it.each([true, false])('runner continues after failures and gates publish on analyze: %s', analyzeFails => {
  const bin = path.join(root, 'bin'); mkdirSync(bin);
  // Stage process boundary: no paid network or real publish commands in this test.
  writeFileSync(path.join(bin, 'node'), `#!/usr/bin/env bash\nif [[ "$1" == "-e" ]]; then echo "$VALUE_CORPUS_DIR"; exit 0; fi\necho "$4" >> "$VALUE_CORPUS_DIR/stages"\n[[ "$4" == "prices" ]] && exit 1\n[[ "$4" == "analyze" && "${analyzeFails}" == "true" ]] && exit 1\nexit 0\n`, { mode: 0o755 });
  execFileSync('bash', ['scripts/value/run-daily.sh', '--once'], { env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, stdio: 'pipe' });
  const stages = readFileSync(path.join(root, 'stages'), 'utf8').trim().split('\n');
  expect(stages).toEqual(['prices', 'price-history', 'fundamentals', 'renormalize', 'dedupe', 'price-seed', 'reports', 'analyze', ...(analyzeFails ? [] : ['publish']), 'status']);
});
it('fetches never-seen history before stale history and observes persisted daily capacity', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-29T12:00:00Z'));
  for (const id of ['OLD.US', 'NEW.US']) {
    appendJsonl('universe.jsonl', company(id));
    writeCorpusJson(`fundamentals/${id}.json`, {});
  }
  writeCorpusJson('prices-history/OLD.US.json', { fetchedAt: '2020-01-01', prices: [['2019-01', 1]] });
  writeCorpusJson('usage/eodhd-2026-09-29.json', { date: '2026-09-29', used: 14999, history: 14999 });
  const requests: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    const route = new URL(url).pathname;
    if (route.endsWith('/user')) return Response.json({ apiRequests: 14999 });
    requests.push(route); return Response.json([{ date: '2026-09-28', close: 10 }]);
  });
  const first = history({}); await Promise.all([first, vi.runAllTimersAsync()]);
  const second = history({ force: true }); await Promise.all([second, vi.runAllTimersAsync()]);
  expect(requests).toEqual(['/api/eod/NEW.US']);
  expect(readCorpusJson('prices-history/OLD.US.json')).toEqual({ fetchedAt: '2020-01-01', prices: [['2019-01', 1]] });
});
it('charges five calls for each screener attempt', () => {
  reserveEodhd({ endpoint: 'screener' });
  expect(budgetUsage().used).toBe(5);
});
it('preserves a clear budget error without attempting a request', async () => {
  syncBudget(100000);
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  await expect(eodhd('fundamentals/KO.US')).rejects.toThrow('daily EODHD budget reached');
  expect(fetch).not.toHaveBeenCalled();
});
it.each(['live', 'dead'])('runner checks %s owner PID before acquiring the lock', owner => {
  const lock = path.join(root, 'daily-runner.lock'); mkdirSync(lock);
  const deadPid = execFileSync('bash', ['-c', 'echo $$'], { encoding: 'utf8' }).trim();
  writeFileSync(path.join(lock, 'pid'), owner === 'live' ? String(process.pid) : deadPid);
  const bin = path.join(root, 'bin'); mkdirSync(bin);
  writeFileSync(path.join(bin, 'node'), `#!/usr/bin/env bash\nif [[ "$1" == "-e" ]]; then echo "$VALUE_CORPUS_DIR"; exit 0; fi\necho "$4" >> "$VALUE_CORPUS_DIR/stages"\n`, { mode: 0o755 });
  const run = () => execFileSync('bash', ['scripts/value/run-daily.sh', '--once'], { env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, stdio: 'pipe' });
  if (owner === 'live') {
    expect(run).toThrow();
    expect(readFileSync(path.join(lock, 'pid'), 'utf8')).toBe(String(process.pid));
  } else {
    run();
    expect(readFileSync(path.join(root, 'stages'), 'utf8')).toContain('status');
  }
});

it('removes rejected legacy seeds locally and on the next publish, retaining actual closes', async () => {
  for (const id of ['BAD.US', 'REAL.US']) appendJsonl('universe.jsonl', company(id));
  writeCorpusJson('prices/US.json', { 'BAD.US': [100, '2026-09-29', 'seed'] });
  writeCorpusJson('publish-repo/prices/US.json', { 'BAD.US': [100, '2026-09-29', 'seed'], 'REAL.US': [50, '2026-09-29'] });
  await seed({});
  expect(readCorpusJson('prices/US.json')).toEqual({});
  mergeSeedFiles(corpusPath('publish-repo'));
  expect(readCorpusJson('publish-repo/prices/US.json')).toEqual({ 'REAL.US': [50, '2026-09-29'] });
});
