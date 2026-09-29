import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ko from "../../fixtures/value/eodhd/fund-KO.US.json";
import dal from "../../fixtures/value/eodhd/fund-DAL.US.json";
import { analyzeCompany } from "../../../lib/value/analyze-company";
import { bondYield, tradingRate } from "../../../lib/value/bond-yields";
import { normalizeEodhd } from "../../../lib/value/normalize-eodhd";
import { QUESTIONS } from "../../../lib/value/jev/questions";
import { appendJsonl, corpusPath, readCorpusJson, writeCorpusJson } from "../../../lib/value/corpus";
import type { Analysis, Company, JevAnswer, ReportMeta } from "../../../lib/value/types";
import analyze from "../../../scripts/value/stages/analyze";
import { calibrationSummary } from "../../../scripts/value/stages/calibrate";
import sample from "../../../scripts/value/stages/jev-sample";

function input(id = "KO.US") {
  const { fundamentals, patch } = normalizeEodhd(id === "KO.US" ? ko : dal, id);
  const company: Company = { id, name: id, code: id.split(".")[0], exchange: "US", country: "US", currency: "USD", isin: null, cik: null, lei: null, edinetCode: null, sector: null, industry: null, kind: "operating", listings: [id], marketCapUsd: null, description: "A branded beverage business.", source: "eodhd", ...patch };
  const report: ReportMeta = { id, kind: "description", url: null, filed: null, period: null, sections: [] };
  return { company, fundamentals, report, sections: { description: company.description! }, bondYield: 0.04, ask: async () => answers() };
}
function answers(): JevAnswer[] {
  return QUESTIONS.map(q => ({ q: q.id, label: q.label, kind: q.q.type, value: q.contradicts === "yes" ? 0 : 1, probability: q.contradicts === "yes" ? 0 : 1, section: "description", evidence: null, trusted: true }));
}
let directory: string;
beforeEach(() => {
  const root = join(homedir(), "value-corpus");
  mkdirSync(root, { recursive: true });
  directory = mkdtempSync(join(root, "analyze-test-"));
  vi.stubEnv("VALUE_CORPUS_DIR", directory);
  vi.stubEnv("EODHD_API_KEY", "fixture-key");
  vi.stubGlobal("fetch", () => { throw new Error("Unexpected network request"); });
});
afterEach(() => { rmSync(directory, { recursive: true, force: true }); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("scores the recorded KO fundamentals with a moat pass and positive valuation", async () => {
  const result = await analyzeCompany(input());
  expect(result.status).toBe("scored");
  expect(result.tests.moat.result).toBe("pass");
  expect(result.valuation!.perShare.mid).toBeGreaterThan(0);
  expect(result.valuation!.perShareTrading).toMatchObject({ currency: "USD", fxRate: 1, mid: result.valuation!.perShare.mid });
});
it("fails at least one quality test for the recorded DAL fundamentals", async () => {
  const result = await analyzeCompany(input("DAL.US"));
  expect(result.status).toBe("scored");
  expect(Object.values(result.tests).some(t => t.result === "fail")).toBe(true);
});
it("preserves integrity reasons without requesting Jev or valuing bad inputs", async () => {
  const args = input();
  args.fundamentals.integrity = { ok: false, reasons: ["missing fiscal year"] };
  args.ask = async () => { throw new Error("Must not ask Jev"); };
  const result = await analyzeCompany(args);
  expect(result.status).toBe("insufficient_data");
  expect(result.valuation).toBeNull();
  expect(Object.values(result.tests).every(t => t.result === "unclear" && t.reasons.includes("missing fiscal year"))).toBe(true);
});
it("restricts contradictions to their own test and uses commodity answers for cyclicality", async () => {
  const args = input();
  args.ask = async () => answers().map(a => a.q === "commodity" ? { ...a, value: 0.8, probability: 0.8 } : a);
  const result = await analyzeCompany(args);
  expect(result.tests.moat.result).toBe("pass");
  expect(result.tests.moat.jev.every(a => QUESTIONS.find(q => q.id === a.q)?.test === "moat")).toBe(true);
  expect(result.valuation!.assumptions).toContain("owner earnings normalized over 7 years");
});
it("caches bond yields per day, preserves concurrent countries, and converts FX minor units", async () => {
  vi.stubGlobal("fetch", async (url: string) => {
    const path = new URL(url).pathname;
    return Response.json([{ close: path.includes("10Y") ? 4.25 : path.includes("GBP") ? 1.25 : 0.05 }]);
  });
  expect(await Promise.all([bondYield("US"), bondYield("GB")])).toEqual([0.0425, 0.0425]);
  vi.stubGlobal("fetch", () => { throw new Error("Should be cached"); });
  expect(await bondYield("US")).toBe(0.0425);
  expect(await bondYield("GB")).toBe(0.0425);
  writeCorpusJson("raw/eodhd/universe/fx-GBP.json", { date: new Date().toISOString().slice(0, 10), data: [{ close: 1.25 }] });
  writeCorpusJson("raw/eodhd/universe/fx-ZAR.json", { date: new Date().toISOString().slice(0, 10), data: [{ close: 0.05 }] });
  expect(await tradingRate({ reporting: "USD", trading: "GBX" })).toBe(80);
  expect(await tradingRate({ reporting: "USD", trading: "ZAc" })).toBe(2000);
});
it("writes analysis and resumes, invalidating on text changes and force", async () => {
  const args = input();
  appendJsonl("universe.jsonl", args.company);
  writeCorpusJson("fundamentals/KO.US.json", args.fundamentals);
  writeCorpusJson("reports/KO.US/meta.json", { ...args.report, kind: "10-K", sections: ["business"] });
  writeFileSync(corpusPath("reports/KO.US/business.txt"), "First report text.");
  let calls = 0;
  const ask = async () => { calls++; return answers(); };
  const options = { ask, getBondYield: async () => 0.04, evidence: async () => null };
  await analyze(options);
  expect(readCorpusJson<Analysis>("analysis/KO.US.json")?.tests.moat.result).toBe("pass");
  await analyze(options);
  expect(calls).toBe(1);
  writeFileSync(corpusPath("reports/KO.US/business.txt"), "Revised report text.");
  await analyze(options);
  expect(calls).toBe(2);
  await analyze({ ...options, force: true });
  expect(calls).toBe(3);
});
it("reports calibration failures, false positives and missing data distinctly", async () => {
  const result = await analyzeCompany(input());
  const quality = structuredClone(result);
  quality.tests.moat.result = "fail";
  const falsePositive = structuredClone(result);
  for (const test of Object.values(falsePositive.tests)) test.result = "pass";
  const summary = calibrationSummary({ entries: [{ id: "KO.US", expect: "quality", why: "" }, { id: "DAL.US", expect: "not_quality", why: "" }, { id: "MISSING", expect: "quality", why: "" }], analyses: new Map([["KO.US", quality], ["DAL.US", falsePositive]]) });
  expect(summary.failed).toBe(true);
  expect(summary.counts).toMatchObject({ falseNegative: 1, falsePositive: 1, missing: 1 });
  expect(summary.rows[0].verdict).toContain("moat");
});
it("exports up to thirty distinct answers per question with source text", async () => {
  const result = await analyzeCompany(input());
  for (let i = 0; i < 35; i++) {
    const id = `TEST${i}.US`;
    appendJsonl("universe.jsonl", { ...result.company, id });
    writeCorpusJson(`analysis/${id}.json`, { ...result, id });
  }
  await sample({});
  const { readJsonl } = await import("../../../lib/value/corpus");
  const rows = readJsonl<{ id: string; text: string }>("jev-sample/brand.jsonl");
  expect(rows).toHaveLength(30);
  expect(new Set(rows.map(r => r.id)).size).toBe(30);
  expect(rows.every(r => r.text === result.company.description)).toBe(true);
});

it("runs paragraph evidence only when no numeric quality test fails", async () => {
  const { makeYears } = await import("./synthetic");
  const args = input();
  args.fundamentals.years = makeYears({ overrides: (year, i) => ({ revenue: 1000 + i * 100, operatingIncome: 200 + i * 20, preTaxIncome: 200 + i * 20, netIncome: 150 + i * 15, taxExpense: 50 + i * 5, equity: 400 + i * 30, grossProfit: 400 + i * 40, ocf: 170 + i * 15, marketCap: 1000 + i * 300 }) });
  appendJsonl("universe.jsonl", args.company);
  writeCorpusJson("fundamentals/KO.US.json", args.fundamentals);
  let evidenceCalls = 0;
  const options = { ask: args.ask, getBondYield: async () => 0.04, evidence: async () => { evidenceCalls++; return "Supporting paragraph"; } };
  await analyze(options);
  const good = readCorpusJson<Analysis>("analysis/KO.US.json")!;
  expect(Object.values(good.tests).every(t => t.numeric !== "fail")).toBe(true);
  expect(good.tests.moat.jev.find(a => a.q === "brand")?.evidence).toBe("Supporting paragraph");
  expect(evidenceCalls).toBeGreaterThan(0);
  evidenceCalls = 0;
  args.fundamentals.years = args.fundamentals.years.map(y => ({ ...y, sbc: y.ocf }));
  writeCorpusJson("fundamentals/KO.US.json", args.fundamentals);
  await analyze(options);
  expect(readCorpusJson<Analysis>("analysis/KO.US.json")!.tests.accounting.numeric).toBe("fail");
  expect(evidenceCalls).toBe(0);
});

it("samples the exact analyzed text after source reports change", async () => {
  const args = input();
  appendJsonl("universe.jsonl", args.company);
  writeCorpusJson("fundamentals/KO.US.json", args.fundamentals);
  writeCorpusJson("reports/KO.US/meta.json", { ...args.report, kind: "10-K", sections: ["business"] });
  writeFileSync(corpusPath("reports/KO.US/business.txt"), "Text used by Jev.");
  await analyze({ ask: async () => answers().map(a => ({ ...a, section: "business" })), getBondYield: async () => null, evidence: async () => null });
  writeFileSync(corpusPath("reports/KO.US/business.txt"), "A newer report, never read by Jev.");
  await sample({});
  const { readJsonl } = await import("../../../lib/value/corpus");
  expect(readJsonl<{ text: string }>("jev-sample/brand.jsonl")[0].text).toBe("Text used by Jev.");
});

it("reads the newest live-recorded bond close as a fraction and refreshes tomorrow", async () => {
  const { default: recorded } = await import("../../fixtures/value/analyze/us-bond.json");
  vi.stubGlobal("fetch", async () => Response.json(recorded));
  expect(await bondYield("US")).toBe(0.05239);
  writeCorpusJson("bonds.json", { US: { date: "2000-01-01", yield: 0.05239 } });
  vi.stubGlobal("fetch", async () => Response.json([{ close: 5 }]));
  expect(await bondYield("US")).toBe(0.05);
});

it("keeps reporting valuation with an explicit assumption when FX is unavailable", async () => {
  const args = input();
  args.company.currency = "EUR";
  vi.stubGlobal("fetch", async () => Response.json([]));
  const result = await analyzeCompany(args);
  expect(result.valuation!.currency).toBe("USD");
  expect(result.valuation!.perShare.mid).toBeGreaterThan(0);
  expect(result.valuation!.perShareTrading).toBeUndefined();
  expect(result.valuation!.assumptions).toContain("Trading currency conversion unavailable");
});
