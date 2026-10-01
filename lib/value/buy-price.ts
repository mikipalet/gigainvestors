import {modelReturn,cashCoversPrice} from './return-model';
import { valuationFlags } from './data-quality';
import { priceTest } from './price-test';
import type { IndexRow, PriceMap, Valuation } from './types';

/** Publication only. Quotes and v must both use the listing's trading currency.
 * Seeds remain eligible (and labeled); unverified comparisons wait for review.
 * b includes all five quality gates, so its count is the final funnel count.
 */
export function publishedBuyPrice(row: Pick<IndexRow, 'businessChanged' | 'st' | 't' | 'v' | 'm' | 'dataQualityFlags' | 'buyReturnInputs' | 'shareSources'>, quote: PriceMap[string] | undefined) {
  const dataQualityFlags = [...new Set([...(row.dataQualityFlags ?? []).filter(flag => !flag.startsWith('Unverified ratio:')), ...valuationFlags({ price: quote?.[0] ?? null, mid: row.v?.[1] ?? null, assumptions: [], corroborated:row.shareSources===2 })])];
  const price = priceTest({
    valuation: row.v ? { perShare: { low: row.v[0], mid: row.v[1], high: row.v[2] } } as Valuation : null,
    price: quote?.[0] ?? null,
    requiredMos: row.m ?? NaN,
  });
  const eligible = row.st === 's' && !dataQualityFlags.length && row.m !== undefined && Number.isFinite(row.m) && row.m >= 0 && row.m <= 1;
  const inputs = row.buyReturnInputs;
  const expectedReturn = inputs?.model && quote && quote[0] > 0 ? modelReturn(inputs.model, quote[0]) : null;
  const covered = !!(inputs?.model && Number.isFinite(inputs.requiredReturn) && quote && cashCoversPrice(inputs.model,quote[0]));
  const legacyKnown = inputs && !inputs.model && [inputs.cashPerShare, inputs.growth, inputs.requiredReturn].every(Number.isFinite) && row.v && quote;
  const returnKnown = covered || expectedReturn !== null && Number.isFinite(expectedReturn) && inputs && Number.isFinite(inputs.requiredReturn) || legacyKnown;
  // Legacy snapshots lack cash flows; their value at the required rate still establishes this inequality.
  const returnPass = !!returnKnown && (covered || (legacyKnown ? quote![0] <= row.v![1] : expectedReturn! >= inputs!.requiredReturn - 1e-12));
  const result = !eligible ? { result: 'unclear' as const, mos: null }
    : price.result === 'pass' && !returnPass ? { ...price, result: returnKnown ? 'fail' as const : 'unclear' as const } : price;
  return { ...result, dataQualityFlags, b: !row.businessChanged && row.t === 'PPPPP' && result.result === 'pass' };
}
