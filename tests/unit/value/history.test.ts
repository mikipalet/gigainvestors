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
it('does not flag exact event boundaries, missing components, or nonconsecutive years', () => {
  const f = fundamentals(); f.years = makeYears({n:2,overrides:(_,i)=>({goodwill:i ? 80:100,intangibles:0,acquisitions:100})});
  expect(companyEvents(f)).toEqual([]);
  f.years[1].goodwill = 79;
  expect(companyEvents(f)).toMatchObject([{fy:2014,kind:'impairment'}]);
  f.years[1].intangibles = null;
  expect(companyEvents(f)).toEqual([]);
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
