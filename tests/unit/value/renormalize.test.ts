import { mkdtempSync, readdirSync, rmSync, statSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { corpusPath, readCorpusJson, writeCorpusJson } from "../../../lib/value/corpus";
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
