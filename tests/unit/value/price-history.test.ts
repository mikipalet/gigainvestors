import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import eod from "../../fixtures/value/history/eodhd-KO.json";
import yahoo from "../../fixtures/value/history/yahoo-8058.json";
import { appendJsonl, readCorpusJson, writeCorpusJson } from "@/lib/value/corpus";
import type { Company, PriceHistory } from "@/lib/value/types";
import priceHistory from "@/scripts/value/stages/price-history";

let root: string;
const company = (id: string): Company => ({ id, code: id.split('.')[0], name: id, listings: [id], exchange: id.split('.')[1], country: 'US', currency: 'USD', kind: 'operating', source: 'eodhd', cik: null, isin: null, lei: null, edinetCode: null, sector: null, industry: null, marketCapUsd: null, description: null });
beforeEach(() => {
  const base = join(homedir(), 'value-corpus'); mkdirSync(base, { recursive: true });
  root = mkdtempSync(join(base, 'history-test-')); vi.stubEnv('VALUE_CORPUS_DIR', root); vi.stubEnv('EODHD_API_KEY', 'fixture');
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-29T12:00:00Z'));
  vi.stubGlobal('fetch', () => { throw Error('Unexpected network'); });
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); rmSync(root, { recursive: true, force: true }); });
async function run(options = {}) { const work = priceHistory(options); await Promise.all([work, vi.runAllTimersAsync()]); }

it('records monthly closes in order with the requested ten-year URL and skips fresh history', async () => {
  appendJsonl('universe.jsonl', company('KO.US'));
  const urls: URL[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    const parsed = new URL(url); urls.push(parsed);
    if (parsed.pathname.endsWith('/user')) return Response.json({ apiRequests: 2 });
    expect(parsed.pathname).toBe('/api/eod/KO.US');
    expect(parsed.searchParams.get('period')).toBe('m'); expect(parsed.searchParams.get('from')).toBe('2016-09-29');
    return Response.json(eod);
  });
  await run();
  const history = readCorpusJson<{ fetchedAt: string; prices: PriceHistory }>('prices-history/KO.US.json')!;
  expect(history.prices).toHaveLength(121);
  expect(history.prices[0]).toEqual(['2016-09',42.32]); expect(history.prices.at(-1)).toEqual(['2026-09',87.18]);
  urls.length = 0;
  await run(); expect(urls).toHaveLength(0);
  await run({ force: true }); expect(urls.filter(url => url.pathname.includes('/eod/'))).toHaveLength(1);
});

it('refreshes expired rows, filters before limit, and stops at the shared daily budget', async () => {
  for (const id of ['OLD.US','KO.US','NEXT.US']) appendJsonl('universe.jsonl', company(id));
  writeCorpusJson('prices-history/KO.US.json',{ fetchedAt: '2026-09-22T11:59:59Z', prices: [['2020-01',1]] });
  writeCorpusJson('prices-history/NEXT.US.json',{ fetchedAt: '2026-09-22T11:59:59Z', prices: [['2020-01',2]] });
  vi.stubGlobal('fetch', async (url: string) => {
    if (new URL(url).pathname.endsWith('/user')) return Response.json({ apiRequests: 98999 });
    expect(new URL(url).pathname).toBe('/api/eod/KO.US'); return Response.json(eod);
  });
  await run({ only: ['KO.US','NEXT.US'], limit: 2 });
  expect(readCorpusJson<{prices: PriceHistory}>('prices-history/KO.US.json')?.prices[0][1]).toBe(42.32);
  expect(readCorpusJson<{prices:PriceHistory}>('prices-history/NEXT.US.json')?.prices).toEqual([['2020-01',2]]); expect(readCorpusJson('prices-history/OLD.US.json')).toBeNull();
});

it('uses Japanese local month and Yahoo ten-year monthly closes without EODHD budget calls', async () => {
  appendJsonl('universe.jsonl', company('8058.JP'));
  vi.stubGlobal('fetch', async (url: string) => {
    expect(url).toBe('https://query1.finance.yahoo.com/v8/finance/chart/8058.T?range=10y&interval=1mo');
    return Response.json(yahoo);
  });
  await run();
  expect(readCorpusJson<{prices: PriceHistory}>('prices-history/8058.JP.json')?.prices[0]).toEqual(['2016-10',763.6666870117188]);
});

it('skips bad provider responses without replacing a cached file', async () => {
  appendJsonl('universe.jsonl', company('KO.US'));
  const previous = { fetchedAt:'2000-01-01', prices:[['2020-01',42]] };
  writeCorpusJson('prices-history/KO.US.json',previous);
  vi.stubGlobal('fetch', async (url: string) => Response.json(url.includes('/user?') ? { apiRequests: 0 } : { error: 'bad response' }));
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  await run();
  expect(log).toHaveBeenCalledWith(expect.stringContaining('KO.US'), expect.anything());
  expect(readCorpusJson('prices-history/KO.US.json')).toEqual(previous);
});

it('continues after failures, resets the streak on success, and stops at 20 consecutive failures', async () => {
  for (let i=0; i<42; i++) appendJsonl('universe.jsonl', company(`C${i}.US`));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const requested: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    const path = new URL(url).pathname;
    if (path.endsWith('/user')) return Response.json({apiRequests:0});
    requested.push(path);
    return Response.json(path.endsWith('/C19.US') ? eod : {error:'unavailable'});
  });
  await run();
  expect(readCorpusJson('prices-history/C19.US.json')).not.toBeNull();
  expect(readCorpusJson('prices-history/C0.US.json')).toBeNull();
  expect(requested).toHaveLength(40);
  expect(requested.at(-1)).toBe('/api/eod/C39.US');
});
it('counts failed EODHD attempts against the daily budget', async () => {
  for (const id of ['BAD.US','NEXT.US']) appendJsonl('universe.jsonl', company(id));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const requested: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    const path = new URL(url).pathname;
    if (path.endsWith('/user')) return Response.json({apiRequests:98999});
    requested.push(path); return Response.json({error:'unavailable'});
  });
  await run();
  expect(requested).toEqual(['/api/eod/BAD.US']);
});

it('skips a failed Yahoo request and writes the next company', async () => {
  for (const id of ['BAD.JP','8058.JP']) appendJsonl('universe.jsonl', company(id));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('fetch', async (url: string) => url.includes('BAD.T') ? new Response('', {status:404}) : Response.json(yahoo));
  await run();
  expect(readCorpusJson('prices-history/BAD.JP.json')).toBeNull();
  expect(readCorpusJson('prices-history/8058.JP.json')).not.toBeNull();
});
