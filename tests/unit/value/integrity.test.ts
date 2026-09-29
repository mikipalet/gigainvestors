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
    expect(checkIntegrity(series(years.slice(1)))).toEqual({ ok: false, reasons: ["fewer than 7 annual periods"] });
  });
  it("identifies each missing year", () => {
    expect(checkIntegrity(series([2015, 2017])).reasons).toContain("gap year 2016");
  });
  it.each([[9e6, "9"], [1e5, "0.1"]])("detects an unexplained share jump to %s", (shares, ratio) => {
    const f = series(years);
    f.years[0].dilutedShares = 1e6;
    f.years[1].dilutedShares = shares;
    expect(checkIntegrity(f).reasons).toEqual([`share count jumped ${ratio}x in 2019`]);
  });
  it("permits a share jump explained by a split record", () => {
    const f = series(years);
    f.years[0].dilutedShares = 1e6;
    f.years[1].dilutedShares = 9e6;
    f.splits = [{ date: "2019-06-01", factor: 9 }];
    expect(checkIntegrity(f).ok).toBe(true);
  });
  it("detects reporting currency changes", () => {
    const f = series(years);
    f.years[0].currency = "EUR";
    f.years[1].currency = "USD";
    expect(checkIntegrity(f).reasons).toEqual(["reporting currency changed"]);
  });
  it("checks only the latest five balance sheets, includes minority interest and skips missing terms", () => {
    const f = series(years);
    Object.assign(f.years[0], { totalAssets: 100, totalLiabilities: 1, equity: 1, minorityInterest: 0 });
    Object.assign(f.years[5], { totalAssets: 100, totalLiabilities: 60, equity: 30, minorityInterest: 10 });
    Object.assign(f.years[6], { totalAssets: 100, totalLiabilities: 60, equity: 30, minorityInterest: null });
    expect(checkIntegrity(f).ok).toBe(true);
    f.years[6].minorityInterest = 5;
    expect(checkIntegrity(f).reasons).toEqual(["balance sheet off by 5% in 2024"]);
  });
  it("passes KO's recorded statements", () => {
    expect(checkIntegrity(normalizeEodhd(ko, "KO.US").fundamentals)).toEqual({ ok: true, reasons: [] });
  });
});
