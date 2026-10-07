import {availableOn} from './quarterly-inputs';
import { sameCurrency, currencyCode, marketCapCurrency } from './currency';
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

export function currentShareInputs(raw: unknown, price: number | null, tradingCurrency: string): { currentShares: number | null; reportedShares: boolean; shareAssumptions: string[] } {
  const data = record(raw), general = record(data.General);
  const reported = number(record(data.SharesStats).SharesOutstanding);
  const cap = number(record(data.Highlights).MarketCapitalization);
  const currency = general.CurrencyCode;
  // EODHD market capitalization is in the listing currency's major units.
  const units = marketCapCurrency(tradingCurrency) !== currencyCode(tradingCurrency) ? 100 : 1;
  const compatible = !currency || typeof currency === 'string' && marketCapCurrency(currency) === marketCapCurrency(tradingCurrency);
  const implied = compatible && cap !== null && cap > 0 && price !== null && price > 0 ? cap * units / price : null;
  const stats = reported !== null && reported > 0 ? reported : null;
  if (stats !== null && implied !== null && Math.max(stats / implied, implied / stats) > 1.5) {
    return { currentShares: null, reportedShares: false, shareAssumptions: ['current share sources disagree by more than 1.5x; share count not corrected'] };
  }
  return { currentShares: stats ?? implied, reportedShares: stats !== null, shareAssumptions: [] };
}

/** Totals win; otherwise retain every reported non-overlapping component. */
export function balanceInputs(balance: Record<string, unknown>, leaseDeducted: boolean): Pick<Year, 'cash' | 'cashExclusion' | 'totalDebt' | 'clientAssets'> {
  const long = number(balance.longTermDebtTotal) ?? number(balance.longTermDebt);
  const short = number(balance.shortTermDebt) ?? number(balance.shortLongTermDebt);
  const lease = leaseDeducted ? null : number(balance.capitalLeaseObligations);
  const parts = [long, short, lease].filter((v): v is number => v !== null);
  const cash = number(balance.cash) ?? number(balance.cashAndEquivalents);
  const investments = number(balance.shortTermInvestments);
  const combinedRestricted=number(balance.cashAndCashEquivalentsAndRestrictedCash);
  const aggregate=number(balance.cashAndShortTermInvestments) ?? (cash === null && investments === null && combinedRestricted === null ? null : (cash ?? combinedRestricted ?? 0) + (investments ?? 0));
  const assets=number(balance.totalCurrentAssets)??number(balance.totalAssets);
  const invalid=aggregate!==null&&(aggregate<0||assets!==null&&aggregate>assets*1.01);
  // A separate restricted/segregated balance is not necessarily IN cash.
  // Deduct only when the selected aggregate explicitly includes it.
  const restricted=combinedRestricted!==null&&cash===null&&number(balance.cashAndShortTermInvestments)===null ? number(balance.restrictedCash)??combinedRestricted : 0;
  return {
    cash: aggregate,
    ...(invalid?{cashExclusion:{amount:Math.max(0,aggregate!),invalid:true,reason:'Vendor cash aggregate fails same-statement asset reconciliation; no cash credit or debt offset'}}:restricted>0?{cashExclusion:{amount:restricted,reason:'Restricted cash explicitly included in the selected cash aggregate is excluded'}}:{}),
    totalDebt: number(balance.shortLongTermDebtTotal) ?? (parts.length ? parts.reduce((a, b) => a + b, 0) : null),
    clientAssets: number(balance.clientAssets) ?? number(balance.customerAssets) ?? number(balance.cashHeldForClients),
  };
}

/** A separate trailing observation, never a synthetic fiscal year in the annual history. */
export function trailingInputs(raw: unknown, latest: Year | undefined, cutoff = new Date().toISOString().slice(0,10)): Year | null {
  if (!latest) return null;
  const financials = record(record(raw).Financials);
  const incomes = record(record(financials.Income_Statement).quarterly);
  const flows = record(record(financials.Cash_Flow).quarterly);
  const ends = Object.keys(incomes).filter(end => /^\d{4}-\d{2}-\d{2}$/.test(end) && end < cutoff && availableOn(end, String(record(incomes[end]).filing_date??'')) < cutoff && availableOn(end, String(record(flows[end]).filing_date??'')) < cutoff).sort().slice(-4);
  if (ends.length !== 4 || ends[3] <= latest.end) return null;
  const month = (end: string) => Number(end.slice(0, 4)) * 12 + Number(end.slice(5, 7));
  if (ends.some((end, i) => i > 0 && month(end) - month(ends[i - 1]) !== 3)) return null;
  const quarters = ends.map(end => {
    const income = record(incomes[end]), cash = record(flows[end]);
    if (!Object.keys(cash).length || [income, cash].some(row => typeof row.currency_symbol === 'string'
      && latest.currency && !sameCurrency(row.currency_symbol, latest.currency))) return null;
    const row = {
      revenue: number(income.totalRevenue), netIncome: number(income.netIncome),
      totalNetIncome: number(income.netIncomeIncludingNoncontrollingInterests), leaseCash: number(cash.leasePayments),
      da: number(income.depreciationAndAmortization) ?? number(income.reconciledDepreciation) ?? number(cash.depreciation),
      capex: number(cash.capitalExpenditures), sbc: number(cash.stockBasedCompensation), ocf: number(cash.totalCashFromOperatingActivities),
    };
    return { ...row, capex: row.capex === null ? null : Math.abs(row.capex) };
  });
  if (quarters.some(row => row === null)) return null;
  const totals = Object.fromEntries(['revenue', 'netIncome', 'totalNetIncome', 'leaseCash', 'da', 'capex', 'sbc', 'ocf'].map(key => [key,
    (key === 'sbc' ? quarters.every(row => row!.sbc === null)
      : quarters.some(row => row![key as keyof typeof row] === null)) ? null
      : quarters.reduce((sum, row) => sum + (row![key as keyof typeof row] ?? 0), 0)]));
  const result = { ...latest, ...totals, sbcIncomplete: quarters.some(row => row!.sbc === null), end: ends[3] };
  delete result.maintenanceCapexJudgement; delete result.disclosedMaintenanceCapex;
  delete result.marginOperatingIncomeJudgement; delete result.acquisitionIssuanceJudgement;
  if (latest.totalNetIncome === undefined && quarters.every(row => row!.totalNetIncome === null)) delete result.totalNetIncome;
  result.leaseCashIncomplete = (latest.leaseCash ?? 0) > 0 && totals.leaseCash === null;
  return result;
}
