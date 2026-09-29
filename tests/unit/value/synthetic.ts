import type { Year } from "@/lib/value/types";

export function makeYears({ n = 11, from = 2013, overrides = {} }: {
  n?: number;
  from?: number;
  overrides?: Partial<Year> | ((year: Year, index: number) => Partial<Year>);
} = {}): Year[] {
  return Array.from({ length: n }, (_, i) => {
    const fy = from + i;
    const year: Year = {
      fy, end: `${fy}-12-31`, revenue: 1000, grossProfit: 400,
      operatingIncome: 125, preTaxIncome: 125, taxExpense: 25, netIncome: 100,
      interestExpense: 0, da: 20, sbc: 0, nonRecurring: 0, ocf: 120,
      capex: 20, dividendsPaid: 20, buybacks: 0, issuance: 0, acquisitions: 0,
      receivables: 100, inventory: 50, payables: 50, cash: 100,
      totalDebt: 100, equity: 500, goodwill: 0, intangibles: 0, ppe: 200,
      totalAssets: 1000, totalLiabilities: 500, currentAssets: 250,
      currentLiabilities: 150, dilutedShares: 10, marketCap: 1000 + i * 100,
    };
    return { ...year, ...(typeof overrides === "function" ? overrides(year, i) : overrides) };
  });
}
