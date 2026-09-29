import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { appendJsonl, readCorpusJson, writeCorpusJson } from "../../../lib/value/corpus";
import { callsUsedToday, eodhd, getFundamentals } from "../../../lib/value/eodhd";
import stage, { orderFundamentals } from "../../../scripts/value/stages/fundamentals";
import type { Company } from "../../../lib/value/types";

vi.mock("../../../lib/value/eodhd", () => ({ callsUsedToday: vi.fn(), getFundamentals: vi.fn(), eodhd: vi.fn() }));
let directory: string;
beforeEach(() => {
  const root = join(homedir(), "value-corpus");
  mkdirSync(root, { recursive: true });
  directory = mkdtempSync(join(root, "fundamentals-fixes-test-"));
  vi.stubEnv("VALUE_CORPUS_DIR", directory);
  vi.mocked(callsUsedToday).mockResolvedValue(100);
  vi.mocked(getFundamentals).mockResolvedValue({});
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => { rmSync(directory, { recursive: true, force: true }); vi.resetAllMocks(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });

it("orders never-fetched companies in universe order, then oldest fetchedAt, stably", () => {
  const companies = ["NEW-LARGE", "RECENT", "OLD", "NEW-SMALL", "OLD-TIE"].map((id) => ({ id }) as Company);
  const fetched = new Map([["RECENT", "2026-09-28T00:00:00Z"], ["OLD", "2026-09-01T00:00:00Z"], ["OLD-TIE", "2026-09-01T00:00:00Z"]]);
  expect(orderFundamentals(companies, fetched).map((c) => c.id)).toEqual(["NEW-LARGE", "NEW-SMALL", "OLD", "OLD-TIE", "RECENT"]);
  expect(companies[1].id).toBe("RECENT");
});

it("preserves known metadata and bank kind when patches are null or undefined", async () => {
  appendJsonl("universe.jsonl", { id: "BANK.US", kind: "operating", isin: "universe-isin", currency: "USD" });
  const known = { isin: "known-isin", cik: "known-cik", lei: "known-lei", description: "known description", kind: "bank", marketCapUsd: 50 };
  writeCorpusJson("companies/BANK.US.json", known);
  vi.mocked(getFundamentals).mockResolvedValue({ General: { ISIN: null, CIK: null, LEI: undefined, Description: null, Sector: null } });
  await stage({});
  expect(readCorpusJson("companies/BANK.US.json")).toMatchObject(known);
});

it("refreshes cap in USD without using PrimaryTicker or changing listing identity", async () => {
  appendJsonl("universe.jsonl", { id: "TEST.AS", currency: "EUR", listings: ["TEST.AS"], marketCapUsd: 1 });
  vi.mocked(getFundamentals).mockResolvedValue({ General: { CurrencyCode: "EUR", PrimaryTicker: "OTHER.US" }, Highlights: { MarketCapitalization: 100 } });
  vi.mocked(eodhd).mockResolvedValue([{ close: 1.2 }]);
  await stage({});
  expect(readCorpusJson("companies/TEST.AS.json")).toMatchObject({ id: "TEST.AS", listings: ["TEST.AS"], marketCapUsd: 120 });
  expect(eodhd).toHaveBeenCalledWith("eod/EURUSD.FOREX", { order: "d", limit: "1" });
});

it("applies limit after rolling ordering and refetches recent companies", async () => {
  for (const id of ["RECENT.US", "OLD.US", "NEW.US"]) appendJsonl("universe.jsonl", { id });
  writeCorpusJson("fundamentals/RECENT.US.json", { fetchedAt: "2026-09-29T00:00:00Z" });
  writeCorpusJson("fundamentals/OLD.US.json", { fetchedAt: "2026-09-01T00:00:00Z" });
  await stage({ limit: 2 });
  expect(vi.mocked(getFundamentals).mock.calls.map(([id]) => id)).toEqual(["NEW.US", "OLD.US"]);
  await stage({ only: ["RECENT.US"], force: true });
  expect(getFundamentals).toHaveBeenLastCalledWith("RECENT.US");
});

it("counts ten calls locally and stops at the daily budget", async () => {
  for (const id of ["A.US", "B.US", "C.US"]) appendJsonl("universe.jsonl", { id });
  vi.mocked(callsUsedToday).mockResolvedValue(99_990);
  await stage({});
  expect(getFundamentals).toHaveBeenCalledTimes(1);
  expect(callsUsedToday).toHaveBeenCalledTimes(1);
  expect(console.log).toHaveBeenCalledWith("daily EODHD budget reached, resume tomorrow");
});

it("resyncs usage after 200 companies and obeys the updated budget", async () => {
  for (let i = 0; i < 201; i++) appendJsonl("universe.jsonl", { id: `TEST${i}.US` });
  vi.mocked(callsUsedToday).mockResolvedValueOnce(100).mockResolvedValueOnce(100_000);
  await stage({});
  expect(getFundamentals).toHaveBeenCalledTimes(200);
  expect(callsUsedToday).toHaveBeenCalledTimes(2);
});
