import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { companyEvents, earningsVolatility, valueHistory } from '@/lib/value/history';
import { parseEodHistory, parseYahooHistory } from '@/lib/value/price-history';
import type { Fundamentals } from '@/lib/value/types';
import { makeYears } from './synthetic';

beforeEach(() => vi.stubGlobal('fetch', () => { throw Error('Tests must not use network'); }));
afterEach(() => vi.unstubAllGlobals());
const fundamentals = (): Fundamentals => ({ id:'TEST.US',currency:'USD',years:makeYears({n:12}),fetchedAt:'2026-09-29',integrity:{ok:true,reasons:[]} });
it('keeps only fiscal years with sufficient prior earnings and never invents missing FX or yields', () => {
  const f = fundamentals(); f.years = makeYears({n:6});
  const args = {fundamentals:f,kind:'operating' as const,bondYield:0.04,fxRate:2,commodity:false};
  const history = valueHistory(args);
  expect(history.map(row => row[0])).toEqual([2017,2018]);
  // ROE 20% / discount 10% times book/share 50 times FX 2 = 200.
  expect(valueHistory({...args,kind:"bank"})[0][2]).toBeCloseTo(200);
  expect(valueHistory({...args,commodity:true})).toEqual([]);
  expect(valueHistory({...args,fxRate:null})).toEqual([]);
  expect(valueHistory({...args,bondYield:null})).toEqual([]);
  f.integrity.ok = false;
  expect(valueHistory(args)).toEqual([]);
});
it('handles event boundaries, a missing component, and nonconsecutive years', () => {
  const f = fundamentals(); f.years = makeYears({n:2,overrides:(_,i)=>({goodwill:i ? 80:100,intangibles:0,acquisitions:100})});
  expect(companyEvents(f)).toEqual([]);
  f.years[1].goodwill = 79;
  expect(companyEvents(f)).toMatchObject([{fy:2014,kind:'impairment'}]);
  f.years[1].intangibles = null;
  expect(companyEvents(f)).toMatchObject([{fy:2014,kind:'impairment'}]);
  f.years[1].goodwill = null;
  expect(companyEvents(f)).toEqual([]);
  f.years[1].goodwill = 79;
  f.years[1].intangibles = 0; f.years[1].fy = 2015;
  expect(companyEvents(f)).toEqual([]);
});
it.each([
  [0.2,'stable'],[0.200001,'moderate'],[0.35,'moderate'],[0.350001,'volatile'],[null,'volatile'],[NaN,'volatile'],
] as const)('classifies CV %s at the configured boundaries', (opMarginCv, expected) => {
  expect(earningsVolatility({opMarginCv})).toBe(expected);
  expect(earningsVolatility({opMarginCv,commodity:true})).toBe('volatile');
});
it('sorts monthly history, chooses the last date per month and drops invalid dates/prices', () => {
  expect(parseEodHistory([
    {date:'2025-02-01',close:20},{date:'2025-01-01',close:10},{date:'2025-01-31',close:12},
    {date:'2025-02-30',close:99},{date:'2025-03-01',close:null},{date:'2025-04-01',close:0},null,
  ])).toEqual([['2025-01',12],['2025-02',20]]);
  expect(parseYahooHistory({chart:{result:[{timestamp:[1735657200,1738335600],indicators:{quote:[{close:[10,null]}]}}],error:null}})).toEqual([['2025-01',10]]);
  expect(()=>parseYahooHistory({chart:{result:null,error:{code:'Not Found'}}})).toThrow(/Yahoo price history/);
});

 it('derives acquisition events and management spend from normalized balance-sheet growth', async () => {
  const { normalizeEodhd } = await import('@/lib/value/normalize-eodhd');
  const { run } = await import('@/lib/value/tests/management');
  const Income_Statement = { yearly: Object.fromEntries(Array.from({length: 6}, (_, i) => [`${2020+i}-12-31`, {currency_symbol:'USD'}])) };
  const Balance_Sheet = { yearly: Object.fromEntries(Array.from({length: 6}, (_, i) => [`${2020+i}-12-31`, {goodWill: 2e9 + i * 1.2e9, intangibleAssets: 0.5e9, totalAssets: 10e9}])) };
  const f = normalizeEodhd({Financials:{Income_Statement,Balance_Sheet}}, 'TEST.US').fundamentals;
  expect(f.years.map(y => y.acquisitions)).toEqual([null,1.2e9,1.2e9,1.2e9,1.2e9,1.2e9]);
  expect(f.years.slice(1).every(y => y.acquisitionsProxy === true)).toBe(true);
  expect(companyEvents(f).filter(e => e.kind === 'acquisition')).toHaveLength(5);
  expect(companyEvents(f)[0].note).toContain('acquired goodwill and intangibles (proxy)');
  const result = run({years:f.years,kind:'operating'});
  expect(result.metrics.acquisitionSpend).toBe(6e9);
  expect(result.reasons).toContain('insufficient data: acquired goodwill and intangibles (proxy) alongside declining ROIC');
  const unknown = f.years.map(y => ({...y, acquisitions:null, ocf:1e9}));
  expect(run({years:unknown,kind:'operating'}).metrics.acquisitionSpend).toBeNull();
 });
 it('requires adjacent known balances for the proxy and tolerates one missing component', async () => {
  const { normalizeEodhd } = await import('@/lib/value/normalize-eodhd');
  const balances = [ {goodWill:2e9}, {intangibleAssets:3e9}, {goodWill:2e9}, {}, undefined, {goodWill:4e9} ];
  const yearly = Object.fromEntries(balances.map((_,i) => [`${2020+i}-12-31`, {}]));
  const f = normalizeEodhd({Financials:{Income_Statement:{yearly},Balance_Sheet:{yearly:Object.fromEntries(balances.map((b,i)=>[`${2020+i}-12-31`,b]))}}},'TEST.US').fundamentals;
  expect(f.years.map(y=>y.acquisitions)).toEqual([null,1e9,0,null,null,null]);
  delete yearly['2021-12-31'];
  const gap = normalizeEodhd({Financials:{Income_Statement:{yearly},Balance_Sheet:{yearly:{'2020-12-31':{goodWill:2e9},'2022-12-31':{goodWill:5e9}}}}},'TEST.US').fundamentals;
  expect(gap.years[1].acquisitions).toBeNull();
 });
