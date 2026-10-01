import { deriveYears } from './derive';
import {annualFiscalYear} from './fiscal-period';
import {withReportedFacts} from './completeness/reported-facts';
import { marketCapCurrency } from "./currency";
import {translatePresentationCurrency,type CurrencyTranslation} from './completeness/presentation-currency';
import { balanceInputs, leaseInputs, trailingInputs } from "./valuation-inputs";
import type { Company, Fundamentals, Id, Year } from "./types";
import { goodwillAndIntangibles } from "./metrics";
import { T } from "./config";
import { checkIntegrity } from "./integrity";
import { kindFor } from "./universe";

type RecordValue = Record<string, unknown>;

/** Refresh known balance aggregates without erasing an explicit secondary fact. */
export function refreshEodhdBalance(year:Year,fresh:Year|undefined,raw:unknown,country:string):Year {
  const leases=leaseInputs(raw,year.end,country);
  const result={...year,provenance:{...year.provenance},
    leaseLiabilities:leases.leaseLiabilities??year.leaseLiabilities,
    leaseDepreciationIncluded:Boolean(year.leaseDepreciationIncluded||leases.leaseDepreciationIncluded),
    ...(fresh?.currency?{currency:fresh.currency}:{}),
  };
  for(const field of ['cash','totalDebt','clientAssets'] as const)if(fresh?.[field]!=null&&fresh.provenance?.[field]?.method!=='absent-in-complete-statement'){
    result[field]=fresh[field];
    if(fresh.provenance?.[field])result.provenance[field]=fresh.provenance[field];
    if(field==='totalDebt')result.debtIncludesLeases=fresh.debtIncludesLeases;
  }
  if(leases.leaseLiabilities!=null&&fresh?.provenance?.leaseLiabilities)result.provenance.leaseLiabilities=fresh.provenance.leaseLiabilities;
  return result;
}

function record(value: unknown): RecordValue {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
}

