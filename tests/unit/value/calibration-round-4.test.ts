import { describe, expect, it } from "vitest";
import { run } from "@/lib/value/tests/management";
import { makeYears } from "./synthetic";
import type { Year } from "@/lib/value/types";
import { retainedTest } from "@/lib/value/metrics";

// Dollars and market caps at large-company scale; all unrelated checks pass.
function capitalYears(overrides: (i: number) => Partial<Year> = () => ({})) {
  return makeYears({ from: 2015, overrides: (_, i) => ({
    marketCap: 100e9 + i * 20e9, netIncome: 5e9, dividendsPaid: 2e9,
    ocf: 8e9, equity: 20e9, cash: 0, totalDebt: 0, goodwill: 0, intangibles: 0,
    operatingIncome: 5e9, preTaxIncome: 5e9, taxExpense: 1e9,
    dilutedShares: 1e9, buybacks: 0, acquisitions: 0, ...overrides(i),
  }) });
}
const management = (years: Year[]) => run({ years, kind: "operating" });

describe("M2 buyback rank discipline", () => {
  it.each([
    { count: 6, average: 0.03, want: "fail" },
    { count: 5, average: 0.03, want: "pass" },
    { count: 6, average: 0.01, want: "pass" },
    { count: 6, average: 0.0101, want: "fail" },
  ])("requires six material price-blind years: $count / $average", ({ count, average, want }) => {
    const result = management(capitalYears(i => {
      const cap = 100e9 + i * 20e9;
      return { buybacks: i > 10 - count ? cap * (average + (i - (10 - (count - 1) / 2)) * 0.001) : 0 };
    }));
    expect(result.numeric).toBe(want);
    expect(result.metrics.buybackYieldSpearman).toBeCloseTo(-1);
    expect(result.metrics.averageBuybackYield).toBeCloseTo(average);
    expect(result.metrics.buybackYears).toBe(count);
    expect(result.metrics).not.toHaveProperty("buybackYieldCovariance");
    if (want === "pass") expect(result.reasons).toContain("buybacks unrelated to price (informational)");
  });
  it("ranks yields, not dollar amounts, with cheaper years receiving more buyback yield", () => {
    const result = management(capitalYears(i => ({ buybacks: 2e9 + i * 0.1e9 })));
    expect(result.metrics.buybackYieldSpearman).toBeCloseTo(1);
    expect(result.numeric).toBe("pass");
    expect(result.reasons).toContain("buybacks leaned toward cheaper years (informational)");
  });
  it("uses average ranks for ties", () => {
    const x = [1, 1, 2, 3, 3, 4], y = [4, 2, 2, 3, 1, 1];
    const result = management(capitalYears(i => i < 5 ? {} : ({
      marketCap: 300e9, buybacks: x[i - 5] * 3e9, netIncome: y[i - 5] * 3e9,
    })));
    // Centered average ranks: cross-product -10.5, each sum of squares 16.5.
    expect(result.metrics.buybackYieldSpearman).toBeCloseTo(-7 / 11);
    expect(result.numeric).toBe("fail");
  });
  it("does not fail at exactly rho minus one-half", () => {
    const earningsRanks = [3, 5, 6, 7, 4, 2, 1];
    const result = management(capitalYears(i => i < 4 ? {} : ({
      marketCap: 300e9, buybacks: (i - 3) * 3e9, netIncome: earningsRanks[i - 4] * 3e9,
    })));
    expect(result.metrics.buybackYieldSpearman).toBe(-0.5);
    expect(result.numeric).toBe("pass");
  });
  it("treats constant ranks as undefined and informational", () => {
    const result = management(capitalYears(i => ({ buybacks: (100e9 + i * 20e9) * 0.02 })));
    expect(result.metrics.buybackYieldSpearman).toBeNull();
    expect(result.numeric).toBe("pass");
    expect(result.reasons).toContain("buybacks unrelated to price (informational)");
  });
  it("excludes zero buybacks and missing market caps or earnings", () => {
    const result = management(capitalYears(i => ({
      buybacks: i < 5 ? 0 : 5e9, marketCap: i === 5 ? null : 100e9 + i * 20e9,
      netIncome: i === 6 ? null : 5e9,
    })));
    expect(result.metrics.buybackYears).toBe(4);
    expect(result.metrics.buybackYieldSpearman).toBeCloseTo(1);
  });
});

