import { describe, expect, it } from "vitest";
import { presentValue, valueCompany } from "@/lib/value/valuation";
import { priceTest } from "@/lib/value/price-test";
import type { Valuation } from "@/lib/value/types";
import { makeYears } from "./synthetic";

const value = (years = makeYears()) => valueCompany({ years, kind: "operating", bondYield: 0.04, cyclical: false });

describe("discounted owner earnings", () => {
  it.each([
    [0, 0.10, 1243.7290],
    [0.08, 0.10, 1942.0812],
    [0.04, 0.11, 1359.5014],
    [0.08, 0.09, 2281.3184],
  ])("discounts growth %s at %s using the stated fade", (g, r, expected) => {
    expect(presentValue({ oe: 100, g, r, terminal: 0.03 })).toBeCloseTo(expected, 4);
  });
  it("values a flat 100 owner earnings business", () => {
    const result = value();
    expect(result.reason).toBeNull();
    expect(result.valuation).toMatchObject({ method: "owner_earnings", normalized: 100, growth: 0, discountRate: 0.10, netCash: 80, shares: 10, equityBondYield: 0.05 });
    expect(result.valuation!.perShare.low).toBeCloseTo(117.3025, 4);
    expect(result.valuation!.perShare.mid).toBeCloseTo(132.3729, 4);
    expect(result.valuation!.perShare.high).toBeCloseTo(152.4348, 4);
  });
  it("rejects negative owner earnings", () => {
    expect(value(makeYears({ overrides: { netIncome: -100 } }))).toEqual({ valuation: null, reason: "owner earnings not positive" });
  });
  it("rejects missing and zero shares", () => {
    for (const dilutedShares of [null, 0]) expect(value(makeYears({ overrides: { dilutedShares } }))).toEqual({ valuation: null, reason: "no share count" });
  });
  it("does not silently discard missing net cash", () => {
    expect(value(makeYears({ overrides: { cash: null } }))).toEqual({ valuation: null, reason: "net cash unavailable" });
  });
  it("requires five owner earnings observations", () => {
    expect(value(makeYears({ n: 4 })).valuation).toBeNull();
  });
  it("normalizes cyclicals over five years under W1", () => {
    const result = valueCompany({ years: makeYears({ overrides: (_, i) => ({ netIncome: i < 7 ? 50 : 100 }) }), kind: "operating", bondYield: 0.04, cyclical: true });
    expect(result.valuation!.normalized).toBe(100);
    const different = valueCompany({ years: makeYears({ overrides: (_, i) => ({ netIncome: i < 8 ? 50 : 100 }) }), kind: "operating", bondYield: 0.04, cyclical: true });
    expect(different.valuation!.normalized).toBe(100);
  });
  it("records the missing SBC assumption", () => {
    const result = valueCompany({ years: makeYears({ overrides: { sbc: null } }), kind: "operating", bondYield: 0.04, cyclical: false });
    expect(result.valuation!.assumptions).toContain("stock compensation not reported");
    expect(result.valuation!.discountRate).toBe(0.10);
  });
  it("uses the bond yield plus spread when higher than the 10% floor", () => {
    const result = valueCompany({ years: makeYears(), kind: "operating", bondYield: 0.08, cyclical: false, currency: "JPY" });
    expect(result.valuation!.discountRate).toBeCloseTo(0.12);
    expect(result.valuation!.currency).toBe("JPY");
  });
  it("adds excess cash after discounting and before dividing by shares", () => {
    expect(value(makeYears({ overrides: { cash: 200 } })).valuation!.perShare.mid).toBeCloseTo(142.3729, 4);
  });
  it("caps positive growth at eight percent", () => {
    const years = makeYears({ overrides: (_, i) => ({ revenue: 1000 * 1.2 ** i, netIncome: 100 * 1.2 ** i, operatingIncome: 125 * 1.2 ** i, preTaxIncome: 125 * 1.2 ** i, taxExpense: 25 * 1.2 ** i, capex: 60 * 1.2 ** i, da: 0, ppe: 0 }) });
    expect(value(years).valuation!.growth).toBe(0.08);
  });
  it("floors shrinking growth at zero", () => {
    expect(value(makeYears({ overrides: (_, i) => ({ netIncome: 100 * 0.95 ** i }) })).valuation!.growth).toBe(0);
  });
  it("defaults growth to zero when all three estimates are unavailable", () => {
    expect(value(makeYears({ n: 5 })).valuation!.growth).toBe(0);
  });
  it("reconciles bridge components to the median margin at current scale", () => {
    const years = makeYears({ n: 5, overrides: (_, i) => ({ netIncome: [100, 200, 100, 300, 100][i], da: [0, 0, 100, 0, 0][i], capex: 0 }) });
    const bridge = value(years).valuation!.bridge;
    expect(bridge.slice(0, 4).reduce((total, item) => total + item.value, 0)).toBe(200);
    expect(bridge[4].value).toBe(200);
  });
});

