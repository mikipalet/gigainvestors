import type { Company, Fundamentals, Id, Year } from "./types";
import { goodwillAndIntangibles } from "./metrics";
import { T } from "./config";
import { checkIntegrity } from "./integrity";
import { kindFor } from "./universe";

type RecordValue = Record<string, unknown>;

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

function absolute(value: unknown): number | null {
  const parsed = number(value);
  return parsed === null ? null : Math.abs(parsed);
}

export function normalizeEodhd(raw: unknown, id: Id): { fundamentals: Fundamentals; patch: Partial<Company>; marketCap: { value: number | null; currency: string | null } } {
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
    balanceIntangibles.set(Number(end.slice(0, 4)), goodwillAndIntangibles({
      goodwill: number(balance.goodWill), intangibles: number(balance.intangibleAssets),
    }));
  }
  const byYear = new Map<number, Year>();
  for (const end of Object.keys(incomes).sort()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) continue;
    const fy = Number(end.slice(0, 4));
    const income = record(incomes[end]);
    const balance = record(balances[end]);
    const cash = record(cashFlows[end]);
    const shortDebt = number(balance.shortTermDebt);
    const longDebt = number(balance.longTermDebt);
    const stockFlow = number(cash.salePurchaseOfStock);
    const currentIntangibles = goodwillAndIntangibles({ goodwill: number(balance.goodWill), intangibles: number(balance.intangibleAssets) });
    const previousIntangibles = balanceIntangibles.get(fy - 1) ?? null;
    const acquisitions = currentIntangibles === null || previousIntangibles === null
      ? null : Math.max(0, currentIntangibles - previousIntangibles);
    byYear.set(fy, {
      fy, end, currency: text(income.currency_symbol),
      minorityInterest: number(balance.noncontrollingInterestInConsolidatedEntity ?? balance.minorityInterest),
      revenue: number(income.totalRevenue), grossProfit: number(income.grossProfit),
      operatingIncome: number(income.operatingIncome), preTaxIncome: number(income.incomeBeforeTax),
      taxExpense: number(income.incomeTaxExpense), netIncome: number(income.netIncome),
      interestExpense: number(income.interestExpense),
      da: number(income.depreciationAndAmortization ?? income.reconciledDepreciation ?? cash.depreciation),
      sbc: number(cash.stockBasedCompensation), nonRecurring: number(income.nonRecurring),
      ocf: number(cash.totalCashFromOperatingActivities), capex: absolute(cash.capitalExpenditures),
      dividendsPaid: absolute(cash.dividendsPaid), buybacks: stockFlow === null ? null : Math.max(0, -stockFlow),
      issuance: number(cash.issuanceOfCapitalStock), acquisitions, acquisitionsProxy: true,
      receivables: number(balance.netReceivables), inventory: number(balance.inventory), payables: number(balance.accountsPayable),
      cash: number(balance.cashAndShortTermInvestments ?? balance.cash),
      totalDebt: number(balance.shortLongTermDebtTotal) ?? (shortDebt !== null && longDebt !== null ? shortDebt + longDebt : null),
      equity: number(balance.totalStockholderEquity), goodwill: number(balance.goodWill), intangibles: number(balance.intangibleAssets),
      ppe: number(balance.propertyPlantAndEquipmentNet), totalAssets: number(balance.totalAssets), totalLiabilities: number(balance.totalLiab),
      liabilitiesAndStockholdersEquity: number(balance.liabilitiesAndStockholdersEquity),
      currentAssets: number(balance.totalCurrentAssets), currentLiabilities: number(balance.totalCurrentLiabilities),
      dilutedShares: shares.get(fy) ?? number(balance.commonStockSharesOutstanding), marketCap: null,
    });
  }
  const years = [...byYear.values()].sort((a, b) => a.fy - b.fy).slice(-T.fundamentals.maxYears);
  const split = record(data.SplitsDividends);
  const parts = text(split.LastSplitFactor)?.split(":" ).map(Number);
  const date = text(split.LastSplitDate);
  const factor = parts?.length === 2 ? parts[0] / parts[1] : NaN;
  const fundamentals: Fundamentals = {
    id, currency: years.at(-1)?.currency ?? "", years,
    integrity: { ok: true, reasons: [] }, fetchedAt: new Date().toISOString(),
    splits: date && Number.isFinite(factor) && factor > 0 ? [{ date, factor }] : [],
  };
  fundamentals.integrity = checkIntegrity(fundamentals);
  const sector = text(general.Sector);
  const industry = text(general.Industry);
  return {
    fundamentals,
    marketCap: { value: number(record(data.Highlights).MarketCapitalization), currency: text(general.CurrencyCode) },
    patch: {
      description: text(general.Description), sector, industry,
      isin: text(general.ISIN), cik: text(general.CIK), lei: text(general.LEI),
      ...(sector !== null || industry !== null ? { kind: kindFor({ sector, industry }) } : {}),
    },
  };
}
