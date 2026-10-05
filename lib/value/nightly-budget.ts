import { T } from './config';
import type { Company } from './types';

/** Coverage stops at 60,000 on the shared ledger, leaving >=40,000 for nightly.
 * Protect at least that much from rolling fundamentals too. Bulk quotes and
 * yields include all four HTTP attempts; monthly history has its own ledger cap.
 * Reserve the full allowance on both passes, even if some work already ran.
 */
export function nightlyBudget(companies: ReadonlyArray<Pick<Company, 'id' | 'exchange' | 'country' | 'source'>>) {
  const exchanges = new Set(companies.filter(c => !c.id.endsWith('.JP') && c.source !== 'esef').map(c => c.exchange));
  const countries = new Set(companies.map(c => c.country));
  const quotes = exchanges.size * T.budget.bulkExchangeCost * 4;
  const yields = countries.size * T.budget.historyCost * 4;
  const fx = T.budget.extraCalls;
  const priceHistory = T.budget.priceHistoryCalls;
  const reserved = Math.max(40_000, quotes + yields + fx + priceHistory);
  return { quotes, yields, fx, priceHistory, reserved, ceiling: Math.max(0, T.budget.dailyCalls - reserved) };
}
