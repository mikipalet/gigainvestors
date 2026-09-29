import type { Valuation } from './types';

/** Only pass same-currency values into the shared price test. */
export function comparableValuation(valuation: Valuation | null, tradingCurrency: string): Valuation | null {
  if (!valuation) return null;
  if (valuation.perShareTrading?.currency === tradingCurrency) return { ...valuation, currency: tradingCurrency, perShare: valuation.perShareTrading };
  return valuation.currency === tradingCurrency ? valuation : null;
}
