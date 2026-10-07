import { describe, expect, it } from "vitest";
import { runNumericTests } from "@/lib/value/tests";
import { accruals, bvps, cagr, grossMargin, last, median, opMargin, retainedTest, roe, roic, roiic } from "@/lib/value/metrics";
import { ownerEarningsSeries } from "@/lib/value/owner-earnings";
import { makeYears } from "./synthetic";
import type { Kind } from "@/lib/value/types";

const run = (years = makeYears(), kind: Kind = "operating") => runNumericTests({ years, kind });

describe("numeric quality tests", () => {
  it("passes a steady 20% tangible ROIC", () => expect(run().moat.numeric).toBe("pass"));
  it("fails weak worst-three ROIC even with a strong median", () => {
    const result = run(makeYears({ overrides: (_, i) => ({ operatingIncome: i > 7 ? 31.25 : 125 }) })).moat;
    expect(result.numeric).toBe("fail");
    expect(result.reasons.join(" ")).toContain("worst");
  });
  it("fails a latest gross margin drop beyond four points", () => {
    const result = run(makeYears({ overrides: y => ({ grossProfit: y.fy === 2023 ? 350 : 400 }) })).moat;
    expect(result.numeric).toBe("fail");
    expect(result.reasons).toContain("Recent gross margin fell 5.0pp below the typical margin (limit 4pp)");
  });
  it("omits missing supporting gross margins", () => {
    const result = run(makeYears({ overrides: { grossProfit: null } })).moat;
    expect(result.numeric).toBe("pass");
    expect(result.reasons.join(" ")).not.toContain("not enough data for");
  });
  it("allows four revenue declines in ten years", () => {
    expect(run(makeYears({ overrides: (_, i) => ({ revenue: i < 5 ? 1000 - i * 10 : 1000 }) })).understandable.numeric).toBe("pass");
  });
  it("fails more than two losses", () => {
    expect(run(makeYears({ overrides: (_, i) => ({ netIncome: i > 7 ? -10 : 100 }) })).understandable.numeric).toBe("fail");
  });
  it("fails unstable operating margins", () => {
    expect(run(makeYears({ overrides: (_, i) => ({ operatingIncome: i % 2 ? 10 : 200 }) })).understandable.numeric).toBe("fail");
  });
  it("accepts nine years for predictability", () => expect(run(makeYears({ n: 9 })).understandable.numeric).toBe("pass"));
  it("fails three percent annual dilution", () => {
    expect(run(makeYears({ overrides: (_, i) => ({ dilutedShares: 10 * 1.03 ** i }) })).management.numeric).toBe("fail");
  });
  it("fails the dollar retention test", () => {
    expect(run(makeYears({ overrides: { marketCap: 1000 } })).management.numeric).toBe("fail");
  });
  it("flags debt-funded repurchases", () => {
    const result = run(makeYears({ overrides: (_, i) => ({ buybacks: 200, totalDebt: 100 + 200 * i }) })).management;
    expect(result.numeric).toBe("pass");
    expect(result.reasons.join(" ")).toContain("debt-funded");
  });
  it("fails buybacks concentrated at lower earnings yields", () => {
    expect(run(makeYears({ overrides: (_, i) => ({ buybacks: i * 5 }) })).management.numeric).toBe("fail");
  });
  it("does not fail acquisition spending at exactly half of earnings", () => {
    expect(run(makeYears({ overrides: (_, i) => ({ acquisitions: 50, operatingIncome: 125 - i * 5 }) })).management.numeric).toBe("pass");
  });
  it("reports fifteen percent accruals as a single flag", () => {
    expect(run(makeYears({ overrides: { netIncome: 250, ocf: 100 } })).accounting.numeric).toBe("pass");
  });
  it("allows receivables growing twenty percent annually below DSRI limit", () => {
    expect(run(makeYears({ overrides: (_, i) => ({ receivables: 100 * 1.2 ** i }) })).accounting.numeric).toBe("pass");
  });
  it("reports recurring one-time charges as a single flag", () => {
    expect(run(makeYears({ overrides: (_, i) => ({ nonRecurring: i > 7 ? 1 : 0 }) })).accounting.numeric).toBe("pass");
  });
  it("reports excessive stock compensation as a single flag", () => {
    expect(run(makeYears({ overrides: { sbc: 20, ocf: 100 } })).accounting.numeric).toBe("pass");
  });
  it.each(["bank", "insurer"] as const)("uses ROE and skips accruals for a %s", kind => {
    const result = run(makeYears({ overrides: { grossProfit: null, netIncome: 70, ocf: null, receivables: null, sbc: 0 } }), kind);
    expect(result.moat.numeric).toBe("pass");
    expect(result.accounting.reasons.join(" ")).toContain("Peer credit-loss comparison unavailable");
    expect(result.accounting.metrics.accruals).toBeUndefined();
  });
  it("does not pass financials with weak worst-three ROE", () => {
    expect(run(makeYears({ overrides: (_, i) => ({ netIncome: i > 7 ? 20 : 70 }) }), "bank").moat.numeric).toBe("fail");
  });
  it("requires five non-null ROIC observations", () => {
    expect(run(makeYears({ overrides: (_, i) => ({ preTaxIncome:null,interestExpense:null,operatingIncome: i < 7 ? null : 125 }) })).moat.numeric).toBe("unclear");
  });
  it("fails poor owner earnings conversion", () => {
    expect(run(makeYears({ overrides: { capex: 80 } })).economics.numeric).toBe("fail");
  });
  it("fails growing working capital intensity", () => {
    expect(run(makeYears({ overrides: (_, i) => ({ receivables: 100 + i * 10 }) })).economics.numeric).toBe("fail");
  });
  it("passes strong incremental returns and stable working capital intensity", () => {
    const years = makeYears({ overrides: (_, i) => ({ revenue: 1000 + i * 100, operatingIncome: 125 + i * 25, capex: 30 }) });
    expect(run(years).economics.numeric).toBe("pass");
  });
  it("does not treat missing inputs as zero", () => {
    const result = run(makeYears({ overrides: { preTaxIncome:null,interestExpense:null,netIncome: null, ocf: null, buybacks: null, operatingIncome: null } }));
    expect(Object.values(result).every(outcome => outcome.numeric === "unclear")).toBe(true);
  });
});

