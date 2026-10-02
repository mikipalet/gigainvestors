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
it('preserves actual screener closes when publishing and rejects older quotes', async () => {
  for (const id of ['KO.US', 'NEW.US']) {
    appendJsonl('universe.jsonl', company(id));
    writeCorpusJson(`raw/eodhd/${id}.json`, { Highlights: { MarketCapitalization: 500 }, SharesStats: { SharesOutstanding: 20 } });
    utimesSync(corpusPath(`raw/eodhd/${id}.json`), new Date('2026-09-20'), new Date('2026-09-20'));
  }
  writeCorpusJson('raw/eodhd/universe/screener-US-0.json', { date: '2026-09-20', data: ['KO', 'NEW'].map(code => ({ code, exchange: 'US', adjusted_close: 25 })) });
  await seed({});
  expect(readCorpusJson('prices/US.json')).toEqual({ 'KO.US': [25, '2026-09-20'], 'NEW.US': [25, '2026-09-20'] });
  writeCorpusJson('publish-repo/prices/US.json', { 'KO.US': [24, '2026-09-19'] });
  mergeSeedFiles(corpusPath('publish-repo'));
  vi.stubEnv('VALUE_STORE_DIR', corpusPath('publish-repo'));
  expect(await getPrice('KO.US', 'US')).toEqual([24, '2026-09-19']);
  expect(await getPrice('NEW.US', 'US')).toEqual([25, '2026-09-20']);
  await refreshPrices({ repo: corpusPath('publish-repo'), companies: [company('NEW.US')], bulk: async () => [{ code: 'NEW', close: 23, date: '2026-09-19' }] });
  expect(await getPrice('NEW.US', 'US')).toEqual([25, '2026-09-20']);
  mergeSeedFiles(corpusPath('publish-repo'));
  expect(await getPrice('NEW.US', 'US')).toEqual([25, '2026-09-20']);
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
function runner({ analyzeFails = false, yieldsFails = false, japanFails = false, japanSkipped = false, resetFails = false, thesisFails = false } = {}) {
  const bin = path.join(root, 'bin'); mkdirSync(bin, { recursive: true });
  // Stub only paid/publishing stage processes; execute runner bookkeeping with real node.
  writeFileSync(path.join(bin, 'node'), `#!${process.execPath}
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const args = process.argv.slice(2);
if (args[2] !== 'scripts/value/cli.ts') {
  const result = spawnSync(${JSON.stringify(process.execPath)}, args, { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}
const [stage, ...flags] = args.slice(3);
fs.appendFileSync(process.env.VALUE_CORPUS_DIR + '/stages', JSON.stringify([stage, ...flags]) + '\\n');
if (stage === 'japan' && !${japanSkipped}) {
  const from = flags.find(f => f.startsWith('--from=')).slice(7);
  const to = flags.find(f => f.startsWith('--to=')).slice(5);
  fs.mkdirSync(process.env.VALUE_CORPUS_DIR + '/raw/edinet', { recursive: true });
  fs.writeFileSync(process.env.VALUE_CORPUS_DIR + '/raw/edinet/summary.json', JSON.stringify({ from, to, errors: ${japanFails} ? [{ id: '8058.JP' }] : [] }));
}
process.exit((stage === 'thesis' && ${thesisFails}) || (stage === 'wait-eodhd-reset' && ${resetFails}) || (stage === 'yields' && ${yieldsFails}) || stage === 'prices' || (stage === 'analyze' && ${analyzeFails}) || (stage === 'japan' && ${japanFails}) ? 1 : 0);
`, { mode: 0o755 });
  return () => execFileSync('bash', ['scripts/value/run-daily.sh', '--once'], { env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, stdio: 'pipe' });
}
const stageCalls = (): string[][] => readFileSync(path.join(root, 'stages'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
it.each([true, false])('runner publishes available data after analysis or price failures: %s', analyzeFails => {
  runner({ analyzeFails })();
  const calls = stageCalls();
  expect(calls.find(([stage])=>stage==='price-story')).toEqual(['price-story','--limit=400']);
  expect(calls.map(([stage]) => stage)).toEqual(['japan', 'wait-eodhd-reset', 'fundamentals', 'prices', 'price-history', 'price-story', 'fundamentals', 'renormalize', 'renormalize-edinet', 'dedupe', 'price-seed', 'reports', 'yields', 'analyze', 'business-backfill', 'share-checks', 'thesis', 'publish', 'status']);
  // No --only or --limit: newly imported JP issuers and all other sources are covered.
  expect(calls.filter(([stage]) => ['prices', 'price-history', 'reports', 'yields', 'analyze', 'publish'].includes(stage)).every(call => call.length === 1)).toBe(true);
});
it('runner resumes from the last successful filing day, refreshes it, and advances only after success', () => {
  const today = new Date().toISOString().slice(0, 10);
  writeCorpusJson('raw/edinet/summary.json', { from: '2024-09-01', to: '2026-09-27', errors: [] });
  writeCorpusJson('raw/edinet/days/2026-09-27.json', { incomplete: true });
  runner()();
  expect(stageCalls()[0]).toEqual(['japan', '--from=2026-09-27', `--to=${today}`]);
  expect(readCorpusJson('raw/edinet/days/2026-09-27.json')).toBeNull();
  runner()();
  expect(stageCalls().filter(([stage]) => stage === 'japan')[1]).toEqual(['japan', `--from=${today}`, `--to=${today}`]);
});
it.each(['failure', 'skipped', 'interrupted'])('runner retains the pending filing range after Japan is %s', outcome => {
  const today = new Date().toISOString().slice(0, 10);
  writeCorpusJson('raw/edinet/summary.json', { from: '2024-09-01', to: '2026-09-27', errors: [] });
  if (outcome === 'interrupted') {
    writeCorpusJson('raw/edinet/daily-range.json', { from: '2026-09-26', to: '2026-09-28' });
    writeCorpusJson('raw/edinet/days/2026-09-28.json', { incomplete: true });
  }
  runner({ japanFails: outcome === 'failure', japanSkipped: outcome !== 'failure' })();
  const from = outcome === 'interrupted' ? '2026-09-26' : '2026-09-27';
  runner()();
  expect(stageCalls().filter(([stage]) => stage === 'japan')).toEqual([
    ['japan', `--from=${from}`, `--to=${today}`], ['japan', `--from=${from}`, `--to=${today}`],
  ]);
  expect(stageCalls().some(([stage]) => stage === 'status')).toBe(true);
  if (outcome === 'interrupted') expect(readCorpusJson('raw/edinet/days/2026-09-28.json')).toBeNull();
});
it('runner retries an existing failed Japan summary from its original start day', () => {
  const today = new Date().toISOString().slice(0, 10);
  writeCorpusJson('raw/edinet/summary.json', { from: '2026-09-25', to: '2026-09-27', errors: [{ id: '8058.JP' }] });
  runner()();
  expect(stageCalls()[0]).toEqual(['japan', '--from=2026-09-25', `--to=${today}`]);
});
it('fetches never-seen history before stale history and observes persisted daily capacity', async () => {
  vi.resetModules();
  const { default: history } = await import('@/scripts/value/stages/price-history');
  const today = new Date().toISOString().slice(0,10);
  vi.useFakeTimers();
  for (const id of ['OLD.US', 'NEW.US']) {
    appendJsonl('universe.jsonl', company(id));
    writeCorpusJson(`fundamentals/${id}.json`, {});
  }
  writeCorpusJson('prices-history/OLD.US.json', { fetchedAt: '2020-01-01', prices: [['2019-01', 1]] });
  writeCorpusJson(`usage/eodhd-${today}.json`, { date: today, used: 14999, history: 14999 });
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
  const run = runner();
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

it('runner still publishes when refreshing yields fails',()=>{
 runner({yieldsFails:true})();
 const calls=stageCalls().map(([stage])=>stage);
 expect(calls).toContain('yields');expect(calls).not.toContain('analyze');expect(calls).toContain('publish');expect(calls.at(-1)).toBe('status');
});
it('runner skips all EODHD-consuming stages when reset waiting fails', () => {
  expect(runner({ resetFails: true })).toThrow();
  const stages = stageCalls().map(([stage]) => stage);
  expect(stages).toContain('wait-eodhd-reset');
  expect(stages).not.toContain('prices');
  expect(stages).not.toContain('price-history');
  expect(stages).not.toContain('fundamentals');
  expect(stages).not.toContain('analyze'); // Analysis can fetch paid FX rates.
  expect(stages).toContain('publish');
  expect(stages).toContain('status');
});

it('bounds thesis before publication and skips publication on thesis failure', () => {
 runner({thesisFails:true})();
 expect(stageCalls()).toContainEqual(['thesis','--limit=12']);
 expect(stageCalls().map(([stage])=>stage)).not.toContain('publish');
});
it('reserves five calls for news and refuses a request with only four left',()=>{
 const date=new Date().toISOString().slice(0,10);
 writeCorpusJson(`usage/eodhd-${date}.json`,{date,used:99990,history:0});
 reserveEodhd({endpoint:'news'});
 expect(budgetUsage().used).toBe(99995);
 writeCorpusJson(`usage/eodhd-${date}.json`,{date,used:99996,history:0});
 expect(()=>reserveEodhd({endpoint:'news'})).toThrow('daily EODHD budget');
});