function number(value: unknown): number | null {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function reportedRatio(value: unknown): number | null {
  const n = number(value);
  return n === null ? null : n > 10 ? n / 100 : n;
}

function absolute(value: unknown): number | null {
  const parsed = number(value);
  return parsed === null ? null : Math.abs(parsed);
}

/** Loan asset fields vary by template. Prefer a net/total aggregate to overlapping components. */
function loanAssets(balance: RecordValue): number | null {
  for (const field of ["netLoans", "loansNet", "loansAndLeasesNet", "totalLoans", "grossLoans", "loans"]) {
    const value = number(balance[field]);
    if (value !== null) return value;
  }
  const components = Object.entries(balance)
    .filter(([field]) => /loan/i.test(field) && !/loss|allowance|provision|reserve|payable|debt|liabilit/i.test(field))
    .map(([, value]) => number(value)).filter((value): value is number => value !== null);
  return components.length ? components.reduce((sum, value) => sum + value, 0) : null;
}

export function normalizeEodhd(raw: unknown, id: Id, {corroboratingYears=[],currencyTranslations=[],onSourceYears}: {corroboratingYears?:Year[];currencyTranslations?:CurrencyTranslation[];onSourceYears?:(years:Year[])=>void} = {}): { fundamentals: Fundamentals; patch: Partial<Company>; marketCap: { value: number | null; currency: string | null } } {
  const data = record(raw);
  const general = record(data.General);
  const financials = record(data.Financials);
  const incomes = record(record(financials.Income_Statement).yearly);
  const balances = record(record(financials.Balance_Sheet).yearly);
  const cashFlows = record(record(financials.Cash_Flow).yearly);
  const shares = new Map<number, number>();
  for (const value of Object.values(record(record(data.outstandingShares).annual))) {
    const row = record(value);
    const fy = Number(String(row.date ?? row.dateFormatted).slice(0, 4));
    const count = number(row.shares);
    if (Number.isInteger(fy) && count !== null) shares.set(fy, count);
  }
  const balanceIntangibles = new Map<number, number | null>();
  for (const end of Object.keys(balances).sort()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) continue;
    const balance = record(balances[end]);
    balanceIntangibles.set(annualFiscalYear(end), goodwillAndIntangibles({
      goodwill: number(balance.goodWill), intangibles: number(balance.intangibleAssets),
    }));
  }
  const byYear = new Map<number, Year>();
  for (const end of Object.keys(incomes).sort()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) continue;
    const fy = annualFiscalYear(end);
    const income = record(incomes[end]);
    const balance = record(balances[end]);
    const cash = record(cashFlows[end]);
    const leases = leaseInputs(raw, end);
    const stockFlow = number(cash.salePurchaseOfStock);
    const currentIntangibles = goodwillAndIntangibles({ goodwill: number(balance.goodWill), intangibles: number(balance.intangibleAssets) });
    const previousIntangibles = balanceIntangibles.get(fy - 1) ?? null;
    const acquisitions = currentIntangibles === null || previousIntangibles === null
      ? null : Math.max(0, currentIntangibles - previousIntangibles);
    byYear.set(fy, {
      ...(number(income.operatingIncome)===null && number(income.ebit)!==null ? {provenance:{operatingIncome:{source:`raw/eodhd/${id}.json#${end}`,field:'operatingIncome',method:'derived' as const,inputs:['ebit']}}}:{}),
      ...(typeof income.restated === 'boolean' ? { restated: income.restated } : {}),
      navPerShare: number(balance.netAssetValuePerShare ?? balance.navPerShare),
      investmentNav: number(balance.netAssetValue ?? balance.investmentNAV),
      sharesOutstanding: number(balance.commonStockSharesOutstanding),
      dividendsPerShare: number(income.dividendsPerShare ?? cash.dividendsPerShare),
      fairValueGains: number(income.fairValueGains ?? income.netGainsOnInvestmentsAtFairValue),
      totalIncome: number(income.totalIncome ?? income.totalRevenue),
      commonNetIncome: number(income.netIncomeApplicableToCommonShares),
      preferredEquity: number(balance.preferredStockTotalEquity),
      commonDividendsPaid: absolute(cash.commonDividendsPaid),
      deposits: number(balance.totalDeposits ?? balance.deposits),
      creditLossProvision: number(income.provisionForLoanLosses ?? income.provisionForCreditLosses),
      nonInterestExpense: number(income.nonInterestExpense),
      netRevenue: number(income.netRevenue),
      efficiencyRatio: reportedRatio(income.efficiencyRatio),
      combinedRatio: reportedRatio(income.combinedRatio),
      insuranceFloat: number(balance.insuranceFloat),
      insuranceReserves: number(balance.insuranceReserves),
      adverseReserveDevelopment: number(income.adverseReserveDevelopment),
      ...leases,
      statementCoverage: {
        income: ['totalRevenue','incomeBeforeTax','netIncome'].every(k => number(income[k]) !== null) && (number(income.totalOperatingExpenses) !== null || number(income.costOfRevenue) !== null),
        balance: ['totalAssets','totalLiab','totalStockholderEquity'].every(k => number(balance[k]) !== null),
        cashFlow: ['totalCashFromOperatingActivities','totalCashflowsFromInvestingActivities','totalCashFromFinancingActivities'].every(k => number(cash[k]) !== null),
      },
      costOfSales: number(income.costOfRevenue), operatingExpenses: number(income.totalOperatingExpenses),
      dilutedEps: number(income.dilutedEPS ?? income.dilutedEps), basicEps: number(income.basicEPS ?? income.eps),
      shortTermDebt: number(balance.shortTermDebt ?? balance.shortLongTermDebt),
      debtIncludesLeases: number(balance.shortLongTermDebtTotal) !== null || !leases.leaseDepreciationIncluded,
      retainedEarnings: number(balance.retainedEarnings),
      fy, end, currency: text(income.currency_symbol),
      minorityInterest: number(balance.noncontrollingInterestInConsolidatedEntity ?? balance.minorityInterest),
      revenue: number(income.totalRevenue), grossProfit: number(income.grossProfit),
      operatingIncome: number(income.operatingIncome) ?? number(income.ebit), preTaxIncome: number(income.incomeBeforeTax),
      taxExpense: number(income.incomeTaxExpense), netIncome: number(income.netIncome),
      interestExpense: number(income.interestExpense),
      da: number(income.depreciationAndAmortization) ?? number(income.reconciledDepreciation) ?? number(cash.depreciationAndAmortization) ?? number(cash.depreciation),
      sbc: number(cash.stockBasedCompensation ?? cash.shareBasedCompensation ?? cash.stockBasedCompensationExpense), nonRecurring: number(income.nonRecurring ?? income.restructuringCharges ?? income.restructuringExpense),
      ocf: number(cash.totalCashFromOperatingActivities), capex: absolute(cash.capitalExpenditures),
      dividendsPaid: absolute(cash.dividendsPaid), buybacks: absolute(cash.repurchaseOfCapitalStock ?? cash.paymentsForRepurchaseOfCommonStock) ?? (stockFlow === null ? null : Math.max(0, -stockFlow)),
      issuance: number(cash.issuanceOfCapitalStock), acquisitions, acquisitionsProxy: true,
      receivables: number(balance.netReceivables), loans: loanAssets(balance), inventory: number(balance.inventory), payables: number(balance.accountsPayable),
      ...balanceInputs(balance, !!leases.leaseDepreciationIncluded),
      equity: number(balance.totalStockholderEquity), goodwill: number(balance.goodWill), intangibles: number(balance.intangibleAssets),
      ppe: number(balance.propertyPlantAndEquipmentNet), totalAssets: number(balance.totalAssets), totalLiabilities: number(balance.totalLiab),
      liabilitiesAndStockholdersEquity: number(balance.liabilitiesAndStockholdersEquity),
      currentAssets: number(balance.totalCurrentAssets), currentLiabilities: number(balance.totalCurrentLiabilities),
      dilutedShares: number(income.weightedAverageShsOutDil ?? income.dilutedAverageShares) ?? shares.get(fy) ?? number(balance.commonStockSharesOutstanding), marketCap: null,
    });
  }
  const latestIncomeCurrency=[...byYear.values()].at(-1)?.currency;
  for(const y of byYear.values()){
    const income=record(incomes[y.end]);
    const balance=record(balances[y.end]),cash=record(cashFlows[y.end]);
    const agreed=text(balance.currency_symbol),cashIncome=number(cash.netIncome);
    if(agreed&&agreed===latestIncomeCurrency&&agreed===text(cash.currency_symbol)&&agreed!==y.currency
      &&y.netIncome!==null&&y.netIncome!==0&&cashIncome!==null
      &&Math.abs(cashIncome/y.netIncome-1)<.005){
      y.provenance??={};y.provenance.currency={source:`raw/eodhd/${id}.json#${y.end}`,field:'statement currency',method:'derived',inputs:[`Balance sheet and cash-flow currency ${agreed}; cash-flow net income corroborates the income-statement amount within 0.5%`]};
      y.currency=agreed;
    }
    if(y.dilutedShares!==null){
      const weighted=number(income.weightedAverageShsOutDil ?? income.dilutedAverageShares)!==null;
      y.provenance??={};
      y.provenance.dilutedShares={source:`raw/eodhd/${id}.json#${y.end}`,field:weighted?'weighted average diluted shares':'annual shares (weighted-share proxy)',method:weighted?'reported':'estimate'};
    }
  }
  const years = withReportedFacts(id,deriveYears([...byYear.values()].sort((a, b) => a.fy - b.fy).slice(-T.fundamentals.maxYears)));
  for(const y of years){
    const reported=number(record(balances[y.end]).commonStockSharesOutstanding);
    if(reported!==null && reported>0 && y.dilutedShares!==null && y.dilutedShares>0
      && y.dilutedShares/reported<.05){
      y.dilutedShares=reported;y.provenance??={};
      y.provenance.dilutedShares={source:`raw/eodhd/${id}.json#${y.end}`,field:'commonStockSharesOutstanding (fiscal-end proxy)',method:'estimate',inputs:['Calendar share series is less than 1/20 of the dated annual balance share count; use the fiscal-end count']};
    }
    const independentFields=['netIncome','totalAssets','revenue','ocf','equity','cash','ppe','inventory','receivables','payables','shortTermDebt','minorityInterest','da'] as const;
    const matchedFields=(a:Year)=>independentFields.filter(k=>a[k]!=null&&y[k]!=null&&a[k]!==0
      &&Math.abs(y[k]!/a[k]!-1)<.005&&a.provenance?.[k]?.method!=='absent-in-complete-statement');
    const anchor=corroboratingYears.find(a=>a.end===y.end&&a.currency&&a.currency!==y.currency&&matchedFields(a).length>=2);
    if(anchor){
      y.provenance??={};
      y.provenance.currency={source:anchor.provenance?.netIncome?.source??`independent annual statements/${id}#${anchor.end}`,field:'currency',method:'derived',inputs:[`Vendor label ${y.currency}; corroborated ${anchor.currency}`,`Independent annual observations ${matchedFields(anchor).join(', ')} agree within 0.5%; amounts unchanged`]};
      y.currency=anchor.currency;
    }
  }
  for (const y of years) for (const [field,value] of Object.entries(y)) {
    if (typeof value === 'number' && Number.isFinite(value) && !y.provenance?.[field]) {
      y.provenance ??= {}; y.provenance[field] = { source: `raw/eodhd/${id}.json#${y.end}`, field, method: 'reported' };
    }
  }
  const split = record(data.SplitsDividends);
  const parts = text(split.LastSplitFactor)?.split(":" ).map(Number);
  const date = text(split.LastSplitDate);
  const factor = parts?.length === 2 ? parts[0] / parts[1] : NaN;
  const fundamentals: Fundamentals = {
    id, currency: years.at(-1)?.currency ?? "", years:translatePresentationCurrency(years,currencyTranslations),
    integrity: { ok: true, reasons: [] }, fetchedAt: new Date().toISOString(),
    splits: date && Number.isFinite(factor) && factor > 0 ? [{ date, factor }] : [],
  };
  onSourceYears?.(structuredClone(fundamentals.years));
  fundamentals.integrity = checkIntegrity(fundamentals, { source: "eodhd" });
  fundamentals.ttm = trailingInputs(raw, fundamentals.years.at(-1));
  const sector = text(general.Sector);
  const industry = text(general.Industry);
  const latestBalance = record(balances[Object.keys(balances).filter(end => /^\d{4}-\d{2}-\d{2}$/.test(end)).sort().at(-1) ?? ""]);
  return {
    fundamentals,
    marketCap: { value: number(record(data.Highlights).MarketCapitalization), currency: text(general.CurrencyCode) ? marketCapCurrency(text(general.CurrencyCode)!) : null },
    patch: {
      description: text(general.Description), sector, industry,
      isin: text(general.ISIN), cik: text(general.CIK), lei: text(general.LEI),
      ...(sector !== null || industry !== null ? { kind: kindFor({ id, sector, industry, lending: { receivables: number(latestBalance.netReceivables), loans: loanAssets(latestBalance), ...balanceInputs(latestBalance, false), equity: number(latestBalance.totalStockholderEquity), totalAssets: number(latestBalance.totalAssets) } }) } : {}),
    },
  };
}
