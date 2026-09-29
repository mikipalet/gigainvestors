import { expect, it } from 'vitest';
import { priceValue, seriesDomain, shouldUseLogScale, validValueRange } from '@/lib/value/presentation';
it('uses only reported years and keeps near-zero observations on a linear scale', () => {
  expect(seriesDomain([[1996,null],[2016,2],[2025,4],[2026,null]])).toEqual([2016,2025]);
  expect(shouldUseLogScale([[2016,.01],[2025,3]])).toBe(false);
  expect(shouldUseLogScale([[2016,1],[2025,3]])).toBe(true);
});
it('refuses invalid value ranges and retains honest coincident scenarios', () => {
  expect(validValueRange({low:4,mid:3,high:5})).toBe(false);
  expect(validValueRange({low:2,mid:3,high:3})).toBe(true);
  expect(validValueRange({low:2,mid:NaN,high:3})).toBe(false);
});
it('preserves expensive prices without negative percentages or capping', () => {
  expect(priceValue({price:80,mid:10})).toBe(8);
  expect(priceValue({price:12,mid:0})).toBeNull();
});
