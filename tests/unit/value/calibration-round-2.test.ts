import { expect, it } from "vitest";
import { kindFor } from "@/lib/value/universe";
import { run as moat } from "@/lib/value/tests/moat";
import { run as management } from "@/lib/value/tests/management";
import { valueCompany } from "@/lib/value/valuation";
import { makeYears } from "./synthetic";

it("C1 classifies credit services as banks when lending assets dominate", () => {
  expect(kindFor({ industry: "Credit Services", sector: "Financial Services", lending: { receivables: 50, totalAssets: 100 } })).toBe("bank");
  expect(kindFor({ industry: "Software", sector: "Technology" })).toBe("operating");
});

it.each(["bank", "insurer"] as const)("C2 uses tangible equity for %s returns and valuation", kind => {
  const years = makeYears({ overrides: { netIncome: 95, equity: 1000, goodwill: 400, intangibles: 100 } });
  const result = moat({ years, kind });
  expect(result.numeric).toBe("pass");
  expect(result.metrics.roeMedian).toBeCloseTo(0.19);
  expect(result.metrics.roeSecondLowest).toBeCloseTo(0.19);
  const valuation = valueCompany({ years, kind, bondYield: 0.04, cyclical: false }).valuation!;
  expect(valuation.normalized).toBe(50);
  expect(valuation.perShare.mid).toBeCloseTo(162.5);
  expect(valuation.assumptions.join(" ")).toMatch(/tangible/i);
});

it("C2 retains the median and second-lowest rules with tangible returns", () => {
  const years = makeYears({ overrides: { netIncome: 60, equity: 1000, goodwill: 400, intangibles: 100 } });
  years.at(-1)!.netIncome = 0;
  expect(moat({ years, kind: "bank" }).numeric).toBe("pass");
  years.at(-2)!.netIncome = 39;
  expect(moat({ years, kind: "bank" }).numeric).toBe("fail");
});

it.each([500, 600])("C2 quality diagnostic remains unlimited but v2 refuses nonpositive tangible book (%i goodwill)", goodwill => {
  const years = makeYears({ overrides: { equity: 500, goodwill } });
  const result = moat({ years, kind: "bank" });
  expect(result.numeric).toBe("pass");
  expect(result.metrics.roeMedian).toBeCloseTo(0.2);
  expect(result.series.roe.every(([,v])=>v!==null&&Number.isFinite(v))).toBe(true);
  const valuation = valueCompany({ years, kind: "bank", bondYield: 0.04, cyclical: false }).valuation!;
  expect(valuation).toBeNull();
});

it("C2 does not reward losses with negative tangible equity", () => {
  expect(moat({ years: makeYears({ overrides: { netIncome: -10, equity: 100, goodwill: 200 } }), kind: "insurer" }).numeric).toBe("fail");
});

it("C2 uses retained sustainable tangible ROE for financial growth", () => {
  const years = makeYears({ overrides: (_, i) => ({ equity: 1000, goodwill: 700 - i * 20 }) });
  const valuation = valueCompany({ years, kind: "bank", bondYield: 0.04, cyclical: false }).valuation!;
  expect(valuation.normalized).toBe(50);
  expect(valuation.growth).toBeCloseTo(.06);
});

it.each([
  { first: 10, middle: 30, end: 20, want: "pass" },
  { first: 30, middle: 10, end: 20, want: "pass" },
  { first: 10, middle: 15, end: 20, want: "fail" },
  { first: 10, middle: 10, end: 10, want: "pass" },
])("C3 fails dilution only when both windows exceed 1% ($first/$middle/$end)", ({ first, middle, end, want }) => {
  const years = makeYears({ overrides: (_, i) => ({ dilutedShares: i === 0 ? first : i === 5 ? middle : end }) });
  const result = management({ years, kind: "operating" });
  expect(result.numeric).toBe(want);
  expect(result.metrics.shareCagr).toBeCloseTo((end / first) ** 0.1 - 1);
  expect(result.metrics.shareCagr5).toBeCloseTo((end / middle) ** 0.2 - 1);
});

it("C3 leaves dilution unavailable if growth exceeds 1% in the sole available window", () => {
  const years = makeYears({ n: 6, overrides: (_, i) => ({ dilutedShares: 10 * 1.05 ** i }) });
  const result = management({ years, kind: "operating" });
  expect(result.numeric).toBe("unclear");
  expect(result.reasons.join(" ")).toMatch(/not enough data for the \$1 test or per-share value growth/);
});

it.each([5, 10])("C3 passes when the %i-year CAGR is exactly 1%", window => {
  const end = 10 * 1.01 ** window;
  const years = makeYears({ overrides: (_, i) => ({ dilutedShares: i === 10 ? end : i === 10 - window ? 10 : 1 }) });
  expect(management({ years, kind: "operating" }).numeric).toBe("pass");
});

it("C3 can clear dilution on an available shrinking five-year window", () => {
  const years = makeYears({ n: 6, overrides: (_, i) => ({ dilutedShares: 20 - i }) });
  const result = management({ years, kind: "operating" });
  // Dilution clears, but the core per-share comparison requires seven years.
  expect(result.numeric).toBe("unclear");
  expect(result.metrics.shareCagr).toBeNull();
  expect(result.reasons.join(" ")).not.toMatch(/not enough data for diluted share growth/);
});
