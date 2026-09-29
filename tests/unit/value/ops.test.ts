import { afterEach, expect, it, vi } from 'vitest';
import { dailyBudgetSplit } from '@/lib/value/budget';
import { seedPrice, mergeSeed } from '@/lib/value/price-seed';
import { T } from '@/lib/value/config';

afterEach(() => vi.restoreAllMocks());
it('allocates bulk prices, capped history, then whole fundamentals requests', () => {
  const split = dailyBudgetSplit({ exchanges: 55, used: 0, historyUsed: 0 });
  expect(split).toEqual({ prices: 5500, history: 15000, fundamentals: 79500 });
  expect(split.prices + split.history + split.fundamentals).toBe(T.budget.dailyCalls);
});
it('accounts for spent budget and history already fetched today', () => {
  expect(dailyBudgetSplit({ exchanges: 1, used: 99985, historyUsed: 15000 })).toEqual({ prices: 0, history: 0, fundamentals: 10 });
  expect(dailyBudgetSplit({ exchanges: 0, used: 50000, historyUsed: 14999 })).toEqual({ prices: 0, history: 1, fundamentals: 49990 });
  expect(dailyBudgetSplit({ exchanges: 55, used: 100500, historyUsed: 0 })).toEqual({ prices: 0, history: 0, fundamentals: 0 });
});
it('seeds in the raw trading currency using the fetch date, without rounding', () => {
  expect(seedPrice({ raw: { Highlights: { MarketCapitalization: 375096213504 }, SharesStats: { SharesOutstanding: 4302549243 } }, fetchedAt: '2026-09-29T10:30:08Z' })).toEqual([375096213504 / 4302549243, '2026-09-29', 'seed']);
  expect(seedPrice({ raw: { General: { CurrencyCode: 'EUR' }, Highlights: { MarketCapitalization: 590361722880 }, SharesStats: { SharesOutstanding: 384100000 } }, fetchedAt: '2026-09-28T23:59:00Z' })).toEqual([590361722880 / 384100000, '2026-09-28', 'seed']);
});
it.each([0, -1, null, undefined, Infinity, '100'])('rejects invalid cap or shares: %s', value => {
  expect(seedPrice({ raw: { Highlights: { MarketCapitalization: value }, SharesStats: { SharesOutstanding: 10 } }, fetchedAt: '2026-09-29' })).toBeNull();
  expect(seedPrice({ raw: { Highlights: { MarketCapitalization: 100 }, SharesStats: { SharesOutstanding: value } }, fetchedAt: '2026-09-29' })).toBeNull();
});
it('rejects invalid dates and nonfinite division', () => {
  expect(seedPrice({ raw: {}, fetchedAt: 'bad' })).toBeNull();
  expect(seedPrice({ raw: { Highlights: { MarketCapitalization: 1e308 }, SharesStats: { SharesOutstanding: 1e-308 } }, fetchedAt: '2026-09-29' })).toBeNull();
});
it('never overwrites real closes and only replaces older seeds', () => {
  expect(mergeSeed([80, '2026-09-28'], [87, '2026-09-29', 'seed'])).toEqual([80, '2026-09-28']);
  expect(mergeSeed(undefined, [87, '2026-09-29', 'seed'])).toEqual([87, '2026-09-29', 'seed']);
  expect(mergeSeed([80, '2026-09-30', 'seed'], [87, '2026-09-29', 'seed'])).toEqual([80, '2026-09-30', 'seed']);
});