describe("financial company valuation", () => {
  it.each(["bank", "insurer"] as const)("uses justified book value for %s", kind => {
    const result = valueCompany({ years: makeYears({ overrides: { netIncome: 70 } }), kind, bondYield: 0.04, cyclical: false });
    expect(result.valuation).toMatchObject({ method: "book_value", normalized: 50, growth: 0.06 });
    expect(result.valuation!.perShare.low).toBeCloseTo(80);
    expect(result.valuation!.perShare.mid).toBeCloseTo(100);
    expect(result.valuation!.perShare.high).toBeCloseTo(133.3333333333);
  });
  it("rejects nonpositive equity", () => {
    expect(valueCompany({ years: makeYears({ overrides: { equity: 0 } }), kind: "bank", bondYield: 0.04, cyclical: false })).toEqual({ valuation: null, reason: "book value not positive" });
  });
  it("caps justified P/B at four", () => {
    const result = valueCompany({ years: makeYears({ overrides: { netIncome: 500 } }), kind: "bank", bondYield: 0.04, cyclical: false });
    expect(result.valuation!.perShare.mid).toBe(200);
    expect(result.valuation!.perShare.low).toBeCloseTo(160);
    expect(result.valuation!.perShare.high).toBeCloseTo(800/3);
  });
  it("requires five ROE observations", () => {
    expect(valueCompany({ years: makeYears({ n: 4 }), kind: "bank", bondYield: 0.04, cyclical: false }).valuation).toBeNull();
  });
});

describe("price test", () => {
  const valuation: Valuation = {
    method: "owner_earnings", currency: "USD", normalized: 100, growth: 0,
    discountRate: 0.1, terminalGrowth: 0.03, bondYield: 0.04, netCash: 0,
    shares: 10, perShare: { low: 80, mid: 100, high: 120 },
    equityBondYield: 0.05, bridge: [], assumptions: [],
  };
  it.each([[70, "pass", 0.30], [75, "pass", 0.25], [90, "unclear", 0.10], [100, "unclear", 0], [120, "fail", -0.20]] as const)("classifies price %s", (price, result, mos) => {
    const actual = priceTest({ valuation, price, requiredMos: 0.25 });
    expect(actual.result).toBe(result);
    expect(actual.mos).toBeCloseTo(mos);
  });
  it("keeps missing inputs unclear", () => {
    expect(priceTest({ valuation, price: null, requiredMos: 0.25 })).toEqual({ result: "unclear", mos: null });
    expect(priceTest({ valuation: null, price: 70, requiredMos: 0.25 })).toEqual({ result: "unclear", mos: null });
  });
  it("fails a positive price against nonpositive equity value", () => {
    expect(priceTest({ valuation: { ...valuation, perShare: { low: -20, mid: -10, high: 0 } }, price: 10, requiredMos: 0.25 })).toEqual({ result: "fail", mos: null });
  });
});

it.each([0.25, 0.35, 0.5])("uses the supplied %s margin at the exact boundary", requiredMos => {
  const valuation = valueCompany({ years: makeYears(), kind: "operating", bondYield: 0.04, cyclical: false }).valuation!;
  valuation.perShare.mid = 100;
  expect(priceTest({ valuation, price: 100 * (1 - requiredMos), requiredMos }).result).toBe("pass");
  expect(priceTest({ valuation, price: 100 * (1 - requiredMos) + 0.01, requiredMos }).result).toBe("unclear");
});
it('preserves documented ADS annual units when vendor current-share units are unknown',()=>{
 const years=makeYears().map(y=>({...y,dilutedShares:40,dilutedShareBasis:'listing-ADS' as const}));
 const result=valueCompany({years,kind:'operating',bondYield:.04,cyclical:false,currentShares:10,reportedShares:true});
 expect(result.valuation?.shares).toBe(40);expect((result.valuation as any)?.shareBasis).toBe('listing-ADS');
});
