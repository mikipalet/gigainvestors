import { mkdtempSync, readdirSync, rmSync, statSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { corpusPath, readCorpusJson, writeCorpusJson, appendJsonl } from "../../../lib/value/corpus";
import type { Fundamentals } from "../../../lib/value/types";
import ko from "../../fixtures/value/eodhd/fund-KO.US.json";

const directories: string[] = [];
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); directories.forEach(dir => rmSync(dir, { recursive: true, force: true })); });

it("rebuilds every raw ID offline, preserves fetchedAt, skips fresh files and leaves no temporary files", async () => {
  const dir = mkdtempSync(join(tmpdir(), "renormalize-")); directories.push(dir);
  vi.stubEnv("VALUE_CORPUS_DIR", dir);
  const fetch = vi.fn(() => { throw new Error("API forbidden"); }); vi.stubGlobal("fetch", fetch);
  const old = new Date(Date.now() - 60_000);
  for (const id of ["KO.US", "ORPHAN.US", "FRESH.US"]) {
    writeCorpusJson(`raw/eodhd/${id}.json`, ko);
    if (id !== "FRESH.US") utimesSync(corpusPath(`raw/eodhd/${id}.json`), old, old);
  }
  writeCorpusJson("fundamentals/KO.US.json", { fetchedAt: "2020-01-01T00:00:00Z", years: [] });
  writeCorpusJson("fundamentals/FRESH.US.json", { sentinel: true });
  const rawTime = statSync(corpusPath("raw/eodhd/ORPHAN.US.json")).mtime.toISOString();
  const { default: stage } = await import("../../../scripts/value/stages/renormalize");
  await stage({});
  expect(readCorpusJson<Fundamentals>("fundamentals/KO.US.json")).toMatchObject({ fetchedAt: "2020-01-01T00:00:00Z", integrity: { ok: true, notes: [] } });
  expect(readCorpusJson<Fundamentals>("fundamentals/KO.US.json")?.years).toHaveLength(30);
  expect(readCorpusJson<Fundamentals>("fundamentals/ORPHAN.US.json")?.fetchedAt).toBe(rawTime);
  expect(readCorpusJson("fundamentals/FRESH.US.json")).toEqual({ sentinel: true });
  expect(readdirSync(corpusPath("fundamentals")).sort()).toEqual(["FRESH.US.json", "KO.US.json", "ORPHAN.US.json"]);
  expect(fetch).not.toHaveBeenCalled();
});

it("skips a raw file replaced during normalization", async () => {
  const dir = mkdtempSync(join(tmpdir(), "renormalize-race-")); directories.push(dir);
  vi.stubEnv("VALUE_CORPUS_DIR", dir);
  writeCorpusJson("raw/eodhd/KO.US.json", ko);
  const old = new Date(Date.now() - 60_000);
  utimesSync(corpusPath("raw/eodhd/KO.US.json"), old, old);
  writeCorpusJson("fundamentals/KO.US.json", { sentinel: true });
  const normalizer = await import("../../../lib/value/normalize-eodhd");
  const normalize = normalizer.normalizeEodhd;
  vi.spyOn(normalizer, "normalizeEodhd").mockImplementation((raw, id) => {
    const result = normalize(raw, id);
    writeCorpusJson("raw/eodhd/KO.US.json", ko);
    return result;
  });
  const { default: stage } = await import("../../../scripts/value/stages/renormalize");
  await stage({});
  expect(readCorpusJson("fundamentals/KO.US.json")).toEqual({ sentinel: true });
});

it("rebuilds EDINET from raw with cached prices, restoring prior false adjustments offline", async () => {
  const dir = mkdtempSync(join(tmpdir(), "renormalize-edinet-")); directories.push(dir);
  vi.stubEnv("VALUE_CORPUS_DIR", dir);
  vi.stubGlobal("fetch", () => { throw new Error("API forbidden"); });
  const { fundamentals: base } = (await import("../../../lib/value/normalize-eodhd")).normalizeEodhd(ko, "TEST.JP");
  const years = base.years.slice(-7).map((y, i) => ({ ...y, fy: 2018 + i, end: `${2018 + i}-03-31`,
    dilutedShares: i < 3 ? 100 : 500, netIncome: 200, equity: 1000 }));
  for (const id of ["YES.JP", "NO.JP", "EOD.JP", "MISSING.JP"]) {
    appendJsonl("universe.jsonl", { id, source: id === "EOD.JP" ? "eodhd" : "edinet" });
    if (id !== "MISSING.JP") writeCorpusJson(`raw/edinet/issuers/${id}.json`, { years });
    writeCorpusJson(`fundamentals/${id}.json`, { ...base, id, years: years.map(y => ({ ...y, dilutedShares: 500 })),
      integrity: { ok: true, reasons: [], notes: ["split 5:1 in 2021 adjusted"] } });
  }
  writeCorpusJson("prices-history/YES.JP.json", { prices: [["2020-12", 100], ["2021-01", 20]] });
  const untouched = readCorpusJson("fundamentals/EOD.JP.json");
  const { default: stage } = await import("../../../scripts/value/stages/renormalize-edinet");
  await stage({});
  const yes = readCorpusJson<Fundamentals>("fundamentals/YES.JP.json")!;
  expect(yes.years).toHaveLength(7);
  expect(yes.years[0].dilutedShares).toBe(500);
  expect(yes.integrity.notes).toEqual(["split 5:1 in 2021 adjusted"]);
  expect(yes.fetchedAt).toBe(base.fetchedAt);
  const no = readCorpusJson<Fundamentals>("fundamentals/NO.JP.json")!;
  expect(no.years.map(y => y.fy)).toEqual([2021, 2022, 2023, 2024]);
  expect(no.integrity.notes).toEqual(["share count jumped 5x in 2021; history retained from 2021"]);
  expect(readCorpusJson("fundamentals/EOD.JP.json")).toEqual(untouched);
  await stage({});
  expect(readCorpusJson("fundamentals/YES.JP.json")).toEqual(yes);
  expect(readCorpusJson("fundamentals/NO.JP.json")).toEqual(no);
});
