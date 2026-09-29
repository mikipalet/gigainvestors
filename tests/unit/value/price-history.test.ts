import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import eod from "../../fixtures/value/history/eodhd-KO.json";
import yahoo from "../../fixtures/value/history/yahoo-8058.json";
import { appendJsonl, readJsonl, readCorpusJson, writeCorpusJson } from "@/lib/value/corpus";
import type { Company, PriceHistory } from "@/lib/value/types";
import { parseYahooHistory, yahooSymbol } from "@/lib/value/price-history";
import priceHistory from "@/scripts/value/stages/price-history";

let root: string;
const company = (id: string): Company => ({ id, code: id.split('.')[0], name: id, listings: [id], exchange: id.split('.')[1], country: 'US', currency: 'USD', kind: 'operating', source: 'eodhd', cik: null, isin: null, lei: null, edinetCode: null, sector: null, industry: null, marketCapUsd: null, description: null });
beforeEach(() => {
  const base = tmpdir();
  root = mkdtempSync(join(base, 'history-test-')); vi.stubEnv('VALUE_CORPUS_DIR', root); vi.stubEnv('EODHD_API_KEY', 'fixture');
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-29T12:00:00Z'));
  vi.stubGlobal('fetch', () => { throw Error('Unexpected network'); });
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); rmSync(root, { recursive: true, force: true }); });
async function run(options = {}) {
  for (const c of readJsonl<Company>('universe.jsonl')) writeCorpusJson(`fundamentals/${c.id}.json`, { id: c.id });
  const work = priceHistory(options); await Promise.all([work, vi.runAllTimersAsync()]); }

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
  const history = readCorpusJson<PriceHistory>('prices-history/KO.US.json')!;
  expect(history).toHaveLength(121);
  expect(history[0]).toEqual(['2016-09',42.32]); expect(history.at(-1)).toEqual(['2026-09',87.18]);
  urls.length = 0;
  await run(); expect(urls).toHaveLength(0);
  await run({ force: true }); expect(urls.filter(url => url.pathname.includes('/eod/'))).toHaveLength(1);
});

it('refreshes expired rows, filters before limit, and switches to Yahoo at the shared daily budget', async () => {
  for (const id of ['OLD.US','KO.US','NEXT.US']) appendJsonl('universe.jsonl', company(id));
  writeCorpusJson('prices-history/KO.US.json',{ fetchedAt: '2026-09-22T11:59:59Z', prices: [['2020-01',1]] });
  writeCorpusJson('prices-history/NEXT.US.json',{ fetchedAt: '2026-09-22T11:59:59Z', prices: [['2020-01',2]] });
  vi.stubGlobal('fetch', async (url: string) => {
    if (new URL(url).pathname.endsWith('/user')) return Response.json({ apiRequests: 99999 });
    if (new URL(url).pathname === '/api/eod/KO.US') return Response.json(eod);
    expect(new URL(url).pathname).toBe('/v8/finance/chart/NEXT'); return Response.json(yahoo);
  });
  await run({ only: ['KO.US','NEXT.US'], limit: 2 });
  expect(readCorpusJson<PriceHistory>('prices-history/KO.US.json')?.[0][1]).toBe(42.32);
  expect(readCorpusJson<PriceHistory>('prices-history/NEXT.US.json')?.[0]).toEqual(['2016-10',763.6666870117188]); expect(readCorpusJson('prices-history/OLD.US.json')).toBeNull();
});

it('uses Japanese local month and Yahoo ten-year monthly closes without EODHD budget calls', async () => {
  appendJsonl('universe.jsonl', company('8058.JP'));
  vi.stubGlobal('fetch', async (url: string) => {
    expect(url).toBe('https://query1.finance.yahoo.com/v8/finance/chart/8058.T?range=10y&interval=1mo');
    return Response.json(yahoo);
  });
  await run();
  expect(readCorpusJson<PriceHistory>('prices-history/8058.JP.json')?.[0]).toEqual(['2016-10',763.6666870117188]);
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
    if (path.endsWith('/user')) return Response.json({apiRequests:99999});
    requested.push(path); return Response.json({error:'unavailable'});
  });
  await run();
  expect(requested).toEqual(['/api/eod/BAD.US', '/v8/finance/chart/NEXT']);
});

