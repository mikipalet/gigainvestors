import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseManagers } from "@/lib/dataroma/parse-managers";
import { mapActivity, parseHoldings } from "@/lib/dataroma/parse-holdings";
import { parseHist } from "@/lib/dataroma/parse-hist";
import { parseActivity } from "@/lib/dataroma/parse-activity";
import { parseMoney, parseTables } from "@/lib/dataroma/parse-tables";
import { compareQ, normalizeQuarter, prevQ } from "@/lib/quarters";

const fx = (n: string) => readFileSync(`tests/fixtures/${n}.html`, "utf8");

describe("quarters", () => {
  it("normalises both orders", () => {
    expect(normalizeQuarter("Q2 2026")).toBe("2026 Q2");
    expect(normalizeQuarter("2026 Q2")).toBe("2026 Q2");
    expect(normalizeQuarter("nope")).toBeNull();
  });
  it("orders and steps", () => {
    expect(["2026 Q1", "2025 Q4", "2026 Q2"].sort(compareQ)).toEqual(["2025 Q4", "2026 Q1", "2026 Q2"]);
    expect(prevQ("2026 Q1")).toBe("2025 Q4");
  });
});

describe("parseTables", () => {
  it("captures hrefs and implicit rows", () => {
    const t = parseTables(fx("holdings-BRK"))[0];
    expect(t[1][1].href).toBe("/m/stock.php?sym=AAPL");
    const act = parseTables(fx("activity-BRK"))[0];
    expect(act.filter((r) => r.length >= 5).length).toBeGreaterThan(10);
  });
  it("parses money", () => {
    expect(parseMoney("$2.05 B")).toBe(2.05e9);
    expect(parseMoney("$192 M")).toBe(1.92e8);
  });
});

describe("page parsers", () => {
  it("managers", () => {
    const rows = parseManagers(fx("managers"));
    expect(rows.length).toBe(83);
    const brk = rows.find((r) => r.code === "BRK")!;
    expect(brk.portfolioValue).toBeGreaterThan(1e11);
    expect(brk.stockCount).toBeGreaterThan(20);
  });
  it("holdings", () => {
    const h = parseHoldings(fx("holdings-BRK"));
    expect(h.period).toBe("2026 Q2");
    expect(h.portfolioValue).toBe(299253558000);
    expect(h.positions[0]).toMatchObject({ ticker: "AAPL", pct: 22.04, shares: 227917808, reportedPrice: 289.36 });
    expect(h.positions[0].name).toBe("Apple Inc.");
  });
  it("hist", () => {
    const rows = parseHist(fx("hist-BRK-AAPL"));
    expect(rows[0]).toMatchObject({ q: "2026 Q2", shares: 227917808, pct: 22.04, price: 289.36 });
    expect(rows.find((r) => r.q === "2025 Q4")?.activity).toMatch(/^Reduce/);
  });
  it("activity", () => {
    const qs = parseActivity(fx("activity-BRK"));
    expect(qs[0].q).toBe("2026 Q2");
    expect(qs[0].items[0]).toMatchObject({ ticker: "GOOG", kind: "Add", shareChange: 23603218 });
    expect(qs.length).toBeGreaterThan(3);
  });
  it("mapActivity", () => {
    expect(mapActivity("Add 45.24%")).toBe("add");
    expect(mapActivity("Buy")).toBe("new");
    expect(mapActivity("Sell")).toBe("sold");
    expect(mapActivity("")).toBe("hold");
  });
});
