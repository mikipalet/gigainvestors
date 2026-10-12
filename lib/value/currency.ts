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

/** Currency of an analysis's measured figures (tests, valuation inputs, series):
 * US dollars for a hyperinflationary reporter, otherwise the reporting currency. */
export function analysisCurrency(d:{measure?:{currency:string};reportingCurrency?:string;valuation?:{currency?:string}|null;company:{currency:string}}):string {
  return d.measure?.currency ?? d.reportingCurrency ?? d.valuation?.currency ?? d.company.currency;
}
