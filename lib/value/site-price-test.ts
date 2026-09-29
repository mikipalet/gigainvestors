import { priceTest as sharedPriceTest } from './price-test';
import { T } from './config';
import type { Valuation } from './types';

// Temporary adapter for this branch's positional shared API. Site callers already
// use the incoming object contract; replace this import when the backend lands.
export function priceTest({ valuation, price, requiredMos = T.price.passMos }: { valuation: Valuation | null; price: number | null; requiredMos?: number }) {
  const outcome = sharedPriceTest(valuation, price);
  if (outcome.mos === null) return outcome;
  return { ...outcome, result: outcome.mos >= requiredMos ? 'pass' as const : outcome.mos >= 0 ? 'unclear' as const : 'fail' as const };
}
