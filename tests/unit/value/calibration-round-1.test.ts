import { describe, expect, it } from "vitest";
import { outcome, roic } from "@/lib/value/metrics";
import { runNumericTests } from "@/lib/value/tests";
import { presentValue, valueCompany } from "@/lib/value/valuation";
import { makeYears } from "./synthetic";
import type { Year } from "@/lib/value/types";

const run = (years: Year[]) => runNumericTests({ years, kind: "operating" });

describe("live calibration round 1", () => {
  it.each([
    { checks: [true, true, null], want: "pass" },
    { checks: [true, null, null], want: "unclear" },
    { checks: [false, null, null], want: "fail" },
    { checks: [null, null, null], want: "unclear" },
  ])("R1 available checks $checks produce $want", ({ checks, want }) => {
    const result = outcome({ key: "economics", metrics: {}, series: {}, checks: checks.map(pass => ({ pass, reason: "return below threshold", data: "returns" })) });
    expect(result.numeric).toBe(want);
    expect(result.reasons).toContain("not enough data for returns");
    expect(result.reasons.join(" ")).not.toContain("insufficient data:");
  });
  it("R1 missing market caps leave management unclear without false failure reasons", () => {
    const result = run(makeYears({ overrides: { marketCap: null, buybacks: 10 } })).management;
    expect(result.numeric).toBe("unclear");
    expect(result.reasons).toContain("not enough data for the $1 retained earnings test");
    expect(result.reasons).toContain("not enough data for buyback timing");
    expect(result.reasons.join(" ")).not.toContain("below cumulative");
  });
  it("R3 absent prices keep buyback timing unavailable even with zero buybacks", () => {
    const result = run(makeYears({ overrides: { marketCap: null, buybacks: 0 } })).management;
    expect(result.numeric).toBe("unclear");
    expect(result.metrics.buybackYieldSpearman).toBeNull();
  });
  it("R2 debt-funded buybacks alone are informational", () => {
    const result = run(makeYears({ overrides: (_, i) => ({ buybacks: 200, totalDebt: 100 + i * 200 }) })).management;
    expect(result.numeric).toBe("pass");
    expect(result.metrics.debtFundedBuybacks).toBe(1);
    expect(result.reasons).toContain("potential debt-funded buybacks (informational)");
  });
  it.each([1.134, 1.465, 1.487, 1.677, 2.533])("R4 one DSRI flag at %s cannot fail accounting", dsri => {
    const result = run(makeYears({ overrides: (_, i) => ({ receivables: i === 10 ? 100 * dsri : 100 }) })).accounting;
    expect(result.metrics.dsri).toBeCloseTo(dsri);
    expect(result.numeric).toBe("pass");
    expect(result.metrics.redFlags).toBe(dsri > 1.465 ? 1 : 0);
  });
  it("R4 uses the latest year, not a three-year receivables comparison", () => {
    const result = run(makeYears({ overrides: (_, i) => ({ receivables: i >= 9 ? 300 : 100 }) })).accounting;
    expect(result.metrics.dsri).toBe(1);
    expect(result.metrics.redFlags).toBe(0);
  });
  it.each([
    { netIncome: 250, ocf: 100 }, { nonRecurring: 1 }, { sbc: 20, ocf: 100 },
  ])("R4 one forensic flag passes with evidence: %j", overrides => {
    const result = run(makeYears({ overrides })).accounting;
    expect(result.numeric).toBe("pass");
    expect(result.metrics.redFlags).toBe(1);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
  it("R4 two forensic flags fail even with missing other data", () => {
    const result = run(makeYears({ overrides: { netIncome: 250, ocf: 100, sbc: 20, receivables: null, nonRecurring: null } })).accounting;
    expect(result.numeric).toBe("fail");
    expect(result.metrics.redFlags).toBe(2);
  });
  it.each([0, -1])("R4 OCF %s against positive earnings is decisive alone", ocf => {
    const result = run(makeYears({ overrides: { ocf, netIncome: 1, receivables: null, nonRecurring: null } })).accounting;
    expect(result.numeric).toBe("fail");
    expect(result.reasons).toContain("earnings not backed by cash");
  });
  it("R4 boundaries of accruals and SBC are not flags", () => {
    const result = run(makeYears({ overrides: { netIncome: 200, ocf: 100, sbc: 15 } })).accounting;
    expect(result.metrics.redFlags).toBe(0);
    expect(result.numeric).toBe("pass");
  });
  it.each([
    { step: 0.005, start: 0.1, want: "pass" },
    { step: 0.001, start: 0.1, want: "pass" },
    { step: 0.02, start: 0.1, want: "fail" },
    { step: 0.02, start: -0.3, want: "pass" },
  ])("R5 working capital change with $step step from $start yields $want", ({ step, start, want }) => {
    const result = run(makeYears({ overrides: (_, i) => ({ receivables: 1000 * (start + i * step), operatingIncome: 125 + i * 25, capex: 30 }) })).economics;
    expect(result.metrics.nwcToRevenueChange).toBeCloseTo(step * 7);
    expect(result.numeric).toBe(want);
  });
  it("R5 exactly ten percentage points does not fail", () => {
    const result = run(makeYears({ overrides: (_, i) => ({ receivables: i < 5 ? 0 : 100, operatingIncome: 125 + i * 25, capex: 30 }) })).economics;
    expect(result.metrics.nwcToRevenueChange).toBeCloseTo(0.1);
    expect(result.numeric).toBe("pass");
  });
  it.each([4, 5, 6])("R6 %s revenue declines are evaluated at the new limit", count => {
    const result = run(makeYears({ overrides: (_, i) => ({ revenue: 1000 - Math.min(i, count) * 10, operatingIncome: (1000 - Math.min(i, count) * 10) * 0.2 }) })).understandable;
    expect(result.metrics.revenueDeclines).toBe(count);
    expect(result.numeric).toBe(count > 5 ? "fail" : "pass");
    expect(result.reasons.join(" ")).toContain(`${count} revenue declines`);
  });
  it.each([0, -100])("R7 profitable nonpositive invested capital %s passes ROIC without displaying Infinity", equity => {
    const years = makeYears({ overrides: { equity } });
    expect(roic(years[0])).toBe(Infinity);
    const result = run(years).moat;
    expect(result.numeric).toBe("pass");
    expect(result.metrics.roicMedian).toBeNull();
    expect(result.metrics.roicSecondLowest).toBeNull();
    expect(result.reasons).toContain("invested capital is nonpositive: returns effectively unlimited");
    expect(result.series.roic.every(([, v]) => v === null)).toBe(true);
  });
  it.each([0, -10])("R7 nonpositive NOPAT %s with negative capital counts as a bad year", operatingIncome => {
    const result = run(makeYears({ overrides: (_, i) => ({ equity: -100, operatingIncome: i >= 9 ? operatingIncome : 125 }) })).moat;
    expect(result.numeric).toBe("fail");
    expect(result.metrics.roicSecondLowest).toBe(0);
  });
  it("R7 includes unlimited years in mixed-return order statistics", () => {
    const result = run(makeYears({ n: 10, overrides: (_, i) => ({ equity: i < 6 ? -100 : 500, operatingIncome: i === 9 ? -10 : 125 }) })).moat;
    expect(result.numeric).toBe("pass");
    expect(result.metrics.roicMedian).toBeNull();
    expect(result.metrics.roicSecondLowest).toBeCloseTo(0.2);
  });
  it.each([
    { gp2019: 380, gp2020: 400, gp2023: 367, drop: 0.023, want: "pass" },
    { gp2019: 400, gp2020: 400, gp2023: 360, drop: 0.04, want: "pass" },
    { gp2019: 400, gp2020: 400, gp2023: 359, drop: 0.041, want: "fail" },
  ])("R8 compares 2023 with mean 2019/2020: $drop", ({ gp2019, gp2020, gp2023, drop, want }) => {
    const result = run(makeYears({ overrides: y => ({ grossProfit: y.fy === 2019 ? gp2019 : y.fy === 2020 ? gp2020 : y.fy === 2023 ? gp2023 : 500 }) })).moat;
    expect(result.metrics.grossMarginDrop).toBeCloseTo(drop);
    expect(result.numeric).toBe(want);
  });
  it("R4 one known flag with less than two-thirds coverage stays unclear", () => {
    const result = run(makeYears({ overrides: { netIncome: 250, ocf: 100, sbc: null, totalAssets: 1000, receivables: null, nonRecurring: null } })).accounting;
    // SBC defaults to zero in a present cash-flow statement: three of five checks remain.
    expect(result.metrics.redFlags).toBe(1);
    expect(result.numeric).toBe("unclear");
  });
  it("R8 does not substitute FY2020 alone when FY2019 is unavailable", () => {
    const result = run(makeYears({ overrides: y => ({ grossProfit: y.fy === 2019 ? null : y.fy === 2023 ? 300 : 400 }) })).moat;
    expect(result.metrics.grossMarginDrop).toBeNull();
    expect(result.numeric).toBe("pass");
    expect(result.reasons.join(" ")).toContain("not enough data for FY2019");
  });
  it("Legacy v1 R9 omits a zero midpoint even when the high valuation is positive", () => {
    const totalDebt = presentValue({ oe: 100, g: 0, r: 0.08, terminal: 0.03 });
    const result = valueCompany({ years: makeYears({ overrides: { cash: 0, totalDebt } }), kind: "operating", bondYield: 0.04, cyclical: false, version: 1 });
    expect(result).toEqual({ valuation: null, reason: "debt exceeds the value of owner earnings" });
  });
  it("Legacy v1 R9 omits negative owner earnings equity valuations", () => {
    const result = valueCompany({ years: makeYears({ overrides: { totalDebt: 10000 } }), kind: "operating", bondYield: 0.04, cyclical: false, version: 1 });
    expect(result).toEqual({ valuation: null, reason: "debt exceeds the value of owner earnings" });
  });
});
