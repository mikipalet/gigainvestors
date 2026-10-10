import trust from "@/lib/value/jev-trust.json";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ko from "../../fixtures/value/eodhd/fund-KO.US.json";
import dal from "../../fixtures/value/eodhd/fund-DAL.US.json";
import { analyzeCompany, PIPELINE_VERSION } from "../../../lib/value/analyze-company";
import { bondYield, tradingRate } from "../../../lib/value/bond-yields";
import { normalizeEodhd } from "../../../lib/value/normalize-eodhd";
import { askJev } from "../../../lib/value/jev/client";
import { askCompany } from "../../../lib/value/jev/run";
import { QUESTIONS } from "../../../lib/value/jev/questions";
import { appendJsonl, corpusPath, readCorpusJson, writeCorpusJson } from "../../../lib/value/corpus";
import type { Analysis, Company, JevAnswer, ReportMeta } from "../../../lib/value/types";
import analyze, { eventLoopSlicer } from "../../../scripts/value/stages/analyze";
import calibrate, { calibrationSummary } from "../../../scripts/value/stages/calibrate";
import sample from "../../../scripts/value/stages/jev-sample";

vi.mock("../../../lib/value/jev/client", () => ({ askJev: vi.fn() }));

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
  const root = (process.env.VALUE_TEST_TEMP_ROOT ?? join(tmpdir(), "value-corpus-tests"));
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
  expect(result.valuation!.assumptions.join(' ')).toContain('five-year median owner-earnings margin');
});
it("caches bond yields per day, preserves concurrent countries, and converts FX minor units", async () => {
  vi.stubGlobal("fetch", async (url: string) => {
    const path = new URL(url).pathname;
    return Response.json([{ date: new Date().toISOString().slice(0,10), close: path.includes("10Y") ? 4.25 : path.includes("GBP") ? 1.25 : 0.05 }]);
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
it('persists the final split-adjusted statement basis for indexed-company memos', async () => {
  const args = input();
  args.company.indexes = ['S&P 500'];
  appendJsonl('universe.jsonl', args.company);
  writeCorpusJson('fundamentals/KO.US.json', args.fundamentals);
  await analyze({ask: args.ask, getBondYield: async () => .04, evidence: async () => null});
  const saved = readCorpusJson<{memoYears: import('../../../lib/value/types').Year[]}>('analysis/inputs/KO.US.json');
  expect(saved?.memoYears?.length).toBe(args.fundamentals.years.length);
  const result = readCorpusJson<Analysis>('analysis/KO.US.json')!;
  expect(result.ownerMemo?.lines.find(l => l.question === 4)).toBeDefined();
  expect(saved!.memoYears.map(y => [y.fy,y.dilutedShares]).slice(-10)).toEqual(result.tests.management.series.shares.slice(-10));
});
it('rebuilds an obsolete analysis even when a copied fingerprint matches current inputs',async()=>{
  const args=input();appendJsonl('universe.jsonl',args.company);
  writeCorpusJson('fundamentals/KO.US.json',args.fundamentals);
  const options={ask:args.ask,getBondYield:async()=>.04,evidence:async()=>null};
  await analyze(options);
  const stale=readCorpusJson<Analysis>('analysis/KO.US.json')!;
  stale.versions.pipeline='obsolete';stale.tests.moat.result='fail';
  writeCorpusJson('analysis/KO.US.json',stale);
  await analyze(options);
  expect(readCorpusJson<Analysis>('analysis/KO.US.json')).toMatchObject({versions:{pipeline:PIPELINE_VERSION},tests:{moat:{result:'pass'}}});
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
  args.fundamentals.years = makeYears({ overrides: (year, i) => ({ revenue: 1000 + i * 100, operatingIncome: 200 + i * 20, preTaxIncome: 200 + i * 20, netIncome: 150 + i * 15, taxExpense: 50 + i * 5, equity: 400 + i * 30, totalAssets:900+i*30, grossProfit: 400 + i * 40, ocf: 170 + i * 15, marketCap: 1000 + i * 300 }) });
  appendJsonl("universe.jsonl", args.company);
  writeCorpusJson("fundamentals/KO.US.json", args.fundamentals);
  let evidenceCalls = 0;
  const evidenceIds: string[] = [];
  const options = { ask: args.ask, getBondYield: async () => 0.04, evidence: async ({ questions }: { questions: Record<string, unknown> }) => { evidenceCalls++; evidenceIds.push(...Object.keys(questions)); return Object.fromEntries(Object.keys(questions).map(q => [q, "Supporting paragraph"])); } };
  await analyze(options);
  const good = readCorpusJson<Analysis>("analysis/KO.US.json")!;
  expect(Object.values(good.tests).every(t => t.numeric !== "fail")).toBe(true);
  expect(good.tests.moat.jev.find(a => a.q === "brand")?.evidence).toBe("Supporting paragraph");
  expect(evidenceCalls).toBe(1);
  expect(evidenceIds).toEqual(QUESTIONS.filter(q => q.q.type === 'noul' && q.contradicts !== 'yes'
    && trust.trusted.includes(q.id) && (trust.versions as Record<string, string>)[q.id] === q.version).map(q => q.id));
  evidenceCalls = 0;
  args.fundamentals.years = args.fundamentals.years.map(y => ({ ...y, sbc: y.ocf, nonRecurring: 1 }));
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
  vi.stubGlobal("fetch", async () => Response.json(recorded.map((row,i)=>({...row,date:new Date(Date.now()-i*86400000).toISOString().slice(0,10)}))));
  expect(await bondYield("US")).toBe(0.05239);
  writeCorpusJson("bonds/US.json", { date: "2000-01-01", yield: 0.05239 });
  vi.stubGlobal("fetch", async () => Response.json([{ date: new Date().toISOString().slice(0,10), close: 5 }]));
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

it("ignores market cap and unused metadata changes but invalidates analysis inputs", async () => {
  const args = input();
  appendJsonl("universe.jsonl", args.company);
  writeCorpusJson("fundamentals/KO.US.json", args.fundamentals);
  let calls = 0;
  const options = { ask: async () => { calls++; return answers(); }, getBondYield: async () => 0.04, evidence: async () => null };
  await analyze(options);
  writeCorpusJson("companies/KO.US.json", { marketCapUsd: 999, name: "New display name", listings: ["KO.US", "KO.F"] });
  await analyze(options);
  expect(calls).toBe(1);
  const metadata: Partial<Company> = {};
  for (const patch of [
    { kind: "bank" }, { currency: "EUR" }, { country: "GB" },
    { description: "Changed description" }, { sector: "Changed sector" }, { industry: "Changed industry" },
  ] satisfies Partial<Company>[]) {
    Object.assign(metadata, patch);
    writeCorpusJson("companies/KO.US.json", metadata);
    await analyze(options);
  }
  expect(calls).toBe(7);
  writeCorpusJson('companies/KO.US.json', {...metadata,name:'3i Group PLC'});
  await analyze(options);
  expect(calls).toBe(8);
  expect(readCorpusJson<Analysis>('analysis/KO.US.json')?.company.investmentHolding).toBe(true);
  expect(readCorpusJson<Analysis>('analysis/KO.US.json')?.valuation).toBeNull();
});

it("maps ISO GB to UK10Y while leaving other bond country codes unchanged", async () => {
  vi.stubGlobal("fetch", async (url: string) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/UK10Y.GBOND")) return Response.json([{ date: new Date().toISOString().slice(0,10), close: 4.75 }]);
    if (path.endsWith("/DE10Y.GBOND")) return Response.json([{ date: new Date().toISOString().slice(0,10), close: 2.5 }]);
    return new Response("Ticker Not Found", { status: 404 });
  });
  expect(await bondYield("GB")).toBe(0.0475);
  expect(await bondYield("DE")).toBe(0.025);
});

it.each(["empty", "not-found"] as const)("leaves value unavailable for a %s local bond series without substituting a foreign yield", async mode => {
  const args = input();
  args.company.country = "ZZ";
  appendJsonl("universe.jsonl", args.company);
  writeCorpusJson("fundamentals/KO.US.json", args.fundamentals);
  vi.stubGlobal("fetch", async (url: string) => new URL(url).pathname.endsWith("/US10Y.GBOND")
    ? Response.json([{ date: new Date().toISOString().slice(0,10), close: 7.25 }])
    : mode === "empty" ? Response.json([]) : new Response("Ticker Not Found", { status: 404 }));
  await analyze({ ask: args.ask, evidence: async () => null });
  const result = readCorpusJson<Analysis>("analysis/KO.US.json")!;
  expect(result.valuation).toBeNull();
  expect(result.valuationReason).toContain("Local government bond yield unavailable");
});

it("omits valuation when local bond yields are unavailable", async () => {
  const args = input();
  vi.stubGlobal("fetch", async () => Response.json([]));
  const result = await analyzeCompany({ ...args, bondYield: null });
  expect(result.valuation).toBeNull();
  expect(result.valuationReason).toContain("Local government bond");
});

it("converts GBP reporting units to GBX trading units at 100", async () => {
  writeCorpusJson("raw/eodhd/universe/fx-GBP.json", { date: new Date().toISOString().slice(0, 10), data: [{ close: 1.25 }] });
  const args = input();
  args.fundamentals.currency = "GBP";
  args.company.currency = "GBX";
  const result = await analyzeCompany(args);
  expect(result.valuation!.perShareTrading!.fxRate).toBe(100);
  expect(result.valuation!.perShareTrading!.mid).toBe(result.valuation!.perShare.mid * 100);
});

it("marks operating margin CV above 0.35 as cyclical without commodity exposure", async () => {
  const { makeYears } = await import("./synthetic");
  const args = input();
  args.fundamentals.balanceSheets = []; // This test isolates annual margin volatility.
  args.fundamentals.years = makeYears({ overrides: (_, i) => ({ operatingIncome: i % 2 ? 50 : 200 }) });
  const result = await analyzeCompany(args);
  expect(result.tests.understandable.metrics.opMarginCv).toBeGreaterThan(0.35);
  expect(result.valuation!.assumptions.join(' ')).toContain('five-year median owner-earnings margin');
});

it("uses a commodity cutoff independent of the evidence threshold", async () => {
  const { T } = await import("../../../lib/value/config");
  const { makeYears } = await import("./synthetic");
  const original = T.jev.evidence;
  Object.assign(T.jev, { evidence: 0.99 });
  try {
    const args = input();
    args.fundamentals.years = makeYears();
    args.ask = async () => answers().map(a => a.q === "commodity" ? { ...a, value: 0.6 } : a);
    const result = await analyzeCompany(args);
    expect(result.valuation!.assumptions.join(' ')).toContain('five-year median owner-earnings margin');
  } finally { Object.assign(T.jev, { evidence: original }); }
});

it("logs each failed company's error and still writes successful companies", async () => {
  for (const id of ["KO.US", "DAL.US"]) {
    const args = input(id);
    appendJsonl("universe.jsonl", args.company);
    writeCorpusJson(`fundamentals/${id}.json`, args.fundamentals);
  }
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(analyze({ ask: async ({ id }) => {
    if (id === "KO.US") throw new Error("Jev fixture failure");
    return answers();
  }, getBondYield: async () => 0.04, evidence: async () => null })).rejects.toThrow("KO.US");
  expect(log.mock.calls.flat().join(" ")).toContain("KO.US: Jev fixture failure");
  expect(readCorpusJson<Analysis>("analysis/DAL.US.json")?.status).toBe("scored");
});
it('retains current prior analysis when cache-bound Jev evidence needs a fresh reading',async()=>{
  const args=input();
  appendJsonl('universe.jsonl',args.company);
  writeCorpusJson('fundamentals/KO.US.json',args.fundamentals);
  const prior=await analyzeCompany(args);
  writeCorpusJson('analysis/KO.US.json',prior);
  const persisted=readCorpusJson<Analysis>('analysis/KO.US.json');
  await analyze({ask:async()=>{throw new Error('Cached reading unavailable or changed: KO.US');},getBondYield:async()=>.04,evidence:async()=>null});
  expect(readCorpusJson<Analysis>('analysis/KO.US.json')).toEqual(persisted);
});

it.each([
  { risk: 0.1, mean: 0.5, window: 5 },
  { risk: 0.5, mean: 0.7, window: 5 },
])("uses aggregated commodity mean $mean across conflicting sections", async ({ risk, mean, window }) => {
  const { makeYears } = await import("./synthetic");
  vi.mocked(askJev).mockImplementation(async ({ state }) => ({
    answers: { commodity: { type: "noul", noul: state === "business" ? 0.9 : risk } },
    usage: { input_tokens: 10 },
  }));
  const args = input();
  args.fundamentals.years = makeYears();
  const result = await analyzeCompany({ ...args, ask: askCompany, sections: { business: "business", risk: "risktext" } });
  expect(result.tests.understandable.jev.find(a => a.q === "commodity")?.value).toBeCloseTo(mean);
  expect(result.valuation!.assumptions.join(' ')).toContain('five-year median owner-earnings margin');
});

it("calibrates BHC.US through the BHC.TO primary analysis", async () => {
  const args = input("BHC.TO");
  args.company.listings = ["BHC.TO", "BHC.US"];
  appendJsonl("universe.jsonl", args.company);
  writeCorpusJson("fundamentals/BHC.TO.json", args.fundamentals);
  const table = vi.spyOn(console, "table").mockImplementation(() => {});
  const previous = process.exitCode;
  try {
    await calibrate({ only: ["BHC.US"], ask: args.ask, getBondYield: async () => 0.04, evidence: async () => null });
    expect(readCorpusJson<Analysis>("analysis/BHC.TO.json")?.id).toBe("BHC.TO");
    expect(table.mock.calls[0][0]).toEqual([expect.objectContaining({ id: "BHC.US", verdict: expect.stringMatching(/^correct:/) })]);
  } finally { process.exitCode = previous; }
});

it.each([
  { amplitude: 0, volatility: "stable", requiredMos: 0.25 },
  { amplitude: 0.2, volatility: "stable", requiredMos: 0.25 },
  { amplitude: 0.3, volatility: "moderate", requiredMos: 0.35 },
  { amplitude: 0.35, volatility: "moderate", requiredMos: 0.35 },
  { amplitude: 0.36, volatility: "volatile", requiredMos: 0.5 },
])("scales the required discount for margin variation $amplitude", async ({ amplitude, volatility, requiredMos }) => {
  const { makeYears } = await import("./synthetic");
  const args = input();
  args.fundamentals.balanceSheets = []; // This test isolates annual margin volatility.
  args.fundamentals.years = makeYears({ overrides: (_, i) => ({ operatingIncome: 100 * (1 + (i % 2 ? amplitude : -amplitude)) }) });
  expect(await analyzeCompany(args)).toMatchObject({ volatility, requiredMos });
});

it("requires the volatile discount for commodity exposure and missing CV", async () => {
  const { makeYears } = await import("./synthetic");
  const args = input(); args.fundamentals.years = makeYears();
  args.ask = async () => answers().map(a => a.q === "commodity" ? { ...a, value: 0.8 } : a);
  expect(await analyzeCompany(args)).toMatchObject({ volatility: "volatile", requiredMos: 0.5 });
  args.ask = async () => answers();
  args.fundamentals.years = makeYears({ overrides: { operatingIncome: null,preTaxIncome:null,interestExpense:null } });
  expect(await analyzeCompany(args)).toMatchObject({ volatility: "volatile", requiredMos: 0.5 });
});

it("values only each fiscal prefix with today's bond yield and FX, retaining ten years", async () => {
  const { makeYears } = await import("./synthetic");
  const args = input();
  args.fundamentals.years = makeYears({ n: 20, from: 2006 });
  args.company.currency = "GBX";
  const result = await analyzeCompany({ ...args, usdRate: async currency => currency === "USD" ? 1 : 0.0125 });
  expect(result.valueHistory).toHaveLength(10);
  expect(result.valueHistory?.map(row => row[0])).toEqual([2016,2017,2018,2019,2020,2021,2022,2023,2024,2025]);
  // History uses numeric quality; live quality also includes report judgments.
  const { valueCompany } = await import('@/lib/value/valuation');
  const { runNumericTests } = await import('@/lib/value/tests');
  const numeric = runNumericTests({years:args.fundamentals.years,kind:args.company.kind,priceHistoryPending:false});
  const expected=valueCompany({years:args.fundamentals.years,kind:args.company.kind,bondYield:.04,cyclical:false,qualityPass:Object.values(numeric).every(t=>t.numeric==='pass')}).valuation!;
  expect(result.valueHistory?.at(-1)?.[2]).toBeCloseTo(expected.perShare.mid * 80);
  expect(result.historyAssumptions?.join(" ")).toMatch(/today.*bond yield/i);
  expect(result.historyAssumptions?.join(" ")).toMatch(/today.*FX/i);
  args.fundamentals.years.at(-1)!.netIncome = 999999;
  args.fundamentals.years.at(-1)!.operatingIncome = 999999;
  const revised = await analyzeCompany({ ...args, usdRate: async currency => currency === "USD" ? 1 : 0.0125 });
  expect(revised.valueHistory?.slice(0, -1)).toEqual(result.valueHistory?.slice(0, -1));
});

it("derives per-share series and dated integrity, acquisition and impairment events", async () => {
  const { makeYears } = await import("./synthetic");
  const args = input();
  args.fundamentals.years = makeYears({ overrides: (_, i) => ({ goodwill: i < 10 ? 100 : 60, intangibles: 0, acquisitions: i === 9 ? 101 : 100 }) });
  args.fundamentals.integrity.notes = ["share count jumped 8x in 2015; history retained from 2015", "reporting currency changed in 2016; history retained from 2016"];
  const result = await analyzeCompany(args);
  expect(result.series?.revenuePerShare.at(-1)).toEqual([2023, 100]);
  expect(result.series?.ownerEarningsPerShare.at(-1)).toEqual([2023, 10]);
  expect(result.series?.bookValuePerShare.at(-1)).toEqual([2023, 50]);
  expect(result.events?.map(({fy, kind}) => [fy, kind])).toEqual([[2015,"share_change"],[2016,"currency_change"],[2022,"acquisition"],[2023,"impairment"]]);
  args.fundamentals.years.at(-1)!.dilutedShares = 0;
  const missing = await analyzeCompany(args);
  expect(missing.series?.revenuePerShare.at(-1)).toEqual([2023, null]);
});

it("R3 derives retained-dollar context from fiscal-end monthly closes through the corpus stage", async () => {
  const { makeYears } = await import("./synthetic");
  const { default: history } = await import("../../fixtures/value/prices-history/CALIB.US.json");
  const args = input();
  args.fundamentals.years = makeYears({ overrides: y => ({ end: `${y.fy}-09-30`, marketCap: null, buybacks: 10 }) });
  appendJsonl("universe.jsonl", args.company);
  writeCorpusJson("fundamentals/KO.US.json", args.fundamentals);
  writeCorpusJson("prices-history/KO.US.json", history);
  const options = { ask: args.ask, getBondYield: async () => 0.04, evidence: async () => null };
  await analyze(options);
  const result = readCorpusJson<Analysis>("analysis/KO.US.json")!;
  expect(result.tests.management.metrics.marketCapGain).toBe(1000);
  expect(result.tests.management.metrics.retainedEarnings).toBe(800);
  expect(result.tests.management.series.marketCap.at(-1)).toEqual([2023, 2000]);
  expect(result.tests.management.numeric).toBe("pass");
  // History is part of the input fingerprint; a new close must change the context.
  writeCorpusJson("prices-history/KO.US.json", history.map(([month, close]) => [month, month === "2023-09" ? 100 : close]));
  await analyze(options);
  const revised = readCorpusJson<Analysis>("analysis/KO.US.json")!.tests.management;
  expect(revised.numeric).toBe("pass");
  expect(revised.metrics.marketCapGain).toBeLessThan(revised.metrics.retainedEarnings!);
  rmSync(corpusPath("prices-history/KO.US.json"));
  await analyze(options);
  const missing = readCorpusJson<Analysis>("analysis/KO.US.json")!.tests.management;
  expect(missing.numeric).toBe("pass");
  expect(missing.metrics.perShareValueGrowth).not.toBeNull();
  expect(missing.metrics.marketCapGain).toBeNull();
});

it("R3 uses the inverse valuation FX for historical market caps, including pence", async () => {
  const { makeYears } = await import("./synthetic");
  const { default: history } = await import("../../fixtures/value/prices-history/CALIB.US.json");
  const args = input();
  args.fundamentals.currency = "GBP";
  args.company.currency = "GBX";
  args.fundamentals.years = makeYears({ overrides: y => ({ end: `${y.fy}-09-30`, marketCap: null }) });
  appendJsonl("universe.jsonl", args.company);
  writeCorpusJson("fundamentals/KO.US.json", args.fundamentals);
  writeCorpusJson("prices-history/KO.US.json", history.map(([month, close]) => [month, Number(close) * 100]));
  writeCorpusJson("raw/eodhd/universe/fx-GBP.json", { date: new Date().toISOString().slice(0, 10), data: [{ close: 1.25 }] });
  await analyze({ ask: args.ask, getBondYield: async () => 0.04, evidence: async () => null });
  const result = readCorpusJson<Analysis>("analysis/KO.US.json")!;
  expect(result.tests.management.metrics.marketCapGain).toBe(1000);
  expect(result.valuation!.perShareTrading!.fxRate).toBe(100);
});

it("M1 runs the $1 test through the stage with the real KO corpus and 120 monthly closes", async () => {
  const { default: fundamentals } = await import("../../fixtures/value/calibration-4/KO.US-fundamentals.json");
  const { default: prices } = await import("../../fixtures/value/calibration-4/KO.US-prices.json");
  expect(prices).toHaveLength(120);
  const args = input();
  appendJsonl("universe.jsonl", args.company);
  writeCorpusJson("fundamentals/KO.US.json", fundamentals);
  writeCorpusJson("prices-history/KO.US.json", prices);
  await analyze({ ask: args.ask, getBondYield: async () => 0.04, evidence: async () => null });
  const result = readCorpusJson<Analysis>("analysis/KO.US.json")!.tests.management;
  expect(result.series.marketCap[0]).toEqual([2015, null]);
  expect(result.metrics.marketCapGain).toBeCloseTo(121378149772.64404, 2);
  expect(result.metrics.retainedStartFy).toBe(2016);
  expect(result.metrics.retainedEndFy).toBe(2025);
  const retained = fundamentals.years.filter(y => y.fy > 2016 && y.fy <= 2025)
    .reduce((total, y) => total + y.netIncome! - y.dividendsPaid!, 0);
  expect(result.metrics.retainedEarnings).toBe(retained);
  expect(result.reasons).not.toContain("not enough data for the $1 retained earnings test");
});

it.each(["missing-month", "missing-shares", "missing-fx"] as const)("R3 keeps year-end market cap unavailable with %s", async missing => {
  const { makeYears } = await import("./synthetic");
  const args = input();
  args.fundamentals.years = makeYears({ overrides: y => ({
    end: `${y.fy}-09-30`, marketCap: 999999, dilutedShares: missing === "missing-shares" ? null : 10,
  }) });
  if (missing === "missing-fx") args.company.currency = "EUR";
  const result = await analyzeCompany({ ...args, usdRate: async () => null,
    priceHistory: [[missing === "missing-month" ? "2023-12" : "2023-09", 200]],
  });
  expect(result.tests.management.series.marketCap.at(-1)).toEqual([2023, null]);
  expect(result.tests.management.metrics.marketCapGain).toBeNull();
});

it("C5 reclassifies cached Credit Services enrichment with lending assets", async () => {
  const args = input();
  const { makeYears } = await import("./synthetic");
  args.fundamentals.years = makeYears({ overrides: { receivables: 500 } });
  args.company.industry = "Credit Services";
  args.company.kind = "operating";
  appendJsonl("universe.jsonl", args.company);
  writeCorpusJson("companies/KO.US.json", { kind: "operating", industry: "Credit Services" });
  writeCorpusJson("fundamentals/KO.US.json", args.fundamentals);
  await analyze({ ask: args.ask, getBondYield: async () => 0.04, evidence: async () => null });
  const result = readCorpusJson<Analysis>("analysis/KO.US.json")!;
  expect(result.company.kind).toBe("bank");
  expect(result.tests.moat.metrics.roeMedian).toBeTypeOf("number");
  expect(result.valuation?.method).toBe("book_value");
});

it("C4 analyze and jev-sample skip unsafe IDs and process ampersand IDs", async () => {
  const ids = ["PE&OLES.MX", "F&D.BK", "L&E.BK", "C&G.XNAI"];
  appendJsonl("universe.jsonl", input("../bad").company);
  for (const id of ids) {
    const args = input(id);
    appendJsonl("universe.jsonl", args.company);
    writeCorpusJson(`fundamentals/${id}.json`, args.fundamentals);
  }
  const log = vi.spyOn(console, "warn").mockImplementation(() => {});
  await analyze({ ask: async () => answers(), getBondYield: async () => 0.04, evidence: async () => null });
  for (const id of ids) expect(readCorpusJson<Analysis>(`analysis/${id}.json`)?.id).toBe(id);
  await sample({});
  const { readJsonl } = await import("../../../lib/value/corpus");
  expect(readJsonl<{id:string}>("jev-sample/brand.jsonl").map(row => row.id).sort()).toEqual([...ids].sort());
  expect(log.mock.calls.flat().join(" ")).toMatch(/skipp.*bad/i);
});

it("C5 clears the stale bank kind of a payment network in saved analysis", async () => {
  const args = input();
  const { makeYears } = await import("./synthetic");
  args.fundamentals.years = makeYears({ overrides: { receivables: 80 } });
  args.company.industry = "Credit Services";
  args.company.kind = "bank";
  appendJsonl("universe.jsonl", args.company);
  writeCorpusJson("companies/KO.US.json", { kind: "bank", industry: "Credit Services" });
  writeCorpusJson("fundamentals/KO.US.json", args.fundamentals);
  await analyze({ ask: args.ask, getBondYield: async () => 0.04, evidence: async () => null });
  const result = readCorpusJson<Analysis>("analysis/KO.US.json")!;
  expect(result.company.kind).toBe("operating");
  expect(result.valuation?.method).toBe("owner_earnings");
});

it("allows missing and insufficient calibration rows while still reporting them", async () => {
  const quality = await analyzeCompany(input());
  for (const test of Object.values(quality.tests)) test.result = "pass";
  const insufficient = { ...quality, status: "insufficient_data" as const };
  const summary = calibrationSummary({ entries: [
    { id: "KO.US", expect: "quality", why: "" },
    { id: "MISSING", expect: "quality", why: "" },
    { id: "SHORT", expect: "not_quality", why: "" },
    { id: "CHTR.US", expect: "exception", why: "" },
  ], analyses: new Map([["KO.US", quality], ["SHORT", insufficient], ["CHTR.US", quality]]) });
  expect(summary.failed).toBe(false);
  expect(summary.counts).toMatchObject({ truePositive: 1, missing: 2, exception: 1, falsePositive: 0, falseNegative: 0 });
  expect(summary.rows.filter(row => row.verdict === "missing or insufficient data")).toHaveLength(2);
});

it("reanalyzes explicitly selected cached companies outside the universe without repopulating it", async () => {
  const args = input();
  writeCorpusJson(`companies/${args.company.id}.json`, args.company);
  writeCorpusJson(`fundamentals/${args.company.id}.json`, args.fundamentals);
  const options = { ask: args.ask, getBondYield: async () => 0.04, evidence: async () => null };
  await analyze(options);
  expect(readCorpusJson(`analysis/${args.company.id}.json`)).toBeNull();
  await analyze({ ...options, only: [args.company.id] });
  expect(readCorpusJson<Analysis>(`analysis/${args.company.id}.json`)?.status).toBe("scored");
  expect(readCorpusJson("universe.jsonl")).toBeNull();
});

it('V3/V4 reads raw valuation inputs for old corpus files and invalidates their fingerprint', async () => {
  const { makeYears } = await import('./synthetic');
  const args = input();
  args.company.country = 'AU';
  args.company.industry = null;
  args.fundamentals.years = makeYears({ from: 2015, overrides: { dilutedShares: 100, netIncome: 489.9e6, da: 273.8e6, capex: 87.5e6 } });
  appendJsonl('universe.jsonl', args.company);
  writeCorpusJson('fundamentals/KO.US.json', args.fundamentals);
  const raw = { General: { CountryISO: 'AU', CurrencyCode: 'USD' }, SharesStats: { SharesOutstanding: 1000 }, Highlights: { MarketCapitalization: 10000 }, Financials: { Balance_Sheet: { yearly: Object.fromEntries(args.fundamentals.years.map(y => [y.end, { capitalLeaseObligations: '705000000' }])) } } };
  writeCorpusJson('raw/eodhd/KO.US.json', raw);
  writeCorpusJson('prices/AU.json', { 'KO.US': [10, '2026-09-29'] });
  const options = { ask: args.ask, getBondYield: async () => 0.04, evidence: async () => null };
  await analyze(options);
  const result = readCorpusJson<Analysis>('analysis/KO.US.json')!;
  expect(result.valuation?.shares).toBe(1000);
  expect(result.valuation?.normalized).toBeCloseTo(535.2e6);
  expect(result.series?.ownerEarningsPerShare.at(-1)?.[1]).toBeCloseTo(5.352e6);
  expect(result.tests.economics.series.ownerEarnings.at(-1)?.[1]).toBeCloseTo(535.2e6);
  raw.SharesStats.SharesOutstanding = 2000;
  raw.Highlights.MarketCapitalization = 20000;
  writeCorpusJson('raw/eodhd/KO.US.json', raw);
  await analyze(options);
  expect(readCorpusJson<Analysis>('analysis/KO.US.json')!.valuation?.shares).toBe(2000);
});

it('W3/W5 refreshes cached annual currency and balance mappings from raw periods during analysis', async () => {
  const args = input();
  const raw = structuredClone(ko) as any;
  const end = args.fundamentals.years.at(-1)!.end;
  // Exercise annual mapping without a newer quarterly balance taking precedence.
  raw.Financials.Balance_Sheet.quarterly = {};
  raw.Financials.Income_Statement.quarterly = {};
  raw.Financials.Cash_Flow.quarterly = {};
  raw.Financials.Balance_Sheet.yearly[end].cashAndShortTermInvestments = null;
  raw.Financials.Balance_Sheet.yearly[end].cash = '7000000000';
  raw.Financials.Balance_Sheet.yearly[end].shortTermInvestments = '2000000000';
  raw.Financials.Balance_Sheet.yearly[end].shortLongTermDebtTotal = null;
  raw.Financials.Balance_Sheet.yearly[end].shortTermDebt = null;
  raw.Financials.Balance_Sheet.yearly[end].shortLongTermDebt = null;
  raw.Financials.Balance_Sheet.yearly[end].longTermDebtTotal = '1000000000';
  raw.Financials.Balance_Sheet.yearly[end].capitalLeaseObligations = null;
  appendJsonl('universe.jsonl', args.company);
  writeCorpusJson('fundamentals/KO.US.json', args.fundamentals);
  writeCorpusJson('raw/eodhd/KO.US.json', raw);
  await analyze({ ask: async () => answers(), getBondYield: async () => .04, evidence: async () => null });
  expect(readCorpusJson<Analysis>('analysis/KO.US.json')?.valuation?.netCash).toBe(9e9 - .02 * args.fundamentals.years.at(-1)!.revenue!);
  expect(readCorpusJson<Analysis>('analysis/KO.US.json')?.valuation?.netDebt).toBe(-8e9);
  raw.Financials.Income_Statement.yearly[end].currency_symbol = 'CAD';
  writeCorpusJson('raw/eodhd/KO.US.json', raw);
  await analyze({ ask: async () => answers(), getBondYield: async () => .04, evidence: async () => null });
  const changed = readCorpusJson<Analysis>('analysis/KO.US.json')!;
  expect(changed.status).toBe('insufficient_data');
  expect(changed.events?.some(event => event.kind === 'currency_change')).toBe(true);
});

it('revalues on a 0.1pp yield bucket change, but skips noise in the same bucket', async () => {
 const args=input();appendJsonl('universe.jsonl',args.company);writeCorpusJson('fundamentals/KO.US.json',args.fundamentals);
 let rate=.0401, evidenceCalls=0;
 const options={ask:args.ask,getBondYield:async()=>rate,evidence:async()=>{evidenceCalls++;return null;}};
 await analyze(options);
 const first=readCorpusJson<Analysis>('analysis/KO.US.json')!.valuation!;
 const initialEvidenceCalls=evidenceCalls;expect(initialEvidenceCalls).toBeGreaterThan(0);
 rate=.0402;await analyze(options);
 expect(readCorpusJson<Analysis>('analysis/KO.US.json')!.valuation!.bondYield).toBe(.0401);
 rate=.0411;await analyze(options);
 const next=readCorpusJson<Analysis>('analysis/KO.US.json')!.valuation!;
 expect(next.bondYield).toBe(.0411);
 expect(next.discountRate).toBe(.1);
 expect(next.perShare.mid).toBe(first.perShare.mid);
 expect(evidenceCalls).toBe(initialEvidenceCalls);
});

it('loads statement payloads only for selected jobs, so later files cannot abort a limited run', async () => {
  for (const id of ['KO.US', 'DAL.US']) {
    const args = input(id);
    appendJsonl('universe.jsonl', args.company);
    writeCorpusJson(`fundamentals/${id}.json`, args.fundamentals);
  }
  writeFileSync(corpusPath('fundamentals/DAL.US.json'), '{invalid unselected statement');
  await analyze({limit:1, ask:async()=>answers(), getBondYield:async()=>.04, evidence:async()=>null});
  expect(readCorpusJson<Analysis>('analysis/KO.US.json')?.id).toBe('KO.US');
  expect(readCorpusJson('analysis/DAL.US.json')).toBeNull();
});

it('preserves unchanged nonmember evidence inputs when only the analysis clock changes', async () => {
  const args=input();
  appendJsonl('universe.jsonl',args.company);
  writeCorpusJson('fundamentals/KO.US.json',args.fundamentals);
  // Only the clock: analyze hands the event loop back with real setImmediate turns.
  vi.useFakeTimers({toFake:['Date']});
  try {
    vi.setSystemTime(new Date('2026-10-02T12:00:00Z'));
    const options={ask:args.ask,getBondYield:async()=>.04,evidence:async()=>null};
    await analyze(options);
    const before=readFileSync(corpusPath('analysis/inputs/KO.US.json'),'utf8');
    vi.setSystemTime(new Date('2026-10-03T12:00:00Z'));
    await analyze({...options,force:true});
    expect(readFileSync(corpusPath('analysis/inputs/KO.US.json'),'utf8')).toBe(before);
    expect(readCorpusJson<Analysis>('analysis/KO.US.json')!.asOf).toMatch(/^2026-10-03/);
  } finally { vi.useRealTimers(); }
});
it('does not retain a prior analysis built on another issuer\'s filing when a fresh reading is needed',async()=>{
  const args=input('BATRA.US');
  appendJsonl('universe.jsonl',args.company);
  writeCorpusJson('fundamentals/BATRA.US.json',args.fundamentals);
  const prior=await analyzeCompany(args);
  writeCorpusJson('analysis/BATRA.US.json',{...prior,report:{id:'BATRA.US',kind:'10-K',url:'https://www.sec.gov/Archives/edgar/data/1560385/000110465926020653/lmca-20251231x10k.htm',filed:'2026-02-26',period:'2025-12-31',sections:[]}});
  const log=vi.spyOn(console,'error').mockImplementation(()=>{});
  await expect(analyze({ask:async()=>{throw new Error('Cached reading unavailable or changed: BATRA.US');},getBondYield:async()=>.04,evidence:async()=>null})).rejects.toThrow();
  expect(log.mock.calls.flat().join(' ')).toContain('BATRA.US: Cached reading unavailable');
  log.mockRestore();
});

it('hands the event loop back between companies so a pending Jev reading is not starved into a timeout', async () => {
  vi.stubEnv('VALUE_ANALYZE_CONCURRENCY', '4');
  const ids = Array.from({ length: 24 }, (_, i) => `T${String.fromCharCode(65 + i)}.US`);
  for (const id of ids) {
    const args = input('DAL.US');
    appendJsonl('universe.jsonl', { ...args.company, id, name: id, code: id.split('.')[0], listings: [id] });
    writeCorpusJson(`fundamentals/${id}.json`, { ...args.fundamentals, id });
  }
  let analysed = 0, during = -1;
  await analyze({ getBondYield: async () => 0.04, evidence: async () => null, ask: async ({ id }) => {
    analysed++;
    // The first company's reading needs real I/O; every other one resolves at once,
    // like the unchanged companies that dominate a nightly run.
    if (id === ids[0]) { const before = analysed; await new Promise(resolve => setImmediate(resolve)); during = analysed - before; }
    return answers();
  } });
  expect(analysed).toBe(ids.length);
  // Before the fix the other workers analysed every remaining company first.
  expect(during).toBeGreaterThanOrEqual(0);
  expect(during).toBeLessThan(8);
}, 60_000);

it('publishes partial results: per-company failures within the stated share are retained, not fatal', async () => {
  for (const id of ['KO.US', 'DAL.US']) {
    const args = input(id);
    appendJsonl('universe.jsonl', args.company);
    writeCorpusJson(`fundamentals/${id}.json`, args.fundamentals);
  }
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const failKo = async ({ id }: { id: string }) => { if (id === 'KO.US') throw new Error('The operation was aborted due to timeout'); return answers(); };
  // 1 of 2 fresh analyses exceeds the default 2% share: still systemic.
  await expect(analyze({ ask: failKo, getBondYield: async () => 0.04, evidence: async () => null })).rejects.toThrow(/KO\.US.*exceeds 2%/);
  expect(readCorpusJson('staging/analysis-retained.json')).toMatchObject({ version: 1, ids: ['KO.US'], reasons: { 'KO.US': 'The operation was aborted due to timeout' } });
  await analyze({ force: true, ask: failKo, getBondYield: async () => 0.04, evidence: async () => null, maxFailureShare: 0.5 });
  expect(readCorpusJson<Analysis>('analysis/DAL.US.json')?.status).toBe('scored');
  expect(readCorpusJson<Analysis>('analysis/KO.US.json')).toBeNull();
  expect(log.mock.calls.flat().join('\n')).toMatch(/^analyze: retained released analysis for 1 companies pending a successful analysis: KO\.US$/m);
  // A later success (here an --only run) clears the company; companies not attempted keep their state.
  writeCorpusJson('staging/analysis-retained.json', { version: 1, updatedAt: '', ids: ['KO.US', 'ZZ.US'], reasons: { 'KO.US': 'x', 'ZZ.US': 'y' } });
  await analyze({ only: ['KO.US'], ask: async () => answers(), getBondYield: async () => 0.04, evidence: async () => null });
  expect(readCorpusJson('staging/analysis-retained.json')).toMatchObject({ ids: ['ZZ.US'], reasons: { 'ZZ.US': 'y' } });
});

it('bounds how long a timer waits behind workers whose awaits never leave the microtask queue', async () => {
  const busy = (ms: number) => { const end = Date.now() + ms; while (Date.now() < end); };
  // 16 workers x 6 companies; a company is two 4ms segments joined by a microtask await.
  const maxTimerGap = async (slice?: () => Promise<void>) => {
    let last = Date.now(), gap = 0;
    const timer = setInterval(() => { const now = Date.now(); gap = Math.max(gap, now - last); last = now; }, 1);
    await Promise.all(Array.from({ length: 16 }, async () => {
      for (let i = 0; i < 6; i++) { await slice?.(); busy(4); await Promise.resolve(); busy(4); }
    }));
    clearInterval(timer);
    return Math.max(gap, Date.now() - last);
  };
  expect(await maxTimerGap()).toBeGreaterThanOrEqual(700);
  // Admitting every waiter at once would hold a turn for 16 companies (128ms).
  expect(await maxTimerGap(eventLoopSlicer(10))).toBeLessThan(60);
});
