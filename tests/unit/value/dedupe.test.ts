import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { appendJsonl, corpusPath, readJsonl, writeCorpusJson } from "../../../lib/value/corpus";
import stage from "../../../scripts/value/stages/dedupe";
import type { Company } from "../../../lib/value/types";

let directory: string;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "dedupe-test-"));
  vi.stubEnv("VALUE_CORPUS_DIR", directory);
  vi.stubGlobal("fetch", () => { throw new Error("dedupe must stay offline"); });
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => { rmSync(directory, { recursive: true, force: true }); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const company = (id: string, name: string, isin: string): Company => ({
  id, code: id.split(".")[0], exchange: id.split(".")[1], country: isin.slice(0, 2), name, isin,
  currency: "USD", listings: [id], marketCapUsd: 100, cik: null, lei: null, edinetCode: null,
  sector: null, industry: null, kind: "operating", description: null, source: "eodhd",
});
function pair() {
  appendJsonl("universe.jsonl", company("EX.US", "Example Inc", "US0000000001"));
  appendJsonl("universe.jsonl", company("EX.MC", "Example SA", "ES0000000001"));
}
function financials(id: string, options: { currency?: string; years?: Array<{ fy: number; revenue: number | null }> } = {}) {
  writeCorpusJson(`fundamentals/${id}.json`, { id, currency: options.currency ?? "EUR", years: options.years ?? [{ fy: 2025, revenue: 100 }] });
}
it("merges unlabelled US stocks only after matching latest-common-year revenue and reporting currency", async () => {
  pair();
  financials("EX.US", { years: [{ fy: 2026, revenue: 300 }, { fy: 2025, revenue: 102 }, { fy: 2024, revenue: 1 }] });
  financials("EX.MC", { years: [{ fy: 2024, revenue: 90 }, { fy: 2025, revenue: 100 }] });
  await stage();
  expect(readJsonl<Company>("universe.jsonl")).toEqual([{ ...company("EX.MC", "Example SA", "ES0000000001"), listings: ["EX.MC", "EX.US"] }]);
  expect(readJsonl("dedupe.jsonl")).toEqual([expect.objectContaining({ from: "EX.US", to: "EX.MC", reason: "fundamentals", fiscalYear: 2025, currency: "EUR", revenue: { from: 102, to: 100 } })]);
  const universe = readFileSync(corpusPath("universe.jsonl"), "utf8");
  const audit = readFileSync(corpusPath("dedupe.jsonl"), "utf8");
  await stage();
  expect(readFileSync(corpusPath("universe.jsonl"), "utf8")).toBe(universe);
  expect(readFileSync(corpusPath("dedupe.jsonl"), "utf8")).toBe(audit);
});
it.each(["currency", "revenue", "latest mismatch", "latest missing", "zero", "missing", "no common year"])("keeps namesakes separate with %s", async reason => {
  pair(); financials("EX.US"); financials("EX.MC");
  if (reason === "currency") financials("EX.US", { currency: "USD" });
  if (reason === "revenue") financials("EX.US", { years: [{ fy: 2025, revenue: 102.01 }] });
  if (reason === "latest mismatch") {
    financials("EX.US", { years: [{ fy: 2025, revenue: 150 }, { fy: 2024, revenue: 100 }] });
    financials("EX.MC", { years: [{ fy: 2025, revenue: 100 }, { fy: 2024, revenue: 100 }] });
  }
  if (reason === "latest missing") {
    financials("EX.US", { years: [{ fy: 2025, revenue: null }, { fy: 2024, revenue: 100 }] });
    financials("EX.MC", { years: [{ fy: 2025, revenue: 100 }, { fy: 2024, revenue: 100 }] });
  }
  if (reason === "zero") { financials("EX.US", { years: [{ fy: 2025, revenue: 0 }] }); financials("EX.MC", { years: [{ fy: 2025, revenue: 0 }] }); }
  if (reason === "missing") rmSync(corpusPath("fundamentals/EX.US.json"));
  if (reason === "no common year") financials("EX.US", { years: [{ fy: 2024, revenue: 100 }] });
  await stage();
  expect(readJsonl("universe.jsonl")).toHaveLength(2);
  expect(readJsonl("dedupe.jsonl")).toEqual([]);
});
it("does not merge equal financials with different names or two ordinary foreign homes", async () => {
  appendJsonl("universe.jsonl", company("ONE.US", "One", "US0000000001"));
  appendJsonl("universe.jsonl", company("TWO.MC", "Two", "ES0000000001"));
  appendJsonl("universe.jsonl", company("TWO.PA", "Two", "FR0000000001"));
  for (const id of ["ONE.US", "TWO.MC", "TWO.PA"]) financials(id);
  await stage(); expect(readJsonl("universe.jsonl")).toHaveLength(3);
});
it("keeps ambiguous matching foreign homes separate", async () => {
  pair(); appendJsonl("universe.jsonl", company("EX.PA", "Example", "FR0000000001"));
  for (const id of ["EX.US", "EX.MC", "EX.PA"]) financials(id);
  await stage(); expect(readJsonl("universe.jsonl")).toHaveLength(3);
});
it("resolves the recorded ITUB alias using fundamentals, retaining Brazilian ON primary", async () => {
  appendJsonl("universe.jsonl", company("ITUB.US", "Itau Unibanco Banco Holding SA", "US4655621062"));
  appendJsonl("universe.jsonl", company("ITUB3.SA", "Itaú Unibanco Holding S.A.", "BRITUBACNOR4"));
  for (const id of ["ITUB.US", "ITUB3.SA"]) financials(id, { currency: "BRL", years: [{ fy: 2025, revenue: 384581000000 }] });
  await stage(); expect(readJsonl<Company>("universe.jsonl").map(row => row.id)).toEqual(["ITUB3.SA"]);
});
it("never uses a foreign secondary venue as the target", async () => {
  appendJsonl("universe.jsonl", company("EX.US", "Example", "US0000000001"));
  appendJsonl("universe.jsonl", company("EX.BUD", "Example", "DE0000000001"));
  for (const id of ["EX.US", "EX.BUD"]) financials(id);
  await stage(); expect(readJsonl("universe.jsonl")).toHaveLength(2);
});
it("recognizes a genuine Swiss home despite the venue's secondary-listing policy", async () => {
  appendJsonl("universe.jsonl", company("EX.US", "Example", "US0000000001"));
  appendJsonl("universe.jsonl", company("EX.SW", "Example", "CH0000000001"));
  for (const id of ["EX.US", "EX.SW"]) financials(id);
  await stage(); expect(readJsonl<Company>("universe.jsonl").map(row => row.id)).toEqual(["EX.SW"]);
});
it('prunes only dedupe backups older than seven days and keeps the current backup', async () => {
  pair();
  const { readdirSync } = await import('node:fs');
  const now = new Date('2026-09-29T12:00:00Z');
  vi.useFakeTimers(); vi.setSystemTime(now);
  try {
    for (const name of ['universe-2026-09-22T11-59-59.000Z.json', 'universe-2026-09-22T12-00-00.000Z.json', 'universe-2026-09-28T12-00-00.000Z.json', 'keep.json']) writeCorpusJson(`dedupe/${name}`, []);
    await stage();
    expect(readdirSync(corpusPath('dedupe')).sort()).toEqual(['keep.json', 'universe-2026-09-22T12-00-00.000Z.json', 'universe-2026-09-28T12-00-00.000Z.json', 'universe-2026-09-29T12-00-00.000Z.json']);
  } finally { vi.useRealTimers(); }
});
