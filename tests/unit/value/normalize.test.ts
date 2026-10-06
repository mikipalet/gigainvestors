import { afterEach, describe, expect, it, vi } from "vitest";
import ko from "../../fixtures/value/eodhd/fund-KO.US.json";
import jpm from "../../fixtures/value/eodhd/fund-JPM.US.json";
import asml from "../../fixtures/value/eodhd/fund-ASML.AS.json";
import dal from "../../fixtures/value/eodhd/fund-DAL.US.json";
import { normalizeEodhd } from "../../../lib/value/normalize-eodhd";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("EODHD annual normalization", () => {
  it("normalizes KO in absolute units with positive spending and ascending fiscal years", () => {
    const { fundamentals: f, patch } = normalizeEodhd(ko, "KO.US");
    expect(f.years).toHaveLength(30);
    expect(f.years.every((y, i) => i === 0 || y.fy > f.years[i - 1].fy)).toBe(true);
    const year = f.years.find((y) => y.fy === 2024)!;
    expect(Math.abs(year.revenue! / 47.06e9 - 1)).toBeLessThan(0.01);
    expect(year).toMatchObject({ capex: 2064000000, buybacks: 1795000000, dividendsPaid: 8359000000, dilutedShares: 4320000000, sbc: 286000000, da: 1075000000, acquisitions: 0, acquisitionsProxy: true, marketCap: null });
    expect(f.currency).toBe("USD");
    expect(f.integrity).toEqual({ ok: true, reasons: [], notes: [] });
    expect(patch).toMatchObject({ cik: "0000021344", lei: "UWJKFUJFZ02DKWI3RY53", kind: "operating", isin: "US1912161007" });
  });
  it("classifies JPM as a bank without requiring gross profit", () => {
    expect(normalizeEodhd(jpm, "JPM.US").patch.kind).toBe("bank");
    const raw = { Financials: { Income_Statement: { yearly: { "2024-12-31": { totalRevenue: "100", currency_symbol: "USD", grossProfit: null } } } } };
    expect(normalizeEodhd(raw, "BANK.US").fundamentals.years[0].grossProfit).toBeNull();
  });
  it.each([[asml, "ASML.AS", "EUR"], [dal, "DAL.US", "USD"]] as const)("preserves the reporting currency for fixture %#", (raw, id, currency) => {
    const { fundamentals } = normalizeEodhd(raw, id);
    expect(fundamentals.currency).toBe(currency);
    expect(fundamentals.years).toHaveLength(30);
    expect(fundamentals.years.at(-1)?.revenue).toBeGreaterThan(0);
  });
  it("preserves nulls, honors fallback fields, and matches shares by year instead of object key", () => {
    const raw = {
      General: { CurrencyCode: "GBP" },
      Financials: {
        Income_Statement: { yearly: { "2024-12-31": { totalRevenue: "bad", currency_symbol: "EUR", depreciationAndAmortization: null, reconciledDepreciation: "4" } } },
        Balance_Sheet: { yearly: { "2024-12-31": { cash: "0", shortTermDebt: "2", longTermDebt: "3", commonStockSharesOutstanding: "50" } } },
        Cash_Flow: { yearly: { "2024-12-31": { capitalExpenditures: "-8", dividendsPaid: "-2", salePurchaseOfStock: "10", depreciation: "5" } } },
      },
      outstandingShares: { annual: { "7": { date: "2024", shares: 100 } } },
    };
    expect(normalizeEodhd(raw, "TEST.AS").fundamentals.years[0]).toMatchObject({ revenue: null, grossProfit: null, da: 4, cash: 0, totalDebt: 5, capex: 8, dividendsPaid: 2, buybacks: 0, dilutedShares: 100, issuance: null });
    expect(normalizeEodhd(null, "NONE.US").fundamentals.integrity.ok).toBe(false);
  });
});

it("persists raw data, merges company metadata and refreshes on every rolling pass, including when forced", async () => {
  const { mkdirSync, mkdtempSync, rmSync } = await import("node:fs");
  const { homedir } = await import("node:os");
  const { join } = await import("node:path");
  const { appendJsonl, readCorpusJson, writeCorpusJson } = await import("../../../lib/value/corpus");
  const { default: stage } = await import("../../../scripts/value/stages/fundamentals");
  // Optional SEC enrichment uses core HTTP, independently of the vendor fetch mock.
  const sec = vi.spyOn(await import("../../../lib/value/reports/transport"), "reportRequest").mockImplementation(async () => Response.json({facts:{}}));
  const root = join(homedir(), "value-corpus");
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(join(root, "fundamentals-test-"));
  vi.stubEnv("VALUE_CORPUS_DIR", directory);
  vi.stubEnv("EODHD_API_KEY", "fixture-key");
  const requested: string[] = [];
  let usage = 100;
  vi.stubGlobal("fetch", async (input: string) => {
    const route = new URL(input).pathname;
    requested.push(route);
    if (route === "/api/user") return Response.json({ apiRequests: usage });
    if (route === "/api/fundamentals/KO.US") return Response.json(ko);
    throw new Error(`Unexpected fixture route ${route}`);
  });
  try {
    appendJsonl("universe.jsonl", { id: "KO.US", name: "Coca Cola", country: "US", listings: ["KO.US"] });
    appendJsonl("universe.jsonl", { id: "DAL.US" });
    writeCorpusJson("companies/KO.US.json", { edinetCode: "preserve" });
    await stage({ only: ["KO.US"] });
    expect(readCorpusJson("raw/eodhd/KO.US.json")).toEqual(ko);
    expect(readCorpusJson("companies/KO.US.json")).toMatchObject({ id: "KO.US", name: "Coca Cola", edinetCode: "preserve", kind: "operating", marketCapUsd: ko.Highlights.MarketCapitalization });
    expect(readCorpusJson("fundamentals/KO.US.json")).toMatchObject({ id: "KO.US", integrity: { ok: true } });
    requested.length = 0;
    await stage({ only: ["KO.US"], limit: 1 });
    expect(requested).toContain("/api/fundamentals/KO.US");
    await stage({ only: ["KO.US"], force: true });
    expect(requested).toContain("/api/fundamentals/KO.US");
    requested.length = 0;
    await stage({ only: ["KO.US"] });
    expect(requested).toContain("/api/fundamentals/KO.US");
    requested.length = 0;
    usage = 99991;
    await stage({ only: ["KO.US"], force: true });
    expect(requested).toEqual(["/api/user"]);
  } finally { sec.mockRestore(); rmSync(directory, { recursive: true, force: true }); }
});

it("does not reset classification when the response has no sector or industry", () => {
  expect(normalizeEodhd({ General: { Sector: null, Industry: null } }, "BANK.US").patch.kind).toBeUndefined();
});

it("maps the reported balance identity and normalizes zero share sources to null", () => {
  for (const annual of [undefined, { "0": { date: "2023", shares: "0" } }]) {
    const raw = { outstandingShares: { annual }, Financials: {
      Income_Statement: { yearly: { "2023-12-31": { currency_symbol: "EUR" } } },
      Balance_Sheet: { yearly: { "2023-12-31": { commonStockSharesOutstanding: "0", totalAssets: "11267000000", totalLiab: "5956000000", totalStockholderEquity: "3931000000", minorityInterest: "380000000", liabilitiesAndStockholdersEquity: "11267000000" } } },
    } };
    expect(normalizeEodhd(raw, "AC.PA").fundamentals.years[0]).toMatchObject({ dilutedShares: null, liabilitiesAndStockholdersEquity: 11.267e9 });
  }
});
