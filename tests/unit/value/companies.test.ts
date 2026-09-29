import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadCompanies } from "@/lib/value/companies";
import { appendJsonl, corpusPath, readCorpusJson, writeCorpusJson } from "@/lib/value/corpus";
import type { Company } from "@/lib/value/types";
import reports from "@/scripts/value/stages/reports";

let directory: string;
const company = (id: string): Company => ({
  id, name: id, code: id.split(".")[0], exchange: "TW", country: "TW", currency: "TWD",
  isin: null, cik: null, lei: null, edinetCode: null, sector: null, industry: null,
  kind: "operating", listings: [id], marketCapUsd: null, description: null, source: "eodhd",
});

beforeEach(() => {
  directory = mkdtempSync(path.join(os.tmpdir(), "value-companies-"));
  vi.stubEnv("VALUE_CORPUS_DIR", directory);
  vi.stubGlobal("fetch", () => { throw new Error("Unexpected network request"); });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  rmSync(directory, { recursive: true, force: true });
});

it("overlays enriched fields without replacing non-null universe values with null", () => {
  appendJsonl("universe.jsonl", { ...company("2330.TW"), name: "TSMC", isin: "TW0002330008", marketCapUsd: 100 });
  writeCorpusJson("companies/2330.TW.json", {
    name: null, isin: null, cik: "123", lei: "lei", description: "Makes chips",
    sector: "Technology", industry: "Semiconductors", kind: "bank", marketCapUsd: 0,
  });
  expect(loadCompanies({})).toEqual([{
    ...company("2330.TW"), name: "TSMC", isin: "TW0002330008", cik: "123", lei: "lei",
    description: "Makes chips", sector: "Technology", industry: "Semiconductors", kind: "bank", marketCapUsd: 0,
  }]);
});

it("keeps universe order, includes unenriched rows, and filters before limiting", () => {
  for (const id of ["B.TW", "A.TW", "C.TW"]) appendJsonl("universe.jsonl", company(id));
  writeCorpusJson("companies/ORPHAN.TW.json", company("ORPHAN.TW"));
  expect(loadCompanies({})).toEqual([company("B.TW"), company("A.TW"), company("C.TW")]);
  expect(loadCompanies({ only: ["C.TW", "A.TW"], limit: 1 })).toEqual([company("A.TW")]);
  expect(loadCompanies({ limit: 0 })).toEqual([]);
  expect(loadCompanies({ only: [] })).toEqual([]);
});

it("returns no companies when the universe is missing", () => {
  expect(loadCompanies({})).toEqual([]);
});

it("writes enriched descriptions to business.txt for description-only reports", async () => {
  appendJsonl("universe.jsonl", company("2330.TW"));
  writeCorpusJson("companies/2330.TW.json", { description: "Makes chips for customers worldwide." });
  await reports({ only: ["2330.TW"], force: true });
  expect(readCorpusJson("reports/2330.TW/meta.json")).toMatchObject({ kind: "description", sections: ["business"] });
  expect(readFileSync(corpusPath("reports/2330.TW/business.txt"), "utf8")).toBe("Makes chips for customers worldwide.");
});