describe("M1 retained earnings aligned with available fiscal endpoints", () => {
  it("uses a nine-year period when only the oldest cap is missing", () => {
    const years = capitalYears(i => ({ marketCap: i === 0 ? null : 100e9 + i * 20e9 }));
    expect(retainedTest(years)).toMatchObject({ gain: 180e9, retained: 27e9, startFy: 2016, endFy: 2025 });
  });
  it("excludes the baseline year's income and preserves an actual failure", () => {
    const years = capitalYears(i => ({ marketCap: i < 2 ? null : 100e9, netIncome: i === 2 ? 1e12 : 5e9 }));
    expect(retainedTest(years)).toMatchObject({ gain: 0, retained: 24e9, startFy: 2017, endFy: 2025 });
    expect(management(years).reasons).toContain("market cap gain below cumulative retained earnings");
  });
  it.each(["short", "gap", "missing-income", "missing-latest"])("keeps %s history unavailable", missing => {
    let years = capitalYears(i => ({
      marketCap: missing === "short" && i < 4 || missing === "missing-latest" && i === 10 ? null : 100e9 + i * 20e9,
      netIncome: missing === "missing-income" && i === 7 ? null : 5e9,
    }));
    if (missing === "gap") years = years.filter(y => y.fy !== 2022);
    const retained = retainedTest(years);
    expect(retained.gain === null || retained.retained === null).toBe(true);
  });
  it("can use exactly seven complete years", () => {
    expect(retainedTest(capitalYears(i => ({ marketCap: i < 3 ? null : 100e9 + i * 20e9 })))).toMatchObject({ gain: 140e9, retained: 21e9 });
  });
});

describe("M3 acquisition materiality and endpoint ROIC", () => {
  it.each([
    { spend: 30e9, first: 0.30, latest: 0.10, want: "fail" },
    { spend: 25e9, first: 0.30, latest: 0.10, want: "pass" },
    { spend: 30e9, first: 0.90, latest: 0.20, want: "pass" },
    { spend: 30e9, first: 0.30, latest: 0.15, want: "pass" },
    { spend: 30e9, first: 0.15, latest: 0.10, want: "pass" },
    { spend: 30e9, first: 0.15, latest: 0.09, want: "fail" },
  ])("$spend acquisition proxy; ROIC $first to $latest => $want", ({ spend, first, latest, want }) => {
    const result = management(capitalYears(i => ({ acquisitions: spend / 10, acquisitionsProxy: true,
      operatingIncome: 20e9 * (i <= 3 ? first : latest), taxExpense: 0,
    })));
    expect(result.numeric).toBe(want);
    expect(result.metrics.acquisitionSpend).toBe(spend);
    expect(result.metrics.cumulativeNetIncome).toBe(50e9);
    expect(result.metrics.roicFirst3Median).toBeCloseTo(first);
    expect(result.metrics.roicLast3Median).toBeCloseTo(latest);
    expect(result.metrics).not.toHaveProperty("roicTrend");
    expect(result.reasons.join(" ")).toContain("ROIC first 3 years vs last 3 years");
  });
  it("uses finite capped returns in medians for nonpositive capital", () => {
    const result = management(capitalYears(i => ({ acquisitions: 3e9,
      equity: i >= 8 ? -1e9 : 20e9,
    })));
    expect(result.numeric).toBe("pass");
    expect(result.metrics.roicLast3Median).toBeGreaterThan(1);
    expect(result.reasons.join(" ")).not.toContain("unavailable");
  });
  it("uses three-year medians rather than single years or means", () => {
    const returns = [0.3, 0.3, 2, 0.4, 0.25, 0.2, 0.18, 0.09, 0.1, 0.8];
    const result = management(capitalYears(i => ({ acquisitions: 3e9,
      operatingIncome: 20e9 * (returns[i - 1] ?? 0.3), taxExpense: 0,
    })));
    expect(result.metrics.roicFirst3Median).toBeCloseTo(0.3);
    expect(result.metrics.roicLast3Median).toBeCloseTo(0.1);
    expect(result.numeric).toBe("fail");
  });
  it("keeps unknown ten-year net income from creating an acquisition failure", () => {
    const result = management(capitalYears(i => ({ acquisitions: 3e9,
      netIncome: i === 4 ? null : 5e9, operatingIncome: i < 5 ? 6e9 : 2e9, taxExpense: 0,
    })));
    expect(result.metrics.cumulativeNetIncome).toBeNull();
    expect(result.reasons.join(" ")).not.toContain("exceeds half of ten-year");
  });
  it("does not turn missing endpoint ROIC into a decline", () => {
    const result = management(capitalYears(i => ({ acquisitions: 3e9, operatingIncome: i === 10 ? null : 5e9 })));
    expect(result.numeric).not.toBe("fail");
    expect(result.metrics.roicLast3Median).toBeNull();
    expect(result.reasons.join(" ")).not.toContain("not enough data for");
  });
  it("does not call partial sums ten-year evidence", () => {
    const result = management(capitalYears(i => ({ acquisitions: i === 5 ? null : 3e9, goodwill: i === 5 ? null : 0, intangibles: i === 5 ? null : 0, acquisitionsProxy: true })));
    expect(result.metrics.acquisitionSpend).toBeNull();
    expect(result.numeric).not.toBe("fail");
  });
});
