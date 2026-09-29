import { afterEach, describe, expect, it, vi } from "vitest";
import symbols from "../../fixtures/value/eodhd/symbols-US.json";
import { collapseListings, isCommonStock, kindFor } from "../../../lib/value/universe";
import { eodhd, screenerPage, callsUsedToday } from "../../../lib/value/eodhd";

const listings = symbols.map((r) => ({ code: r.Code, exchange: "US", isin: r.Isin, name: r.Name }));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("universe", () => {
  it("keeps common stock and drops fund, ETF, preferred and warrant fixture rows", () => {
    expect(isCommonStock(symbols.find((r) => r.Code === "KO")!)).toBe(true);
    for (const pattern of [/ETF/i, /preferred|pfd/i, /warrant/i, /fund/i]) {
      const row = symbols.find((r) => pattern.test(r.Type + " " + r.Name));
      expect(row).toBeDefined();
      expect(isCommonStock(row!)).toBe(false);
    }
    expect(isCommonStock({ Type: "Common Stock", Name: "Example Acquisition Corp" })).toBe(false);
  });
  it("collapses Alphabet and Berkshire share classes with code-order fallback", () => {
    const groups = collapseListings(listings);
    expect(groups.find((g) => g.listings.includes("GOOG.US"))).toEqual({ primary: "GOOG.US", listings: ["GOOG.US", "GOOGL.US"] });
    expect(groups.find((g) => g.listings.includes("BRK-A.US"))).toEqual({ primary: "BRK-A.US", listings: ["BRK-A.US", "BRK-B.US"] });
  });
  it("prefers the Dutch home exchange regardless of input order", () => {
    expect(collapseListings([
      { code: "ASME", exchange: "XETRA", isin: "NL0010273215", name: "ASML Holding NV" },
      { code: "ASML", exchange: "AS", isin: "NL0010273215", name: "ASML Holding NV" },
    ])).toEqual([{ primary: "ASML.AS", listings: ["ASML.AS"] }]);
  });
  it("does not merge similarly named issuers from different countries", () => {
    expect(collapseListings([
      { code: "ABC", exchange: "US", isin: null, name: "Example Inc Class A" },
      { code: "ABD", exchange: "US", isin: null, name: "Example Inc Class B" },
      { code: "ABC", exchange: "AS", isin: null, name: "Example Inc" },
    ])).toHaveLength(2);
  });
  it.each([["Banks - Regional", "bank"], ["Insurance - Property & Casualty", "insurer"], ["Beverages - Non-Alcoholic", "operating"]])("classifies %s", (industry, expected) => {
    expect(kindFor({ sector: null, industry })).toBe(expected);
  });
});

it("authenticates and encodes screener filters without exposing credentials on failure", async () => {
  vi.stubEnv("EODHD_API_KEY", "test-secret");
  const urls: URL[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    urls.push(new URL(url));
    return Response.json({ data: [] });
  });
  await screenerPage({ offset: 100, exchange: "US" });
  expect(urls[0].pathname).toBe("/api/screener");
  expect(Object.fromEntries(urls[0].searchParams)).toMatchObject({ api_token: "test-secret", fmt: "json", limit: "100", offset: "100", sort: "market_capitalization.desc" });
  expect(JSON.parse(urls[0].searchParams.get("filters")!)).toEqual([["exchange", "=", "US"]]);
  vi.stubGlobal("fetch", async () => new Response("test-secret", { status: 403 }));
  await expect(eodhd("user")).rejects.toThrow("EODHD HTTP 403");
});

it("reads daily API usage and rejects a missing usage counter", async () => {
  vi.stubEnv("EODHD_API_KEY", "test-secret");
  vi.stubGlobal("fetch", async () => Response.json({ apiRequests: 123 }));
  expect(await callsUsedToday()).toBe(123);
  vi.stubGlobal("fetch", async () => Response.json({}));
  await expect(callsUsedToday()).rejects.toThrow();
});

