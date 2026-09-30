import { mkdtempSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readCorpusJson, writeCorpusJson } from "../../../lib/value/corpus";
import { enrichMissingCaps } from "../../../lib/value/download-order";
import { orderFundamentals } from "../../../scripts/value/stages/fundamentals";
import type { Company } from "../../../lib/value/types";
let dir: string;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-30T09:00:00Z"));
  dir = mkdtempSync(join(homedir(), "value-cap-test-"));
  vi.stubEnv("VALUE_CORPUS_DIR", dir);
  vi.stubGlobal("fetch", () => {
    throw new Error("No network in tests");
  });
});
afterEach(() => {
  vi.useRealTimers();
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const c = (code: string, cap: number | null): Company => ({
  id: `${code}.US`,
  code,
  exchange: "US",
  country: "US",
  currency: "USD",
  name: code,
  source: "eodhd",
  listings: [`${code}.US`],
  marketCapUsd: cap,
  lei: null,
  cik: null,
  isin: null,
  edinetCode: null,
  sector: null,
  industry: null,
  kind: "operating",
  description: null,
});
it("enriches all missing caps before limiting and persists the recovered priority across runs", async () => {
  const rows = [c("SMALL", 10), c("LARGE", null), c("UNKNOWN", null)];
  writeCorpusJson("raw/eodhd/universe/symbols-US.json", {
    data: [{ Code: "LARGE", Exchange: "NASDAQ", SharesOutstanding: 100 }],
  });
  const fetchCap = vi.fn(async (company: Company, shares: number | null) => ({
    price: 20,
    shares,
    currency: "USD",
    source: "fixture",
  }));
  const enriched = await enrichMissingCaps(rows, {
    fetchCap,
    usdRate: async () => 1,
  });
  expect(fetchCap).toHaveBeenCalledTimes(2);
  expect(
    orderFundamentals(enriched, new Map())
      .slice(0, 1)
      .map((c) => c.id),
  ).toEqual(["LARGE.US"]);
  expect(readCorpusJson("companies/LARGE.US.json")).toMatchObject({
    marketCapUsd: 2000,
    listingExchange: "NASDAQ",
  });
  await enrichMissingCaps([c("LARGE", null), c("UNKNOWN", null)], {
    fetchCap,
    usdRate: async () => 1,
  });
  expect(fetchCap).toHaveBeenCalledTimes(2);
});
it("uses cached fundamentals cap without a quote and preserves a known cap", async () => {
  writeCorpusJson("raw/eodhd/LARGE.US.json", {
    General: { CurrencyCode: "EUR" },
    Highlights: { MarketCapitalization: 1000 },
  });
  const fetchCap = vi.fn();
  const rows = await enrichMissingCaps([c("LARGE", null), c("SMALL", 10)], {
    fetchCap,
    usdRate: async () => 1.2,
  });
  expect(rows.map((c) => c.marketCapUsd)).toEqual([1200, 10]);
  expect(fetchCap).not.toHaveBeenCalled();
});
it("falls back to a cached bulk close times known shares on Yahoo failure", async () => {
  writeCorpusJson("raw/eodhd/LARGE.US.json", {
    SharesStats: { SharesOutstanding: 100 },
  });
  writeCorpusJson("raw/prices/eodhd-US.json", {
    data: [{ code: "LARGE", close: 20 }],
  });
  const rows = await enrichMissingCaps([c("LARGE", null)], {
    fetchCap: async () => {
      throw new Error("401");
    },
    usdRate: async () => 1,
  });
  expect(rows[0].marketCapUsd).toBe(2000);
});
it("uses a reported Yahoo market cap for ADRs instead of multiplying the ADS price by underlying shares", async () => {
  const { readFileSync } = await import("node:fs");
  const { freeCapData } = await import("../../../lib/value/download-order");
  vi.stubGlobal("fetch", async (url: string) =>
    Response.json(
      url.includes("/chart/")
        ? {
            chart: {
              result: [{ meta: { regularMarketPrice: 25, currency: "USD" } }],
            },
          }
        : JSON.parse(
            readFileSync(
              "tests/fixtures/value/italy/yahoo-zlab-cap.json",
              "utf8",
            ),
          ),
    ),
  );
  const data = await freeCapData(c("ZLAB", null), null);
  expect(data.marketCap).toBeLessThan(4e9);
  expect(data.source).toContain("reported market cap");
});
it("leaves an unverified ADR share basis unknown when a reported cap is absent", async () => {
  const { readFileSync } = await import("node:fs");
  const { freeCapData } = await import("../../../lib/value/download-order");
  const series = JSON.parse(
    readFileSync("tests/fixtures/value/italy/yahoo-zlab-cap.json", "utf8"),
  );
  series.timeseries.result = series.timeseries.result.filter(
    (r: any) => !r.trailingMarketCap,
  );
  vi.stubGlobal("fetch", async (url: string) =>
    Response.json(
      url.includes("/chart/")
        ? {
            chart: {
              result: [{ meta: { regularMarketPrice: 25, currency: "USD" } }],
            },
          }
        : series,
    ),
  );
  expect((await freeCapData(c("ZLAB", null), null)).shares).toBeNull();
});
it("keeps access and capitalization ahead of refresh age", () => {
  const western = c("WEST", 100),
    foreign = {
      ...c("FOREIGN", 1000),
      id: "FOREIGN.SHG",
      exchange: "SHG",
      listings: ["FOREIGN.SHG"],
    };
  expect(
    orderFundamentals(
      [foreign, c("SMALL", 10), western],
      new Map([["WEST.US", "2026-09-30"]]),
    ).map((c) => c.id),
  ).toEqual(["WEST.US", "SMALL.US", "FOREIGN.SHG"]);
});
it("restores a cached recovered cap to company overlays after another stage rewrites the company", async () => {
  writeCorpusJson("companies/LARGE.US.json", c("LARGE", null));
  writeCorpusJson("raw/market-caps/LARGE.US.json", {
    at: new Date().toISOString(),
    cap: 2000,
    version: 2,
    source: "Yahoo reported market cap",
  });
  const fetchCap = vi.fn();
  await enrichMissingCaps([c("LARGE", null)], {
    fetchCap,
    usdRate: async () => 1,
  });
  expect(readCorpusJson("companies/LARGE.US.json")).toMatchObject({
    marketCapUsd: 2000,
  });
  expect(fetchCap).not.toHaveBeenCalled();
});
