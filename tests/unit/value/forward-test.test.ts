import { describe, expect, it } from 'vitest';
import { buyListSnapshot, closeOn, scoreForwardTest } from '@/lib/value/forward-test';
import type { IndexRow, PriceMap } from '@/lib/value/types';

const row = (id: string, b: boolean, mid = 100, w: string | null = id): IndexRow => ({ id, n: id, c: 'US', s: null, k: 'operating', mc: null, v: [80, mid, 120], cur: 'USD', t: 'FPPPP', pr: 'P', g: [], h: 0, st: 's', w, b, methodVersion: '3.8.0' });

describe('3.8.0 forward test', () => {
  const rows = [row('A.US', true), row('B.L', true, 50, null), row('C.US', false)];
  const prices: PriceMap = { 'A.US': [90, '2026-10-09'], 'B.L': [40, '2026-10-10'], 'C.US': [120, '2026-10-09'] };
  const snapshot = buyListSnapshot({ date: '2026-10-12', rows, prices, methodVersion: '3.8.0', publishCommit: 'abc', publishedAsOf: '2026-10-12' });
  it('freezes exactly the published Buy rows with quote, currency, date and central value', () => {
    expect(snapshot.companies.map(c => c.id)).toEqual(['A.US', 'B.L']);
    expect(snapshot.companies[0]).toMatchObject({ ticker: 'A', price: 90, currency: 'USD', priceDate: '2026-10-09', centralValue: 100, priceToValue: .9, western: true, methodVersion: '3.8.0' });
    expect(snapshot.companies[1].western).toBe(false);
    expect(snapshot).toMatchObject({ weighting: 'equal', rebalancing: 'none', archive: { publishCommit: 'abc' }, benchmarks: ['SPY', 'EFA'] });
  });
  it('refuses a Buy without a quote, a value or a method; keeps a frozen record\'s method', () => {
    expect(() => buyListSnapshot({ date: '2026-10-12', rows, prices: { 'A.US': [90, '2026-10-09'] }, methodVersion: '3.8.0', publishCommit: null, publishedAsOf: null })).toThrow(/B.L/);
    expect(buyListSnapshot({ date: '2026-10-12', rows: [{ ...rows[0], methodVersion: '3.2.0' }], prices, methodVersion: '3.8.0', publishCommit: null, publishedAsOf: null }).companies[0].methodVersion).toBe('3.2.0');
    expect(() => buyListSnapshot({ date: '2026-10-12', rows: [{ ...rows[0], methodVersion: undefined }], prices, methodVersion: '3.8.0', publishCommit: null, publishedAsOf: null })).toThrow(/method/);
  });
  it('scores the equal-weight basket since the snapshot against the same-dated benchmark', () => {
    const later: PriceMap = { 'A.US': [99, '2026-11-12'], 'B.L': [20, '2026-11-12'] };
    const score = scoreForwardTest({ snapshot, prices: later, splitFactors: { 'B.L': 2 }, asOf: '2026-11-12',
      benchmarks: { SPY: [['2026-10-09', 100], ['2026-11-12', 105]], EFA: [['2026-10-09', 50], ['2026-11-11', 49]] } });
    expect(score.basketReturn).toBeCloseTo((0.1 + 0) / 2);
    expect(score.westernBasketReturn).toBeCloseTo(0.1);
    expect(score.benchmarks.SPY).toMatchObject({ start: '2026-10-09', end: '2026-11-12' });
    expect(score.benchmarks.SPY!.return).toBeCloseTo(.05);
    expect(score.vs.EFA).toBeCloseTo(.05 + .02);
    expect(score.staleQuotes).toEqual([]);
  });
  it('measures the benchmark over each holding\'s own quote dates, not from the snapshot date', () => {
    // Frozen at Friday 10-09 / 10-10 closes, snapshot dated Monday 10-12: the benchmark's Friday-to-Monday move counts too.
    const score = scoreForwardTest({ snapshot, prices: { 'A.US': [90, '2026-10-12'], 'B.L': [40, '2026-10-12'] }, asOf: '2026-10-12',
      benchmarks: { SPY: [['2026-10-09', 100], ['2026-10-12', 102]], EFA: [['2026-10-09', 50], ['2026-10-12', 50]] } });
    expect(score.basketReturn).toBeCloseTo(0);
    expect(score.benchmarks.SPY).toMatchObject({ start: '2026-10-09', end: '2026-10-12' });
    expect(score.benchmarks.SPY!.return).toBeCloseTo(.02);
    expect(score.vs.SPY).toBeCloseTo(-.02);
  });
  it('reports no benchmark when its history does not cover a holding\'s quote dates', () => {
    const score = scoreForwardTest({ snapshot, prices: { 'A.US': [99, '2026-11-12'], 'B.L': [40, '2026-11-12'] }, asOf: '2026-11-12',
      benchmarks: { SPY: [['2026-10-12', 100], ['2026-11-12', 105]] } });
    expect(score.benchmarks.SPY).toBeNull();
  });
  it('keeps a company without a newer quote at its frozen price rather than dropping it', () => {
    const score = scoreForwardTest({ snapshot, prices: { 'A.US': [110, '2026-11-12'] }, asOf: '2026-11-12', benchmarks: {} });
    expect(score.companies).toBe(2);
    expect(score.staleQuotes).toEqual(['B.L']);
    expect(score.basketReturn).toBeCloseTo((110 / 90 - 1) / 2);
    expect(score.benchmarks.SPY).toBeNull();
  });
  it('finds the last close on or before a date', () => {
    expect(closeOn([['2026-10-08', 1], ['2026-10-09', 2], ['2026-10-13', 3]], '2026-10-12')).toEqual(['2026-10-09', 2]);
    expect(closeOn([['2026-10-13', 3]], '2026-10-12')).toBeNull();
  });
});

