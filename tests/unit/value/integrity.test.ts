import { describe, expect, it } from "vitest";
import ko from "../../fixtures/value/eodhd/fund-KO.US.json";
import { normalizeEodhd } from "../../../lib/value/normalize-eodhd";
import { checkIntegrity } from "../../../lib/value/integrity";
import type { Fundamentals, PriceHistory, Year } from "../../../lib/value/types";

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
    expect(checkIntegrity(series([2015, 2017])).notes).toContain("gap year 2016; history retained from 2017");
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

it.each([
  { ratio: 4.99, label: "5:1" },
  { ratio: 0.1, label: "1:10" },
])("adjusts all earlier shares for a $label split and is idempotent", ({ ratio, label }) => {
  const f = series(years);
  f.years.forEach((y, i) => Object.assign(y, {
    dilutedShares: i < 3 ? 100 : 100 * ratio, netIncome: 200, equity: 1000,
  }));
  const evidence = { source: "edinet" as const, priceHistory: [["2021-05", 100], ["2021-06", 100 / ratio]] as PriceHistory };
  f.integrity = checkIntegrity(f, evidence);
  expect(f.years).toHaveLength(7);
  expect(f.years.map(y => y.dilutedShares)).toEqual(Array(7).fill(100 * ratio));
  expect(f.years[0].netIncome! / f.years[0].dilutedShares!).toBeCloseTo(2 / ratio);
  expect(f.integrity.notes).toEqual([`split ${label} in 2021 adjusted`]);
  f.integrity = checkIntegrity(f, evidence);
  expect(f.years[0].dilutedShares).toBeCloseTo(100 * ratio);
  expect(f.integrity.notes).toHaveLength(1);
});

it("truncates genuine 5x dilution when equity follows the shares but income does not", () => {
  const f = series(years);
  f.years.forEach((y, i) => Object.assign(y, {
    dilutedShares: i < 3 ? 100 : 500, netIncome: 200, equity: i < 3 ? 1000 : 5000,
  }));
  const earlier = f.years[0];
  const result = checkIntegrity(f, { source: "edinet", priceHistory: [["2021-05", 100], ["2021-06", 20]] });
  expect(f.years.map(y => y.fy)).toEqual([2021, 2022, 2023, 2024]);
  expect(earlier.dilutedShares).toBe(100);
  expect(result.notes).toEqual(["share count jumped 5x in 2021; history retained from 2021"]);
});

it("does not infer splits from a noninteger share jump", () => {
  const f = series(years);
  f.years.forEach((y, i) => Object.assign(y, {
    dilutedShares: i < 3 ? 100 : 550, netIncome: 200, equity: 1000,
  }));
  expect(checkIntegrity(f, { source: "edinet", priceHistory: [["2021-05", 100], ["2021-06", 20]] }).notes?.[0]).toContain("share count jumped");
});

it("rejects a split when income scales even though equity is flat", () => {
  const f = series(years);
  f.years.forEach((y, i) => Object.assign(y, {
    dilutedShares: i < 3 ? 100 : 500, netIncome: i < 3 ? 200 : 1000, equity: 1000,
  }));
  expect(checkIntegrity(f, { source: "edinet", priceHistory: [["2021-05", 100], ["2021-06", 20]] }).notes).toEqual(["share count jumped 5x in 2021; history retained from 2021"]);
});

it("compounds successive splits without adjusting already adjusted data twice", () => {
  const f = series(years);
  f.years.forEach((y, i) => Object.assign(y, {
    dilutedShares: i < 2 ? 100 : i < 4 ? 200 : 600, netIncome: 200, equity: 1000,
  }));
  const evidence = { source: "edinet" as const, priceHistory: [["2020-05", 100], ["2020-06", 50], ["2022-05", 90], ["2022-06", 30]] as PriceHistory };
  f.integrity = checkIntegrity(f, evidence);
  expect(f.years.map(y => y.dilutedShares)).toEqual([600, 600, 600, 600, 600, 600, 600]);
  expect(f.integrity.notes).toEqual(["split 2:1 in 2020 adjusted", "split 3:1 in 2022 adjusted"]);
  f.integrity = checkIntegrity(f, evidence);
  expect(f.integrity.notes).toHaveLength(2);
});

function shareJump(ratio = 5): Fundamentals {
  const f = series(years);
  f.years.forEach((y, i) => Object.assign(y, {
    dilutedShares: i < 3 ? 100 : 100 * ratio, netIncome: 200, equity: 1000,
  }));
  return f;
}

it("never adjusts EODHD's already adjusted shares even with matching prices", () => {
  const f = shareJump(2);
  const result = checkIntegrity(f, { source: "eodhd", priceHistory: [["2021-05", 100], ["2021-06", 50]] });
  expect(f.years.map(y => y.dilutedShares)).toEqual([100, 100, 100, 200, 200, 200, 200]);
  expect(result.notes).toEqual([]);
});

it("adjusts an EDINET 5x jump corroborated by a single-month 5x price drop", () => {
  const f = shareJump();
  checkIntegrity(f, { source: "edinet", priceHistory: [["2021-05", 100], ["2021-06", 20]] });
  expect(f.years.map(y => y.dilutedShares)).toEqual([500, 500, 500, 500, 500, 500, 500]);
});

it.each<{ label: string; prices: PriceHistory | null }>([
  { label: "absent history", prices: null },
  { label: "flat prices", prices: [["2021-05", 100], ["2021-06", 100]] },
  { label: "wrong direction", prices: [["2021-05", 100], ["2021-06", 500]] },
  { label: "outside tolerance", prices: [["2021-05", 100], ["2021-06", 30]] },
  { label: "missing intervening month", prices: [["2021-04", 100], ["2021-06", 20]] },
  { label: "drop before fiscal year", prices: [["2020-11", 100], ["2020-12", 20]] },
  { label: "drop after fiscal year", prices: [["2022-01", 100], ["2022-02", 20]] },
  { label: "gradual drop", prices: [["2021-04", 100], ["2021-05", 50], ["2021-06", 20]] },
])("truncates EDINET's uncorroborated 5x jump: $label", ({ prices }) => {
  const f = shareJump();
  const before = f.years[0];
  const result = checkIntegrity(f, { source: "edinet", priceHistory: prices });
  expect(f.years.map(y => y.fy)).toEqual([2021, 2022, 2023, 2024]);
  expect(before.dilutedShares).toBe(100);
  expect(result.notes).toEqual(["share count jumped 5x in 2021; history retained from 2021"]);
});

it("uses fiscal end dates, accepts year-boundary prices and the 20% factor boundary", () => {
  const f = shareJump();
  f.years.forEach(y => { y.end = `${y.fy}-03-31`; });
  checkIntegrity(f, { source: "edinet", priceHistory: [["2020-12", 100], ["2021-01", 25]] });
  expect(f.years).toHaveLength(7);
  expect(f.years[0].dilutedShares).toBe(500);
});

it("does not infer a split when source is unknown", () => {
  const f = shareJump();
  checkIntegrity(f);
  expect(f.years.map(y => y.fy)).toEqual([2021, 2022, 2023, 2024]);
});
