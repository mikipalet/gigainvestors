import { describe, it, expect } from 'vitest';
import { logSeries, logTicks, cagr, marginExtent } from '@/lib/value/viz/research';
import { priceTest } from '@/lib/value/price-test';
import type { Valuation } from '@/lib/value/types';

describe('research-driven chart contracts', () => {
  it('leaves non-positive log values as gaps and uses elapsed fiscal years for CAGR', () => {
    expect(logSeries([[2016, 10], [2017, 0], [2018, -2], [2020, 20]])).toEqual([[2016, 10], [2017, null], [2018, null], [2020, 20]]);
    expect(cagr([[2016, 10], [2020, 20]])).toBeCloseTo(2 ** .25 - 1);
    expect(cagr([[2016, -10], [2020, 20]])).toBeNull();
  });
  it('encloses positive log values with at most four clean ticks', () => {
    expect(logTicks([70, 118.3])).toEqual([50, 100, 200]);
    for (const domain of [[.001, 1000], [2, 3.4], [5, 5]] as [number, number][]) {
      const ticks = logTicks(domain);
      expect(ticks.length).toBeLessThanOrEqual(4);
      expect(ticks[0]).toBeGreaterThan(0);
      expect(ticks[0]).toBeLessThanOrEqual(domain[0]);
      expect(ticks.at(-1)).toBeGreaterThanOrEqual(domain[1]);
    }
  });
  it('keeps tiny margins visible without drawing a nonzero mark for zero', () => {
    expect(marginExtent(.001)).toBe(2);
    expect(marginExtent(-2)).toBe(24);
    expect(marginExtent(0)).toBe(0);
  });
  it('uses the company discount while preserving unknown and invalid price behavior', () => {
    const valuation = { perShare: { low: 70, mid: 100, high: 120 } } as Valuation;
    expect(priceTest({ valuation, price: 70, requiredMos: .25 }).result).toBe('pass');
    expect(priceTest({ valuation, price: 70, requiredMos: .35 }).result).toBe('unclear');
    expect(priceTest({ valuation, price: 50, requiredMos: .5 }).result).toBe('pass');
    expect(priceTest({ valuation: null, price: 50, requiredMos: .5 }).mos).toBeNull();
    expect(priceTest({ valuation, price: -1, requiredMos: .25 }).mos).toBeNull();
  });
});
