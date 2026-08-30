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
