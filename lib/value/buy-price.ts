import { valuationFlags } from './data-quality';
import { priceTest } from './price-test';
import type { IndexRow, PriceMap, Valuation } from './types';

/** Publication only. Quotes and v must both use the listing's trading currency.
 * Seeds remain eligible (and labeled); unverified comparisons wait for review.
 * b includes all five quality gates, so its count is the final funnel count.
 */
export function publishedBuyPrice(row: Pick<IndexRow, 'st' | 't' | 'v' | 'm' | 'dataQualityFlags'>, quote: PriceMap[string] | undefined) {
  const dataQualityFlags = [...new Set([...(row.dataQualityFlags ?? []).filter(flag => !flag.startsWith('Unverified ratio:')), ...valuationFlags({ price: quote?.[0] ?? null, mid: row.v?.[1] ?? null, assumptions: [] })])];
  const price = priceTest({
    valuation: row.v ? { perShare: { low: row.v[0], mid: row.v[1], high: row.v[2] } } as Valuation : null,
    price: quote?.[0] ?? null,
    requiredMos: row.m ?? NaN,
  });
  const eligible = row.st === 's' && !dataQualityFlags.length && row.m !== undefined && Number.isFinite(row.m) && row.m >= 0 && row.m <= 1;
  const result = eligible ? price : { result: 'unclear' as const, mos: null };
  return { ...result, dataQualityFlags, b: row.t === 'PPPPP' && result.result === 'pass' };
}
