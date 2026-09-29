import { describe, expect, it } from "vitest";
import ko from "../../fixtures/value/eodhd/fund-KO.US.json";
import { normalizeEodhd } from "../../../lib/value/normalize-eodhd";
import { checkIntegrity } from "../../../lib/value/integrity";
import type { Fundamentals, Year } from "../../../lib/value/types";

function series(fys: number[]): Fundamentals {
  const blank: Year = {
    fy: 0, end: "", revenue: null, grossProfit: null, operatingIncome: null, preTaxIncome: null,
    taxExpense: null, netIncome: null, interestExpense: null, da: null, sbc: null, nonRecurring: null,
    ocf: null, capex: null, dividendsPaid: null, buybacks: null, issuance: null, acquisitions: null,
    receivables: null, inventory: null, payables: null, cash: null, totalDebt: null, equity: null,
    goodwill: null, intangibles: null, ppe: null, totalAssets: null, totalLiabilities: null,
    currentAssets: null, currentLiabilities: null, dilutedShares: null, marketCap: null,
  };
  return { id: "TEST.US", currency: "USD", years: fys.map((fy) => ({ ...blank, fy, end: `${fy}-12-31` })), fetchedAt: "2026-09-29T00:00:00Z", integrity: { ok: true, reasons: [] } };
}
const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024];

describe("integrity gate", () => {
  it("fails fewer than seven periods", () => {
    expect(checkIntegrity(series(years.slice(1))).reasons).toEqual(["fewer than 7 annual periods"]);
  });
  it("identifies missing years in retained history", () => {
    expect(checkIntegrity(series([2015, 2017])).reasons).toContain("gap year 2016");
  });
  it.each([9e6, 1e5])("truncates at an unexplained share jump to %s before minYears", (shares) => {
    const f = series(years);
    f.years[0].dilutedShares = 1e6;
    f.years[1].dilutedShares = shares;
    const result = checkIntegrity(f);
    expect(f.years.map(y => y.fy)).toEqual(years.slice(1));
    expect(result.reasons).toEqual(["fewer than 7 annual periods"]);
    expect(result.notes?.[0]).toContain("share count jumped");
  });
  it("keeps only years from the LAST jump or currency change, ignoring unknown currency", () => {
    const f = series(Array.from({ length: 15 }, (_, i) => 2010 + i));
    f.years.forEach((y, i) => { y.dilutedShares = i < 2 ? 1 : i < 4 ? 10 : 100; y.currency = i < 6 ? "EUR" : "USD"; });
    f.years[5].currency = null;
    const result = checkIntegrity(f);
    expect(result.ok).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.notes).toHaveLength(3);
    expect(f.years[0].fy).toBe(2016);
    expect(f.currency).toBe("USD");
  });
  it("permits a share jump explained by a split", () => {
    const f = series(years);
    f.years[0].dilutedShares = 1e6; f.years[1].dilutedShares = 9e6;
    f.splits = [{ date: "2019-06-01", factor: 9 }];
    expect(checkIntegrity(f).ok).toBe(true);
    expect(f.years).toHaveLength(7);
  });
  it("treats zero shares as unknown without truncating", () => {
    const f = series(years);
    f.years.forEach((y, i) => { y.dilutedShares = i === 3 ? 0 : 116e6; });
    expect(checkIntegrity(f).ok).toBe(true);
    expect(f.years[3].dilutedShares).toBeNull();
    expect(f.years).toHaveLength(7);
  });
  it("prefers AC.PA's reported identity despite inconsistent components", () => {
    const f = series(years);
    f.years.forEach(y => Object.assign(y, { totalAssets: 11.267e9, totalLiabilities: 5.956e9, equity: 3.931e9, minorityInterest: .380e9, liabilitiesAndStockholdersEquity: 11.267e9 }));
    expect(checkIntegrity(f).ok).toBe(true);
  });
  it("fails only for gaps over 10% in at least two of the last five years", () => {
    const f = series(years);
    f.years.forEach(y => Object.assign(y, { totalAssets: 100, liabilitiesAndStockholdersEquity: 90 }));
    f.years[0].liabilitiesAndStockholdersEquity = 0;
    f.years[6].liabilitiesAndStockholdersEquity = 80;
    expect(checkIntegrity(f).ok).toBe(true);
    f.years[5].liabilitiesAndStockholdersEquity = 0;
    expect(checkIntegrity(f).reasons).toEqual(["balance sheet off by 100% in 2023", "balance sheet off by 20% in 2024"]);
  });
  it("falls back to components only for absent reported totals and skips missing components", () => {
    const f = series(years);
    f.years.forEach(y => Object.assign(y, { totalAssets: 100, totalLiabilities: 60, equity: 20, minorityInterest: 10 }));
    expect(checkIntegrity(f).ok).toBe(true);
    f.years[5].minorityInterest = null;
    f.years[6].minorityInterest = 0;
    expect(checkIntegrity(f).reasons).toHaveLength(2);
    f.years[5].totalLiabilities = null;
    expect(checkIntegrity(f).ok).toBe(true);
  });
  it("passes KO's recorded statements", () => {
    expect(normalizeEodhd(ko, "KO.US").fundamentals.integrity.ok).toBe(true);
  });
});

it("discards old gaps and uses a later share jump after a currency change", () => {
  const f = series([2000, 2002, ...Array.from({ length: 10 }, (_, i) => 2010 + i)]);
  f.years.forEach(y => { y.currency = y.fy < 2010 ? "EUR" : "USD"; y.dilutedShares = y.fy < 2012 ? 1 : 10; });
  const result = checkIntegrity(f);
  expect(result.ok).toBe(true);
  expect(result.reasons).toEqual([]);
  expect(f.years.map(y => y.fy)).toEqual([2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019]);
});
