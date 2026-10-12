import { valuationFlags } from './data-quality';
import { reviewedInputFlags } from './reviewed-input-errors';
import { qualityPass } from './fair-buy';
import { priceTest } from './price-test';
import { T } from './config';
import type { IndexRow, PriceMap, Valuation } from './types';

/** Publication only. Quotes and v must both use the listing's trading currency.
 * Method 3.8.0: Buy = passes the quality tests Buy requires (fair-buy.ts: moat,
 * economics, management, accounting and the profit record) and the price is at
 * or below the central (mid) value. There is no margin-of-safety discount and no
 * separate return hurdle: at the central value the expected return equals the
 * required return by construction, so a price at or below it meets that return.
 * Seeds remain eligible (and labeled); unverified comparisons wait for review.
 * b requires every quality gate, so its count is the final funnel count.
 */
// m and buyReturnInputs are accepted for older callers and ignored from 3.8.0.
export function publishedBuyPrice(row: Pick<IndexRow, 'businessChanged' | 'st' | 't' | 'pr' | 'v' | 'dataQualityFlags' | 'shareSources' | 'priceTestFreeze' | 'publishedShareReview'> & Partial<Pick<IndexRow, 'id' | 'm' | 'buyReturnInputs'>>, quote: PriceMap[string] | undefined) {
  const quality = qualityPass(row);
  // A reviewed input error outranks every retained or frozen price result.
  const reviewed = reviewedInputFlags(row.id);
  if(reviewed.length)return {result:'unclear' as const,mos:null,dataQualityFlags:[...new Set([...(row.dataQualityFlags ?? []).filter(flag => !flag.startsWith('Unverified ratio:')),...reviewed])],b:false};
  if(row.priceTestFreeze){
    const test=row.priceTestFreeze.test;
    return {result:test.result,mos:test.metrics.mos??null,dataQualityFlags:[],b:!row.businessChanged&&row.st==='s'&&quality&&test.result==='pass'};
  }
  const dataQualityFlags = [...new Set([...(row.dataQualityFlags ?? []).filter(flag => !flag.startsWith('Unverified ratio:')), ...valuationFlags({ price: quote?.[0] ?? null, mid: row.v?.[1] ?? null, assumptions: [], corroborated:row.shareSources===2||row.publishedShareReview===true })])];
  const price = priceTest({
    valuation: row.v ? { perShare: { low: row.v[0], mid: row.v[1], high: row.v[2] } } as Valuation : null,
    price: quote?.[0] ?? null,
    requiredMos: T.price.buyMos,
  });
  const eligible = row.st === 's' && !dataQualityFlags.length;
  const result = eligible ? price : { result: 'unclear' as const, mos: null };
  return { ...result, dataQualityFlags, b: !row.businessChanged && quality && result.result === 'pass' };
}