describe('forward-test corrections', () => {
  const rows = [row('A.US', true), row('B.L', true, 50, null), row('P.US', true, 569)];
  const prices: PriceMap = { 'A.US': [90, '2026-10-09'], 'B.L': [40, '2026-10-10'], 'P.US': [30, '2026-10-09'] };
  const snapshot = buyListSnapshot({ date: '2026-10-12', rows, prices, methodVersion: '3.8.0', publishCommit: 'abc', publishedAsOf: '2026-10-12' });
  const line = (id: string, action: string) => JSON.stringify({ date: '2026-10-12', list: '2026-10-12-buy-list.json', id, action, reason: 'input error', source: 'https://www.sec.gov/x', methodVersion: '3.8.1' });
  it('scores the frozen basket unchanged and the corrected basket without removed names', async () => {
    const { correctedSnapshot, parseCorrections } = await import('@/lib/value/forward-test');
    const corrections = parseCorrections(`${line('P.US', 'remove')}\n${line('A.US', 'keep')}\n`);
    const corrected = correctedSnapshot(snapshot, '2026-10-12-buy-list.json', corrections);
    expect(corrected.removed).toEqual(['P.US']);
    expect(corrected.kept).toEqual(['A.US']);
    expect(corrected.snapshot.companies.map(c => c.id)).toEqual(['A.US', 'B.L']);
    expect(snapshot.companies.map(c => c.id)).toEqual(['A.US', 'B.L', 'P.US']);
    expect(correctedSnapshot(snapshot, '2027-01-01-buy-list.json', corrections).removed).toEqual([]);
  });
  it('rejects incomplete lines and names outside the list', async () => {
    const { correctedSnapshot, parseCorrections } = await import('@/lib/value/forward-test');
    expect(() => parseCorrections('{"date":"2026-10-12","id":"P.US","action":"remove"}')).toThrow(/line 1/);
    expect(() => correctedSnapshot(snapshot, '2026-10-12-buy-list.json', parseCorrections(line('Z.US', 'remove')))).toThrow(/Z.US/);
  });
});
