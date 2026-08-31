import { describe, expect, it } from "vitest";
import { buildIssue, canonical, deadlineFor, shouldSend } from "@/lib/newsletter/issue";
import { signToken, verifyToken } from "@/lib/newsletter/token";
import type { Index, InvestorData } from "@/lib/types";

const index: Index = {
  generatedAt: "2026-08-31",
  quarters: ["2026 Q1", "2026 Q2"],
  investors: [
    { code: "A", slug: "a", person: "Ann", firm: "A Co", sketch: true, series: [] },
    { code: "B", slug: "b", person: "Bob", firm: "B Co", sketch: true, series: [] },
    { code: "C", slug: "c", person: "Cy", firm: "C Co", sketch: true, series: [] },
  ],
};
const inv = (code: string, positions: InvestorData["quarters"][number]["positions"]): InvestorData => ({
  code,
  person: code,
  firm: code,
  quarters: [{ q: "2026 Q2", total: 1e9, positions }],
});

describe("buildIssue", () => {
  it("ranks bets by impact and builds directional consensus", () => {
    const prev = (code: string, positions: InvestorData["quarters"][number]["positions"]) => ({ q: "2026 Q1", total: 1e9, positions });
    const data: Record<string, InvestorData> = {
      A: { ...inv("A", [
        { ticker: "NVDA", name: "Nvidia", shares: 10, pct: 50, value: 500e6, activity: "new", change: null },
        { ticker: "AAPL", name: "Apple", shares: 5, pct: 40, value: 400e6, activity: "reduce", change: -50 },
      ]), quarters: [prev("A", [{ ticker: "AAPL", name: "Apple", shares: 10, pct: 80, value: 800e6, activity: "hold", change: null }]), inv("A", [
        { ticker: "NVDA", name: "Nvidia", shares: 10, pct: 50, value: 500e6, activity: "new", change: null },
        { ticker: "AAPL", name: "Apple", shares: 5, pct: 40, value: 400e6, activity: "reduce", change: -50 },
      ]).quarters[0]] },
      B: inv("B", [{ ticker: "NVDA", name: "Nvidia", shares: 4, pct: 20, value: 200e6, activity: "add", change: 25 }]),
    };
    const issue = buildIssue("2026 Q2", index, data, {});
    expect(issue.filed).toBe(2);
    expect(issue.lead?.ticker).toBe("NVDA");
    expect(issue.bets[0]).toMatchObject({ code: "A", ticker: "NVDA" });
    expect(issue.rollCall.find((r) => r.code === "A")?.sentences.join(" ")).toContain("Opened 1 position");
    expect(canonical("GOOG")).toBe("GOOGL");
    expect(canonical("CTRA-OLD")).toBe("CTRA");
  });
});

describe("send timing", () => {
  it("knows the 45-day deadline", () => {
    expect(deadlineFor("2026 Q2").toISOString().slice(0, 10)).toBe("2026-08-14");
    expect(deadlineFor("2026 Q4").toISOString().slice(0, 10)).toBe("2027-02-14");
  });
  it("sends at 80% filed, or after grace with a majority", () => {
    expect(shouldSend("2026 Q2", 70, 83, new Date("2026-08-01"))).toBe(true);
    expect(shouldSend("2026 Q2", 50, 83, new Date("2026-08-10"))).toBe(false);
    expect(shouldSend("2026 Q2", 50, 83, new Date("2026-08-20"))).toBe(true);
    expect(shouldSend("2026 Q2", 20, 83, new Date("2026-08-20"))).toBe(false);
  });
});

describe("token", () => {
  it("round-trips and expires", () => {
    const t = signToken("a@b.com", "secret", 1000);
    expect(verifyToken(t, "secret", 500, 1400)).toBe("a@b.com");
    expect(verifyToken(t, "wrong", 500, 1400)).toBeNull();
    expect(verifyToken(t, "secret", 500, 2000)).toBeNull();
  });
});
