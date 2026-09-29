/** GBP is pounds; the provider's case-sensitive GBp alias denotes pence. */
export function currencyCode(currency: string): string {
  if (currency !== 'GBP' && currency.toUpperCase() === 'GBP') return 'GBX';
  return currency.toUpperCase();
}
export const sameCurrency = (a: string, b: string) => currencyCode(a) === currencyCode(b);

/** Provider aggregate capitalisation is always in major currency units. */
export function marketCapCurrency(currency: string): string {
  const code = currencyCode(currency);
  return ({GBX:'GBP', ZAC:'ZAR', ILA:'ILS'} as Record<string,string>)[code] ?? code;
}
