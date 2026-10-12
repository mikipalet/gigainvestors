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
      benchmarks: { SPY: [['2026-10-09', 100], ['2026-11-12', 105]], EFA: [['2026-10-12', 50], ['2026-11-11', 49]] } });
    expect(score.basketReturn).toBeCloseTo((0.1 + 0) / 2);
    expect(score.westernBasketReturn).toBeCloseTo(0.1);
    expect(score.benchmarks.SPY).toMatchObject({ start: '2026-10-09', end: '2026-11-12' });
    expect(score.benchmarks.SPY!.return).toBeCloseTo(.05);
    expect(score.vs.EFA).toBeCloseTo(.05 + .02);
    expect(score.staleQuotes).toEqual([]);
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
