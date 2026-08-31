import { describe, expect, it } from "vitest";
import { deadlineFor, deriveIssue, shouldSend } from "@/lib/newsletter/derive";
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
  quarters: [{ q: "2026 Q2", total: 1000, positions }],
});

describe("deriveIssue", () => {
  it("ranks moves by dollars and builds consensus", () => {
    const data = {
      A: inv("A", [
        { ticker: "NVDA", name: "Nvidia", shares: 1, pct: 10, value: 5e8, activity: "new", change: null },
        { ticker: "AAPL", name: "Apple", shares: 1, pct: 10, value: 4e8, activity: "reduce", change: -50 },
      ]),
      B: inv("B", [{ ticker: "NVDA", name: "Nvidia", shares: 1, pct: 10, value: 2e8, activity: "add", change: 25 }]),
    };
    const issue = deriveIssue("2026 Q2", index, data);
    expect(issue.filed).toBe(2);
    expect(issue.total).toBe(3);
    expect(issue.moves[0]).toMatchObject({ ticker: "NVDA", code: "A", dollars: 5e8 });
    expect(issue.bought[0]).toMatchObject({ ticker: "NVDA", count: 2 });
    expect(issue.sold[0]).toMatchObject({ ticker: "AAPL", count: 1 });
    expect(issue.entrants[0].ticker).toBe("NVDA");
    expect(issue.headline).toContain("Ann opened NVDA");
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
