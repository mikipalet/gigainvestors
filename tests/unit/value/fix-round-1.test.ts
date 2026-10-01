import { describe, expect, it } from "vitest";
import { last, withZeroDefaults } from "@/lib/value/metrics";
import { runNumericTests } from "@/lib/value/tests";
import { ownerEarningsSeries } from "@/lib/value/owner-earnings";
import { valueCompany } from "@/lib/value/valuation";
import { priceTest } from "@/lib/value/price-test";
import { makeYears } from "./synthetic";
import type { Year } from "@/lib/value/types";

const value = (years: Year[], cyclical = false) => valueCompany({ years, kind: "operating", bondYield: 0.04, cyclical });
const run = (years: Year[]) => runNumericTests({ years, kind: "operating" });

describe("round 1 controller rulings", () => {
  it.each(["operating", "bank", "insurer"] as const)("allows exactly one weak return year for %s", kind => {
    const returns = (second: number) => makeYears({ n: 10, overrides: (_, i) => {
      const r = i === 0 ? 0.02 : i === 1 ? second : 0.20;
      return { operatingIncome: r * 625, netIncome: r * 500 };
    } });
    expect(runNumericTests({ years: returns(0.14), kind }).moat.numeric).toBe("pass");
    expect(runNumericTests({ years: returns(kind === "operating" ? 0.09 : 0.07), kind }).moat.numeric).toBe("fail");
    expect(runNumericTests({ years: returns(kind === "operating" ? 0.10 : 0.08), kind }).moat.numeric).toBe("pass");
  });
  it("defaults each optional item only within an existing statement", () => {
    const years = makeYears({ n: 2, overrides: (_, i) => ({
      statementCoverage:{balance:i===0,cashFlow:i===1}, totalAssets: i === 0 ? 1000 : null, ocf: i === 0 ? null : 0,
      goodwill: null, intangibles: null, inventory: null, totalDebt: null,
      dividendsPaid: null, buybacks: null, acquisitions: null, sbc: null,
    }) });
    const normalized = withZeroDefaults(years);
    expect(normalized[0]).toMatchObject({ goodwill: 0, intangibles: 0, inventory: 0, totalDebt: 0, dividendsPaid: null, buybacks: null, acquisitions: null, sbc: null });
    expect(normalized[1]).toMatchObject({ goodwill: null, intangibles: null, inventory: null, totalDebt: null, dividendsPaid: 0, buybacks: 0, acquisitions: null, sbc: 0 });
    expect(withZeroDefaults(makeYears())[0]).toMatchObject(makeYears()[0]);
    expect(years[0].goodwill).toBeNull();
  });
  it("allows a single loss year without averaging it into the worst return", () => {
    const years = makeYears({ n: 10, overrides: (_, i) => ({ operatingIncome: i === 0 ? -125 : 125 }) });
    expect(run(years).moat.numeric).toBe("pass");
  });
  it("compares the latest receivables to sales ratios", () => {
    const years = makeYears({ overrides: (_, i) => ({ receivables: i === 10 ? 150 : 100, revenue: i === 10 ? 1300 : 1000 }) });
    const result = run(years).accounting;
    expect(result.metrics.dsri).toBeCloseTo(1.5 / 1.3);
    expect(result.numeric).toBe("pass");
  });
  it("scores and values a company without optional balance sheet and cash flow items", () => {
    const years = makeYears({ overrides: (_, i) => ({
      statementCoverage:{balance:true,cashFlow:true,income:true}, revenue: 1000 + 100 * i, grossProfit: 400 + 40 * i, operatingIncome: 125 + 25 * i, capex: 30,
      goodwill: null, intangibles: null, inventory: null, totalDebt: null,
      dividendsPaid: null, buybacks: null, acquisitions: null, sbc: null,
    }) });
    const result = run(years);
    expect(result.moat.numeric).toBe("pass");
    expect(result.economics.numeric).toBe("pass");
    expect(result.management.numeric).toBe("pass");
    expect(result.accounting.numeric).toBe("pass");
    expect(value(years).valuation?.netCash).toBe(100);
    expect(value(years).valuation?.assumptions).toContain("stock compensation not reported");
    expect(years[0].totalDebt).toBeNull();
  });
  it("preserves missing optional items when their statements are absent", () => {
    const years = makeYears({ overrides: { totalAssets: null, ocf: null, goodwill: null, intangibles: null, inventory: null, totalDebt: null, dividendsPaid: null, buybacks: null, acquisitions: null, sbc: null } });
    const result = run(years);
    expect(result.moat.numeric).toBe("unclear");
    expect(result.management.numeric).toBe("pass");
    expect(result.economics.numeric).toBe("pass");
    expect(value(years).valuation).toBeNull();
  });
  it("leaves fewer than seven years private with the history count", () => {
    const result = run(makeYears({ n: 6 })).understandable;
    expect(result.numeric).toBe("unclear");
    expect(result.reasons).toContain("Not tested: only 6 years");
  });
  it("fails a negative average operating margin despite positive net income", () => {
    expect(run(makeYears({ overrides: { operatingIncome: -10 } })).understandable.numeric).toBe("fail");
  });
  it.each([0, -1])("fails positive earnings unbacked by OCF %s", ocf => {
    const result = run(makeYears({ overrides: { ocf, netIncome: 10 } })).accounting;
    expect(result.numeric).toBe("fail");
    expect(result.reasons).toContain("earnings not backed by cash");
  });
  it.each([0, -1])("keeps SBC unavailable but permits accounting coverage with OCF %s and nonpositive earnings", ocf => {
    const result = run(makeYears({ overrides: { ocf, netIncome: -10 } })).accounting;
    expect(result.metrics.sbcToOcf).toBeNull();
    expect(result.numeric).toBe("pass");
  });
  it("excludes older rows from a sparse fiscal window", () => {
    const years = makeYears().filter(y => y.fy !== 2022).reverse();
    expect(last(years, 2).map(y => y.fy)).toEqual([2023]);
    expect(last([], 5)).toEqual([]);
    expect(last(years, 0)).toEqual([]);
  });
  it("does not substitute old rows for missing normalization years", () => {
    expect(value(makeYears().filter(y => y.fy !== 2022))).toEqual({ valuation: null, reason: "insufficient owner earnings history" });
  });
  it("does not substitute old rows for five-year accounting and economics data", () => {
    const result = run(makeYears().filter(y => y.fy !== 2022));
    expect(result.accounting.metrics.restructuringYears).toBeNull();
    expect(result.economics.metrics.oeToNi).toBeNull();
  });
  it("uses fiscal years for the PPE averaging window", () => {
    const years = makeYears({ n: 7, overrides: (_, i) => ({ revenue: i === 6 ? 1200 : 1000, ppe: i <= 1 ? 9000 : i === 6 ? 240 : 200, capex: 100 }) }).filter(y => y.fy !== 2017);
    expect(ownerEarningsSeries(years).at(-1)).toEqual([2019, 60]);
  });
  it.each([false, true])("limits missing SBC assumptions to the normalization window (cyclical %s)", cyclical => {
    const years = makeYears({ overrides: (_, i) => ({ sbc: i === 0 ? null : 0 }) });
    expect(value(years, cyclical).valuation?.assumptions).not.toContain("stock compensation not reported");
    years[6].sbc = null;
    expect(value(years, cyclical).valuation?.assumptions).toContain("stock compensation not reported");
  });
  it.each([0, -1])("keeps nonpositive price %s unclear", price => {
    expect(priceTest({ valuation: value(makeYears()).valuation, price, requiredMos: 0.25 })).toEqual({ result: "unclear", mos: null });
  });
});
