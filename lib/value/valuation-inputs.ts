import type { Year } from './types';

const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const number = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
// Listed-company IFRS/converged regimes. Unknown regimes and US/Japanese GAAP
// need explicit reporting-standard or ROU-depreciation evidence.
const IFRS_COUNTRIES = new Set('AT AU BE BR CA CH CL CN CO CY CZ DE DK EE ES FI FR GB GR HK HR HU ID IE IL IN IS IT KR LT LU LV MX MY NL NO NZ PE PH PL PT RO RU SA SE SG SI SK TH TR TW ZA'.split(' '));

export function leaseInputs(raw: unknown, end: string, country = ''): Pick<Year, 'leaseLiabilities' | 'leaseDepreciationIncluded'> {
  const data = record(raw), general = record(data.General), financials = record(data.Financials);
  const balance = record(record(record(financials.Balance_Sheet).yearly)[end]);
  const income = record(record(record(financials.Income_Statement).yearly)[end]);
  const total = number(balance.capitalLeaseObligations) ?? number(balance.leaseLiabilities) ?? number(balance.totalLeaseLiabilities);
  const current = number(balance.currentLeaseLiabilities), noncurrent = number(balance.nonCurrentLeaseLiabilities);
  const leaseLiabilities = total ?? (current !== null && noncurrent !== null ? current + noncurrent : null);
  const standard = String(income.accountingStandard ?? general.AccountingStandard ?? general.AccountingStandards ?? '');
  const jurisdiction = String(general.CountryISO ?? country);
  const rou = number(income.depreciationOfRightOfUseAssets) ?? number(income.rightOfUseAssetDepreciation);
  const fy = Number(end.slice(0, 4));
  const leaseDepreciationIncluded = /IFRS|HKFRS|Ind.?AS|ASBE/i.test(standard) ? fy >= 2019
    : /GAAP/i.test(standard) ? false : rou !== null && rou > 0
      || IFRS_COUNTRIES.has(jurisdiction) && fy >= (jurisdiction === 'CN' ? 2021 : 2019);
  return { leaseLiabilities, leaseDepreciationIncluded };
}

export function currentShareInputs(raw: unknown, price: number | null, tradingCurrency: string): { currentShares: number | null; shareAssumptions: string[] } {
  const data = record(raw), general = record(data.General);
  const reported = number(record(data.SharesStats).SharesOutstanding);
  const cap = number(record(data.Highlights).MarketCapitalization);
  const currency = general.CurrencyCode;
  // EODHD market capitalization is in the listing currency's major units.
  const units = currency === 'GBP' && tradingCurrency === 'GBX' || currency === 'ZAR' && tradingCurrency === 'ZAc' ? 100 : 1;
  const compatible = !currency || currency === tradingCurrency || units === 100;
  const implied = compatible && cap !== null && cap > 0 && price !== null && price > 0 ? cap * units / price : null;
  const stats = reported !== null && reported > 0 ? reported : null;
  if (stats !== null && implied !== null && Math.max(stats / implied, implied / stats) > 1.5) {
    return { currentShares: null, shareAssumptions: ['current share sources disagree by more than 1.5x; share count not corrected'] };
  }
  return { currentShares: stats ?? implied, shareAssumptions: [] };
}