it('skips a failed Yahoo request and writes the next company', async () => {
  for (const id of ['BAD.JP','8058.JP']) appendJsonl('universe.jsonl', company(id));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('fetch', async (url: string) => url.includes('BAD.T') ? new Response('', {status:404}) : Response.json(yahoo));
  await run();
  expect(readCorpusJson('prices-history/BAD.JP.json')).toBeNull();
  expect(readCorpusJson('prices-history/8058.JP.json')).not.toBeNull();
});

it('C7 falls back immediately on an exhausted budget and uses padded HK symbols', async () => {
  appendJsonl('universe.jsonl', company('700.HK'));
  vi.stubGlobal('fetch', async (url: string, options: RequestInit) => {
    if (new URL(url).pathname.endsWith('/user')) return Response.json({apiRequests: 100001});
    expect(url).toBe('https://query1.finance.yahoo.com/v8/finance/chart/0700.HK?range=10y&interval=1mo');
    expect(options.headers).toMatchObject({'User-Agent': expect.stringContaining('Mozilla')});
    return Response.json(yahoo);
  });
  await run();
  expect(readCorpusJson<PriceHistory>('prices-history/700.HK.json')?.length).toBeGreaterThan(100);
});

it.each([
  ["KO.US", "KO", 42.400001525878906, 87.18000030517578],
  ["NESN.SW", "NESN.SW", 71.75, 76.91999816894531],
  ["0700.HK", "0700.HK", 189.7180633544922, 432],
  ["2330.TW", "2330.TW", 188.5, 2475],
  ["VALE3.SA", "VALE3.SA", 22.079999923706055, 71.16000366210938],
])('C7 parses recorded live %s history with exchange-local month boundaries', (id, symbol, first, last) => {
  expect(yahooSymbol(company(String(id)))).toBe(symbol);
  const raw = JSON.parse(readFileSync(join(process.cwd(), `tests/fixtures/value/history/yahoo-${id}.json`), 'utf8'));
  const prices = parseYahooHistory(raw);
  expect(prices).toHaveLength(120);
  expect(prices[0]).toEqual(['2016-10', first]);
  expect(prices.at(-1)).toEqual(['2026-09', last]);
});

it.each([
  ['BRK.B', 'US', 'BRK-B'], ['ENI', 'MI', 'ENI.MI'], ['AIR', 'NZ', 'AIR.NZ'],
  ['7203', 'JP', '7203.T'], ['BHP', 'AU', 'BHP.AX'], ['005930', 'KO', '005930.KS'],
])('C7 maps %s on %s to Yahoo %s', (code, exchange, want) => {
  expect(yahooSymbol({code, exchange})).toBe(want);
});

it('C7 rejects unknown exchanges instead of requesting a US namesake', () => {
  expect(() => yahooSymbol({code: 'TEST', exchange: 'UNKNOWN'})).toThrow('Unsupported Yahoo exchange');
});
it('records unavailable Japanese symbols without starving later history or replacing old prices',async()=>{
  for(let i=0;i<21;i++) appendJsonl('universe.jsonl',company(`MISSING${i}.JP`));
  appendJsonl('universe.jsonl',company('8058.JP'));
  writeCorpusJson('prices-history/MISSING0.JP.json',[['2020-01',42]]);
  vi.spyOn(console,'error').mockImplementation(()=>{});
  vi.stubGlobal('fetch',async (url:string)=>url.includes('/8058.T?') ? Response.json(yahoo) : new Response('',{status:404}));
  await run();
  expect(readCorpusJson('prices-history/8058.JP.json')).not.toBeNull();
  expect(readCorpusJson('prices-history/MISSING0.JP.json')).toEqual([['2020-01',42]]);
  expect(readCorpusJson('prices-history/meta/MISSING1.JP.json')).toMatchObject({status:'unavailable'});
  vi.stubGlobal('fetch',()=>{throw new Error('fresh unavailability should be cached')});
  await run();
  expect(readCorpusJson('prices-history/meta/MISSING1.JP.json')).toMatchObject({status:'unavailable'});
});
