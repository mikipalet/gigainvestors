import { T } from './config';
import { deriveYears } from './derive';
import { createLimiter, fetchWithRetry } from './http';
import { checkIntegrity } from './integrity';
import { yahooSymbol } from './price-history';
import type { Company, Fundamentals, Year } from './types';

// Yahoo reportedValue.raw is already in absolute reporting-currency units.
const fields = {
  revenue: 'TotalRevenue', grossProfit: 'GrossProfit', costOfSales: 'CostOfRevenue',
  operatingIncome: 'OperatingIncome', operatingExpenses: 'OperatingExpense',
  preTaxIncome: 'PretaxIncome', taxExpense: 'TaxProvision', netIncome: 'NetIncome',
  commonNetIncome: 'NetIncomeCommonStockholders', totalNetIncome: 'NetIncomeIncludingNoncontrollingInterests',
  interestExpense: 'InterestExpense', da: 'DepreciationAndAmortization', sbc: 'StockBasedCompensation',
  nonRecurring: 'SpecialIncomeCharges', ocf: 'OperatingCashFlow', capex: 'CapitalExpenditure',
  dividendsPaid: 'CashDividendsPaid', buybacks: 'RepurchaseOfCapitalStock', issuance: 'IssuanceOfCapitalStock',
  receivables: 'NetReceivables', inventory: 'Inventory', payables: 'AccountsPayable',
  cash: 'CashCashEquivalentsAndShortTermInvestments', cashAndCashEquivalents: 'CashAndCashEquivalents',
  shortTermInvestments: 'OtherShortTermInvestments', totalDebt: 'TotalDebt', shortTermDebt: 'CurrentDebt',
  equity: 'StockholdersEquity', minorityInterest: 'MinorityInterest', goodwill: 'Goodwill',
  intangibles: 'OtherIntangibleAssets', ppe: 'NetPPE', totalAssets: 'TotalAssets',
  totalLiabilities: 'TotalLiabilitiesNetMinorityInterest', currentAssets: 'CurrentAssets',
  currentLiabilities: 'CurrentLiabilities', dilutedShares: 'DilutedAverageShares',
  sharesOutstanding: 'OrdinarySharesNumber', dilutedEps: 'DilutedEPS', basicEps: 'BasicEPS',
  retainedEarnings: 'RetainedEarnings', leaseLiabilities: 'CapitalLeaseObligations',
} as const;
const spending = new Set<string>(['capex', 'dividendsPaid', 'buybacks']);
const types = Object.values(fields).map(field => `annual${field}`);
const limit = createLimiter({ perSecond: 2 });

export async function fetchYahooFundamentals(company: Company): Promise<unknown> {
  const url = new URL(`https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(yahooSymbol(company))}`);
  url.search = new URLSearchParams({ type: types.join(','), period1: String(Math.floor(Date.now()/1000) - 15*366*86400), period2: String(Math.floor(Date.now()/1000)) }).toString();
  return limit(async () => {
    const response = await fetchWithRetry(url.toString(), { headers: { 'User-Agent': 'Mozilla/5.0' }, retries: 0, signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`Yahoo fundamentals HTTP ${response.status} for ${company.id}`);
    return response.json();
  });
}

type Observation = { asOfDate?: string; periodType?: string; currencyCode?: string; reportedValue?: { raw?: unknown } };
type Series = { meta?: { symbol?: string[]; type?: string[] }; [key: string]: unknown };

export function normalizeYahooFundamentals(raw: unknown, company: Company): Fundamentals {
  const data = (raw as { timeseries?: { result?: Series[]; error?: unknown } } | null)?.timeseries;
  if (data?.error || !Array.isArray(data?.result)) throw new Error('Invalid Yahoo annual fundamentals');
  const byEnd = new Map<string, Year>();
  const symbol = yahooSymbol(company);
  for (const series of data.result) {
    if (!series.meta?.symbol?.includes(symbol)) throw new Error('Yahoo fundamentals symbol mismatch');
    const type = series.meta?.type?.[0];
    const entry = Object.entries(fields).find(([, source]) => `annual${source}` === type);
    if (!entry || !type || !Array.isArray(series[type])) continue;
    const [field] = entry;
    for (const observation of series[type] as Observation[]) {
      const end = observation.asOfDate;
      const value = observation.reportedValue?.raw;
      const currency = observation.currencyCode;
      if (observation.periodType !== '12M' || !end || !/^\d{4}-\d{2}-\d{2}$/.test(end)
        || !Number.isFinite(Date.parse(end)) || new Date(end).toISOString().slice(0,10) !== end
        || typeof value !== 'number' || !Number.isFinite(value) || !currency || !/^[A-Z]{3}$/.test(currency)) continue;
      let year = byEnd.get(end);
      if (!year) {
        year = { ...Object.fromEntries(Object.keys(fields).map(key => [key, null])),
          fy: Number(end.slice(0,4)), end, currency, acquisitions: null, marketCap: null,
          // Selected timeseries are not complete statements. Missing values stay unknown.
          statementCoverage: { income: false, balance: false, cashFlow: false }, provenance: {},
        } as Year;
        byEnd.set(end, year);
      }
      if (year.currency !== currency) throw new Error(`Conflicting Yahoo currency for ${company.id} ${end}`);
      Object.assign(year, { [field]: spending.has(field) ? Math.abs(value) : value });
      year.provenance![field] = { source: `raw/yahoo-fundamentals/${company.id}.json#${end}`, field: type, method: 'reported' };
    }
  }
  const years = [...byEnd.values()].filter(y => y.revenue !== null || y.netIncome !== null).sort((a,b) => a.end.localeCompare(b.end));
  if (!years.length) throw new Error('No Yahoo annual income statements');
  const seen = new Set<number>();
  for (const year of years) {
    if (seen.has(year.fy)) throw new Error(`Multiple Yahoo annual periods in ${year.fy}`);
    seen.add(year.fy);
  }
  const fundamentals: Fundamentals = { id: company.id, currency: years.at(-1)!.currency!,
    years: deriveYears(years.slice(-T.fundamentals.maxYears)), fetchedAt: new Date().toISOString(), integrity: { ok: false, reasons: [] } };
  fundamentals.integrity = checkIntegrity(fundamentals, { source: company.source });
  return fundamentals;
}
