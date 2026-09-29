import { afterEach, expect, it, vi } from 'vitest';
import { seedPrice, mergeSeed } from '@/lib/value/price-seed';

afterEach(() => vi.restoreAllMocks());
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