it("writes sorted companies, excludes OTC ordinary shares, keeps Japanese ADRs and converts caps", async () => {
  const { mkdtempSync, mkdirSync, rmSync } = await import("node:fs");
  const { homedir } = await import("node:os");
  const { join } = await import("node:path");
  const { readJsonl } = await import("../../../lib/value/corpus");
  const { default: stage } = await import("../../../scripts/value/stages/universe");
  const root = join(homedir(), "value-corpus");
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(join(root, "universe-test-"));
  vi.stubEnv("VALUE_CORPUS_DIR", directory);
  vi.stubEnv("EODHD_API_KEY", "fixture-key");
  const row = { Code: "KO", Name: "Coca Cola", Country: "USA", Exchange: "NYSE", Currency: "USD", Type: "Common Stock", Isin: "US1912161007" };
  vi.stubGlobal("fetch", async (input: string) => {
    const url = new URL(input);
    const route = url.pathname.replace("/api/", "");
    if (route === "exchanges-list") return Response.json([
      { Code: "US", CountryISO2: "US", Currency: "USD" },
      { Code: "AS", CountryISO2: "NL", Currency: "EUR" },
      { Code: "FOREX", CountryISO2: "", Currency: "" },
    ]);
    if (route === "exchange-symbol-list/US") return Response.json([
      row, { ...row, Code: "OTC", Exchange: "PINK", Isin: "US1234567890" },
      { ...row, Code: "JADR", Name: "Japanese ADR", Exchange: "PINK", Isin: "JP1234567890" },
    ]);
    if (route === "exchange-symbol-list/HK") return Response.json([{ ...row, Code: "0700", Name: "Tencent Holdings Ltd", Exchange: "HK", Currency: "HKD", Isin: "KYG875721634" }]);
    if (route === "exchange-symbol-list/AS") return Response.json([{ ...row, Code: "ASML", Name: "ASML", Exchange: "AS", Currency: "EUR", Isin: "NL0010273215" }]);
    if (route === "screener") {
      const exchange = JSON.parse(url.searchParams.get("filters")!)[0][2];
      const data = url.searchParams.get("offset") === "0" ? exchange === "HK" ? [] : exchange === "US" ? [{ code: "KO", exchange: "US", market_capitalization: 300 }] : [{ code: "ASML", exchange: "AS", market_capitalization: 200 }] : [];
      return Response.json({ data });
    }
    if (route === "eod/EURUSD.FOREX") return Response.json([{ close: 1.2 }]);
    throw new Error(`Unexpected fixture route ${route}`);
  });
  try {
    await stage({});
    expect(readJsonl("universe.jsonl")).toMatchObject([
      { id: "KO.US", marketCapUsd: 300, country: "US" },
      { id: "ASML.AS", marketCapUsd: 240, country: "NL" },
      { id: "0700.HK", marketCapUsd: null, country: "HK" },
      { id: "JADR.US", marketCapUsd: null, country: "US" },
    ]);
    vi.stubGlobal("fetch", () => { throw new Error("Cached run must stay offline"); });
    await stage({});
    expect(readJsonl("universe.jsonl")).toHaveLength(4);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

it("nulls standalone GDR caps and caps above 1.3x the largest US company before sorting", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { homedir } = await import("node:os");
  const { join } = await import("node:path");
  const { writeCorpusJson, readJsonl } = await import("../../../lib/value/corpus");
  const { default: stage } = await import("../../../scripts/value/stages/universe");
  const directory = mkdtempSync(join(homedir(), "value-corpus/universe-test-"));
  vi.stubEnv("VALUE_CORPUS_DIR", directory);
  const cache = (key: string, data: unknown) => writeCorpusJson(`raw/eodhd/universe/${key}.json`, { date: new Date().toISOString().slice(0, 10), data });
  const warnings: string[] = [];
  const warn = vi.spyOn(console, "warn").mockImplementation((message) => warnings.push(message));
  vi.stubGlobal("fetch", () => { throw new Error("Cached run must stay offline"); });
  cache("exchanges", [{ Code: "US", CountryISO2: "US" }, { Code: "LSE", CountryISO2: "GB" }]);
  for (const venue of ["US", "LSE", "HK"]) {
    const entries = venue === "US" ? [["BIG", "Largest US", 100]] : venue === "LSE" ? [["BAD", "Data Error", 131], ["EDGE", "Boundary", 130], ["GDR", "Standalone GDR", 50], ["GDS", "Independent GDS", 2000]] : [];
    cache(`symbols-${venue}`, entries.map(([code, name]) => ({ Code: code, Name: name, Exchange: venue, Type: "Common Stock", Currency: "USD", Isin: null })));
    cache(`screener-${venue}-0`, entries.map(([code, , cap]) => ({ code, exchange: venue, market_capitalization: cap })));
    cache(`screener-${venue}-100`, []);
  }
  try {
    await stage({});
    expect(readJsonl("universe.jsonl")).toMatchObject([
      { id: "EDGE.LSE", marketCapUsd: 130 }, { id: "BIG.US", marketCapUsd: 100 },
      { id: "BAD.LSE", marketCapUsd: null }, { id: "GDR.LSE", marketCapUsd: null }, { id: "GDS.LSE", marketCapUsd: null },
    ]);
    expect(warnings.some((message) => message.includes("BAD.LSE") && message.includes("131") && message.includes("130"))).toBe(true);
  } finally { warn.mockRestore(); rmSync(directory, { recursive: true, force: true }); }
});

it("passes cached class volumes and ADR metadata into collapse and admits Brazilian PN", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { homedir } = await import("node:os");
  const { join } = await import("node:path");
  const { writeCorpusJson, readJsonl } = await import("../../../lib/value/corpus");
  const { default: stage } = await import("../../../scripts/value/stages/universe");
  const directory = mkdtempSync(join(homedir(), "value-corpus/universe-test-"));
  vi.stubEnv("VALUE_CORPUS_DIR", directory);
  vi.stubGlobal("fetch", () => { throw new Error("Cached run must stay offline"); });
  const cache = (key: string, data: unknown) => writeCorpusJson(`raw/eodhd/universe/${key}.json`, { date: new Date().toISOString().slice(0, 10), data });
  cache("exchanges", ["US", "ST", "SA", "MC"].map(Code => ({ Code, CountryISO2: { US: "US", ST: "SE", SA: "BR", MC: "ES" }[Code] })));
  const symbol = (Code: string, Name: string, Isin: string, Type = "Common Stock") => ({ Code, Name, Isin, Type, Currency: "USD" });
  const data = {
    US: [symbol("EX", "Example", "US0000000001", "ADR")],
    ST: [symbol("ATCO-A", "Atlas Copco Series A", "SE0017486889"), symbol("ATCO-B", "Atlas Copco Series B", "SE0017486897")],
    SA: [symbol("ITUB3", "Itau ON", "BRITUBACNOR4"), symbol("ITUB4", "Itau PN", "BRITUBACNPR1", "Preferred Stock"), symbol("ONLY4", "Independent PN", "BR0000000001", "Preferred Stock")],
    MC: [symbol("EX", "Example SA", "ES0000000001")], HK: [],
  };
  for (const [exchange, rows] of Object.entries(data)) {
    cache(`symbols-${exchange}`, rows.map(row => ({ ...row, Exchange: exchange === "US" ? "NYSE" : exchange })));
    cache(`screener-${exchange}-0`, rows.map(row => ({ code: row.Code, exchange, market_capitalization: 100, avgvol_200d: row.Code === "ATCO-A" ? 1000 : 10 })));
    cache(`screener-${exchange}-100`, []);
  }
  try {
    await stage({});
    const companies = readJsonl<{ id: string; listings: string[] }>("universe.jsonl");
    expect(companies.map(row => row.id)).toEqual(["ATCO-A.ST", "EX.MC", "ITUB3.SA", "ONLY4.SA"]);
    expect(companies.find(row => row.id === "ITUB3.SA")?.listings).toEqual(["ITUB3.SA", "ITUB4.SA"]);
    expect(companies.find(row => row.id === "EX.MC")?.listings).toEqual(["EX.US", "EX.MC"]);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