describe("metric arithmetic", () => {
  it("computes medians without mutating inputs", () => {
    const xs = [4, 1, 3, 2];
    expect(median(xs)).toBe(2.5);
    expect(xs).toEqual([4, 1, 3, 2]);
    expect(median([])).toBeNull();
  });
  it("sorts last fiscal periods", () => expect(last(makeYears().reverse(), 2).map(y => y.fy)).toEqual([2022, 2023]));
  it("computes CAGR and rejects invalid bases", () => {
    expect(cagr({ first: 100, last: 121, years: 2 })).toBeCloseTo(0.1);
    expect(cagr({ first: 0, last: 121, years: 2 })).toBeNull();
  });
  it("uses tax default and clamp and recognizes unlimited tangible returns", () => {
    const y = makeYears()[0];
    expect(roic({ ...y, taxExpense: null })).toBeCloseTo(0.1975);
    expect(roic({ ...y, taxExpense: 125 })).toBeCloseTo(0.1625);
    expect(roic({ ...y, equity: 0 })).toBe(1);
  });
  it("computes balance sheet and margin ratios", () => {
    const y = makeYears()[0];
    expect(roe(y)).toBe(0.2);
    expect(bvps(y)).toBe(50);
    expect(grossMargin(y)).toBe(0.4);
    expect(opMargin(y)).toBe(0.125);
    expect(accruals(y)).toBe(-0.02);
  });
  it("computes ten-year incremental returns with annual working capital changes", () => {
    expect(roiic(makeYears({ overrides: (_, i) => ({ operatingIncome: 125 + i * 25, capex: 30, receivables: 100 + i * 10 }) }))).toBeCloseTo(1);
  });
  it("matches the ten-year market gain to retained earnings after the base year", () => {
    expect(retainedTest(makeYears())).toEqual({ gain: 1000, retained: 800, startFy: 2013, endFy: 2023 });
  });
});

describe("owner earnings", () => {
  it("subtracts maintenance with stock compensation already expensed", () => {
    expect(ownerEarningsSeries(makeYears({ n: 1, overrides: { capex: 40, sbc: 5 } }))).toEqual([[2013, 80]]);
  });
  it("uses trailing five-year PPE intensity for growth capex", () => {
    const years = makeYears({ n: 6, overrides: (_, i) => ({ revenue: i === 5 ? 1200 : 1000, ppe: i === 0 ? 9000 : i === 5 ? 240 : 200, capex: 100 }) });
    expect(ownerEarningsSeries(years).at(-1)).toEqual([2018, 60]);
  });
  it("floors growth and maintenance capex at zero", () => {
    const years = makeYears({ n: 2, overrides: (_, i) => ({ revenue: i ? 500 : 1000, capex: 20 }) });
    expect(ownerEarningsSeries(years).at(-1)).toEqual([2014, 100]);
  });
  it("assumes zero SBC but preserves missing mandatory financials", () => {
    expect(ownerEarningsSeries(makeYears({ n: 1, overrides: { sbc: null } }))).toEqual([[2013, 100]]);
    expect(ownerEarningsSeries(makeYears({ n: 1, overrides: { da: null, ocf: null } }))).toEqual([[2013, null]]);
  });
});
