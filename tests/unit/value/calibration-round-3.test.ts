import { expect, it } from "vitest";
import { normalizeEodhd } from "@/lib/value/normalize-eodhd";
import { kindFor } from "@/lib/value/universe";
import { checkIntegrity } from "@/lib/value/integrity";
import { run as economics } from "@/lib/value/tests/economics";
import type { Fundamentals } from "@/lib/value/types";
import { makeYears } from "./synthetic";

it.each([
  { receivables: 7, loans: 0, assets: 100, want: "operating" },
  { receivables: 40, loans: 0, assets: 100, want: "operating" },
  { receivables: 20, loans: 21, assets: 100, want: "bank" },
  { receivables: 41, loans: 0, assets: 100, want: "bank" },
  { receivables: 41, loans: 0, assets: 0, want: "operating" },
])("C5 uses the latest balance sheet's lending asset ratio ($receivables/$loans/$assets)", ({ receivables, loans, assets, want }) => {
  const { patch } = normalizeEodhd({
    General: { Industry: "Credit Services", Sector: "Financial Services" },
    Financials: { Balance_Sheet: { yearly: {
      "2025-12-31": { netReceivables: String(receivables), netLoans: String(loans), totalAssets: String(assets) },
      "2024-12-31": { netReceivables: "90", totalAssets: "100" },
    } } },
  }, "TEST.US");
  expect(patch.kind).toBe(want);
});

it.each(["bank", "insurer"] as const)("C5 skips working capital for a %s, keeping cash-conversion failures", kind => {
  const years = makeYears({ overrides: (_, i) => ({ receivables: 100 + i * 100, operatingIncome: 125 + i * 25 }) });
  expect(economics({ years, kind: "operating" }).numeric).toBe("fail");
  const result = economics({ years, kind });
  expect(result.numeric).toBe("pass");
  expect(result.reasons.join(" ")).not.toMatch(/working capital/);
  years.forEach(y => { y.sbc = 80; });
  expect(economics({ years, kind }).numeric).toBe("fail");
});

it("C6 retains the suffix after the LAST gap, before minYears, and preserves its note", () => {
  const f: Fundamentals = { id: "MA.US", currency: "USD", fetchedAt: "", integrity: { ok: true, reasons: [] },
    years: [ ...makeYears({ from: 1997, n: 2 }), ...makeYears({ from: 2000, n: 2 }), ...makeYears({ from: 2010, n: 10 }) ] };
  f.integrity = checkIntegrity(f);
  expect(f.years.map(y => y.fy)).toEqual([2010,2011,2012,2013,2014,2015,2016,2017,2018,2019]);
  expect(f.integrity.ok).toBe(true);
  expect(f.integrity.reasons).toEqual([]);
  expect(f.integrity.notes?.join(" ")).toMatch(/gap.*1999/);
  expect(checkIntegrity(f)).toEqual(f.integrity);
});

it("C6 fails minYears when the post-gap suffix is too short", () => {
  const f: Fundamentals = { id: "TEST.US", currency: "USD", fetchedAt: "", integrity: { ok: true, reasons: [] },
    years: [...makeYears({ from: 2000, n: 10 }), ...makeYears({ from: 2020, n: 6 })] };
  expect(checkIntegrity(f).reasons).toEqual(["fewer than 7 annual periods"]);
  expect(f.years).toHaveLength(6);
});

it("C5 keeps AXP as the documented missing-loans exception, never overriding available loan data", () => {
  const input = { id: "AXP.US", industry: "Credit Services", sector: "Financial Services", lending: { receivables: 61851000000, totalAssets: 300052000000 } };
  expect(kindFor(input)).toBe("bank");
  expect(kindFor({ ...input, lending: { ...input.lending, loans: 0 } })).toBe("operating");
  expect(kindFor({ ...input, id: "V.US" })).toBe("operating");
  expect(kindFor({ ...input, id: "MA.US" })).toBe("operating");
});

it("C5 counts a net loan aggregate once, excluding gross components and reserves", () => {
  const { patch } = normalizeEodhd({ General: { Industry: "Credit Services" }, Financials: { Balance_Sheet: { yearly: {
    "2025-12-31": { totalAssets: 100, netReceivables: 10, netLoans: 20, grossLoans: 30, loanLossReserves: 10 },
  } } } }, "TEST.US");
  expect(patch.kind).toBe("operating");
});
