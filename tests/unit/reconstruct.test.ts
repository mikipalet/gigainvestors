import { describe, expect, it } from "vitest";
import { buildInvestorData } from "@/lib/sync/reconstruct";

const base = {
  code: "X",
  person: "P",
  firm: "F",
  names: { A: "Alpha", B: "Beta" },
  holdings: {
    period: "2026 Q2",
    portfolioValue: 1000,
    positions: [
      { ticker: "A", name: "Alpha", pct: 60, shares: 6, reportedPrice: 100, value: 600, activity: "" },
      { ticker: "B", name: "Beta", pct: 40, shares: 4, reportedPrice: 100, value: 400, activity: "Add 10%" },
    ],
  },
};

describe("buildInvestorData", () => {
  it("reconstructs totals from partial position sets", () => {
    const d = buildInvestorData({
      ...base,
      hists: {
        A: [
          { q: "2026 Q2", shares: 6, pct: 60, activity: "", price: 100 },
          { q: "2026 Q1", shares: 6, pct: 50, activity: "", price: 50 },
        ],
        B: [{ q: "2026 Q2", shares: 4, pct: 40, activity: "Add 10%", price: 100 }],
      },
      activity: [],
    });
    expect(d.quarters.map((q) => q.q)).toEqual(["2026 Q1", "2026 Q2"]);
    expect(d.quarters[0].total).toBe(600);
    expect(d.quarters[0].positions[0].activity).toBe("new");
    expect(d.quarters[1].total).toBe(1000);
    expect(d.quarters[1].positions.find((p) => p.ticker === "B")?.activity).toBe("add");
  });

  it("adds a sold ghost with the previous value, once", () => {
    const d = buildInvestorData({
      ...base,
      hists: {
        A: [{ q: "2026 Q2", shares: 6, pct: 60, activity: "", price: 100 }],
        B: [{ q: "2026 Q2", shares: 4, pct: 40, activity: "", price: 100 }],
        C: [{ q: "2026 Q1", shares: 1, pct: 100, activity: "", price: 250 }],
      },
      activity: [{ q: "2026 Q2", items: [{ ticker: "C", name: "Gamma", kind: "Sell", shareChange: -1 }] }],
    });
    const q2 = d.quarters.find((q) => q.q === "2026 Q2")!;
    const ghost = q2.positions.find((p) => p.ticker === "C")!;
    expect(ghost).toMatchObject({ activity: "sold", value: 250, pct: 0 });
    expect(q2.total).toBe(1000);
  });

  it("tolerates missing hist", () => {
    expect(() => buildInvestorData({ ...base, hists: {}, activity: [] })).not.toThrow();
  });
});

describe("parseChange", () => {
  it("signs adds and reduces", async () => {
    const { parseChange } = await import("@/lib/sync/reconstruct");
    expect(parseChange("Add 45.24%")).toBe(45.24);
    expect(parseChange("Reduce 4.32%")).toBe(-4.32);
    expect(parseChange("Buy")).toBeNull();
    expect(parseChange("")).toBeNull();
  });
});

describe("adjustedPriceSeries", () => {
  it("rebases across a 7:1 split and keeps gaps", async () => {
    const { adjustedPriceSeries } = await import("@/lib/stock-price");
    const out = adjustedPriceSeries([
      { shares: 100, value: 65000 },
      null,
      { shares: 700, value: 65100 },
      { shares: 700, value: 70000 },
    ]);
    expect(out[0]).toBeCloseTo(93, 0);
    expect(out[1]).toBeNull();
    expect(out[2]).toBeCloseTo(93, 0);
    expect(out[3]).toBeCloseTo(100, 0);
  });
  it("leaves genuine moves alone", async () => {
    const { adjustedPriceSeries } = await import("@/lib/stock-price");
    const out = adjustedPriceSeries([
      { shares: 100, value: 10000 },
      { shares: 100, value: 5000 },
    ]);
    expect(out[0]).toBeCloseTo(100, 5);
    expect(out[1]).toBeCloseTo(50, 5);
  });
});

describe("hist-based sold ghosts", () => {
  it("creates a ghost from a Sell 100% hist row", () => {
    const d = buildInvestorData({
      ...base,
      hists: {
        A: [{ q: "2026 Q2", shares: 6, pct: 60, activity: "", price: 100 }],
        B: [{ q: "2026 Q2", shares: 4, pct: 40, activity: "", price: 100 }],
        C: [
          { q: "2017 Q1", shares: 10, pct: 100, activity: "", price: 20 },
          { q: "2017 Q2", shares: 0, pct: 0, activity: "Sell 100.00%", price: 18 },
        ],
      },
      activity: [],
    });
    const g = d.quarters.find((q) => q.q === "2017 Q2")!.positions.find((p) => p.ticker === "C")!;
    expect(g).toMatchObject({ activity: "sold", value: 200 });
  });
});
