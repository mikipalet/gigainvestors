import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildOutput } from "@/lib/value/build-output";
import { corpusDir } from "@/lib/value/corpus";
import { parseYahooPrice, yahooPrice } from "@/lib/value/prices-yahoo";
import { shardOf } from "@/lib/value/shard";
import type { Analysis, Dossier, IndexRow, JevAnswer, StoreMeta, PriceMap } from "@/lib/value/types";
import { syncRepository, acquirePublishLock, resetRepository, loadAnalyses, commitOutput, loadHolders, publishSnapshot, runCalibration, writeOutput } from "@/scripts/value/stages/publish";
import { parseBulkPrices, refreshPrices, commitPrices } from "@/scripts/value/stages/prices";

function analysis(id = "KO.US"): Analysis {
  return {
    id, company: { id, name: id, code: id.split(".")[0], exchange: id.split(".").at(-1)!, country: "US", currency: "USD", isin: null, cik: null, lei: null, edinetCode: null, sector: "Consumer", industry: null, kind: "operating", listings: [id], marketCapUsd: 100, description: null, source: "eodhd" },
    asOf: "2026-09-29", status: "scored", report: { id, kind: "description", url: null, filed: null, period: null, sections: [] },
    tests: {
      understandable: { key: "understandable", result: "pass", numeric: "pass", reasons: [], metrics: {}, series: { revenue: [[2025, 100]] }, jev: [] },
      moat: { key: "moat", result: "pass", numeric: "pass", reasons: [], metrics: {}, series: {}, jev: [] },
      economics: { key: "economics", result: "pass", numeric: "pass", reasons: [], metrics: {}, series: {}, jev: [] },
      management: { key: "management", result: "pass", numeric: "pass", reasons: [], metrics: {}, series: {}, jev: [] },
      accounting: { key: "accounting", result: "pass", numeric: "pass", reasons: [], metrics: {}, series: {}, jev: [] },
    },
    valuation: { method: "owner_earnings", currency: "USD", normalized: 10, growth: 0.03, discountRate: 0.1, terminalGrowth: 0.03, bondYield: null, netCash: 0, shares: 1, perShare: { low: 80, mid: 100, high: 120 }, equityBondYield: null, bridge: [], assumptions: [] },
    valuationReason: null, versions: { pipeline: "1", questions: "1" },
  };
}
function answer(overrides: Partial<JevAnswer> = {}): JevAnswer {
  return { q: "brand", label: "Describes brand advantage", kind: "noul", value: 0.8, probability: 0.8, section: "business", evidence: null, trusted: true, ...overrides };
}
function output(analyses: Analysis[]) {
  return buildOutput({ analyses, holdersByTicker: {}, investorNames: {}, fx: {} }).files;
}
const directories: string[] = [];
function directory(): string {
  mkdirSync(corpusDir(), { recursive: true });
  const dir = mkdtempSync(path.join(corpusDir(), "publish-test-"));
  directories.push(dir);
  return dir;
}
beforeEach(() => { vi.stubEnv("VALUE_CORPUS_DIR", directory()); vi.stubGlobal("fetch", () => { throw new Error("Tests must not use the network"); }); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.useRealTimers(); for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true }); });
const git = (repo: string, args: string[]) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
function repository(): string {
  const repo = directory();
  git(repo, ["init", "-b", "main"]);
  git(repo, ["config", "user.name", "Value Test"]);
  git(repo, ["config", "user.email", "value-test@example.com"]);
  return repo;
}

describe("buildOutput", () => {
  it("publishes only all-pass and exact one-fail scored rows by market cap, and shards dossiers", () => {
    const pass = analysis();
    const miss = analysis("AXP.US"); miss.tests.moat.result = "fail"; miss.company.marketCapUsd = 200;
    const insufficient = analysis("BAD.US"); insufficient.status = "insufficient_data";
    const files = output([pass, miss, insufficient]);
    expect((files["index/default.json"] as IndexRow[]).map((row) => row.id)).toEqual(["AXP.US", "KO.US"]);
    expect(files[`dossiers/${shardOf(pass.id)}.json`]).toMatchObject({ "KO.US": { id: "KO.US", series: { revenue: [[2025, 100]] } } });
    expect((files["index/US.json"] as IndexRow[]).find((row) => row.id === "BAD.US")?.st).toBe("i");
    expect(files["meta.json"]).toMatchObject({ asOf: "2026-09-29", counts: { universe: 3, scored: 2, insufficient: 1 }, versions: pass.versions });
    expect(files["prices/US.json"]).toEqual({});
  });
  it("includes unresolved quality rows for the awaiting view; excludes na and multiple failures", () => {
    const rows = [analysis("U.US"), analysis("N.US"), analysis("F.US")];
    rows[0].tests.moat.result = "unclear"; rows[1].tests.moat.result = "na";
    rows[2].tests.moat.result = "fail"; rows[2].tests.economics.result = "fail";
    expect((output(rows)["index/default.json"] as IndexRow[]).map(r=>r.id)).toEqual(["U.US"]);
  });
  it("only emits trusted confident configured tags and applies the recurring choice rule", () => {
    const row = analysis();
    row.tests.moat.jev = [answer(), answer({ q: "network", trusted: false }), answer({ q: "switching_costs", probability: 0.69 }), answer({ q: "scale" })];
    row.tests.economics.jev = [answer({ q: "revenue_model", kind: "choice", value: "transactional" })];
    expect((output([row])["index/default.json"] as IndexRow[])[0].g).toEqual(["brand"]);
    row.tests.economics.jev[0].value = "recurring";
    expect((output([row])["index/default.json"] as IndexRow[])[0].g).toEqual(["brand", "recurring_revenue"]);
    row.tests.economics.jev[0].trusted = false;
    expect((output([row])["meta.json"] as { tags: Record<string, string> }).tags).toEqual({ brand: "Describes brand advantage" });
  });
  it("joins class-share tickers and explicit US ADR listings without foreign ticker collisions", () => {
    const brk = analysis("BRK-B.US");
    const foreign = analysis("KO.L"); foreign.company.country = "GB";
    const adr = analysis("ASML.AS"); adr.company.listings.push("ASML.US");
    const { files } = buildOutput({ analyses: [brk, foreign, adr], holdersByTicker: { "BRK.B": ["BRK", "BRK"], KO: ["BRK"], ASML: ["TGM"] }, investorNames: { BRK: "Warren Buffett", TGM: "Tiger Global" }, fx: {} });
    expect((files[`dossiers/${shardOf(brk.id)}.json`] as Record<string, Dossier>)[brk.id].holders).toEqual([{ code: "BRK", name: "Warren Buffett" }]);
    expect((files["index/GB.json"] as IndexRow[])[0].h).toBe(0);
    expect((files[`dossiers/${shardOf(adr.id)}.json`] as Record<string, Dossier>)[adr.id].holders).toEqual([{ code: "TGM", name: "Tiger Global" }]);
  });
  it("publishes trading values and computes the sixth test in that currency without storing the quote", () => {
    const row = analysis("TEST.L"); row.company.currency = "GBX"; row.valuation!.currency = "GBP";
    row.valuation!.perShareTrading = { currency: "GBX", fxRate: 100, low: 8000, mid: 10000, high: 12000 };
    const { files } = buildOutput({ analyses: [row], holdersByTicker: {}, investorNames: {}, fx: {}, prices: { "TEST.L": [7000, "2026-09-28"] } });
    expect((files["index/US.json"] as IndexRow[])[0]).toMatchObject({ cur: "GBX", v: [8000, 10000, 12000] });
    const dossier = (files[`dossiers/${shardOf(row.id)}.json`] as Record<string, Dossier>)[row.id];
    expect(dossier.tests.price?.result).toBe("pass");
    expect((files["meta.json"] as StoreMeta).funnel!.gates[5].passing).toBe(1);
    expect(dossier.tests.price?.metrics.mos).toBeCloseTo(0.3);
    expect(dossier).not.toHaveProperty("price");
    expect(row.valuation!.perShare.mid).toBe(100);
  });
  it("converts with USD FX rates including minor units, and leaves missing FX unavailable", () => {
    const row = analysis("TEST.L"); row.company.currency = "GBX"; row.valuation!.currency = "EUR";
    const { files } = buildOutput({ analyses: [row], holdersByTicker: {}, investorNames: {}, fx: { EUR: 1.2, GBP: 1.5 } });
    expect((files["index/US.json"] as IndexRow[])[0].v).toEqual([6400, 8000, 9600]);
    expect((output([row])["index/US.json"] as IndexRow[])[0].v).toBeNull();
  });
  it("caps top.json at 2000 and orders unknown market caps last", () => {
    const rows = Array.from({ length: 2002 }, (_, n) => { const row = analysis(`${n}.US`); row.company.marketCapUsd = n; return row; });
    rows[2001].company.marketCapUsd = null;
    const top = output(rows)["top.json"] as string[];
    expect(top).toHaveLength(2000); expect(top[0]).toBe("2000.US"); expect(top.at(-1)).toBe("1.US");
  });
});

describe("publish repository", () => {
  it("requires the calibration command to succeed before publishing", () => {
    const dir = directory();
    const cli = path.join(dir, "calibrate.mjs");
    writeFileSync(cli, 'process.exit(process.argv[2] === "calibrate" ? 0 : 2);');
    expect(() => runCalibration(cli)).not.toThrow();
    writeFileSync(cli, 'process.exit(1);');
    expect(() => runCalibration(cli)).toThrow("Calibration failed; publish aborted");
  });
  it("preserves price bytes, removes obsolete generated files and replaces history with one commit", () => {
    const repo = repository();
    mkdirSync(path.join(repo, "prices")); writeFileSync(path.join(repo, "prices/US.json"), '{"KO.US":[70,"2026-09-28"]}\n');
    mkdirSync(path.join(repo, "index")); writeFileSync(path.join(repo, "index/OLD.json"), "[]");
    git(repo, ["add", "."]); git(repo, ["commit", "-m", "old"]);
    const files = output([analysis()]);
    writeOutput({ repo, files }); commitOutput({ repo, asOf: "2026-09-29" });
    expect(readFileSync(path.join(repo, "prices/US.json"), "utf8")).toBe('{"KO.US":[70,"2026-09-28"]}\n');
    expect(() => readFileSync(path.join(repo, "index/OLD.json"))).toThrow();
    expect(git(repo, ["rev-list", "--count", "HEAD"])).toBe("1");
    expect(git(repo, ["branch", "--show-current"])).toBe("main");
    expect(git(repo, ["status", "--porcelain"])).toBe("");
    writeOutput({ repo, files });
    expect(commitOutput({ repo, asOf: "2026-09-29" })).toBe(false);
  });
  it("creates an initial snapshot in an empty repository", () => {
    const repo = repository();
    writeOutput({ repo, files: output([analysis()]) });
    expect(commitOutput({ repo, asOf: "2026-09-29" })).toBe(true);
    expect(git(repo, ["rev-list", "--count", "HEAD"])).toBe("1");
    expect(git(repo, ["branch", "--show-current"])).toBe("main");
  });
  it("collapses intervening price commits even when the snapshot files are unchanged", () => {
    const repo = repository();
    writeOutput({ repo, files: output([analysis()]) }); commitOutput({ repo, asOf: "2026-09-29" });
    writeFileSync(path.join(repo, "prices/US.json"), '{"KO.US":[70,"2026-09-28"]}');
    commitPrices({ repo, asOf: "2026-09-29" });
    expect(commitOutput({ repo, asOf: "2026-09-29" })).toBe(true);
    expect(git(repo, ["rev-list", "--count", "HEAD"])).toBe("1");
  });
  it("retains unselected dossiers in a partial publish and removes delisted companies", () => {
    const repo = repository();
    const axp = analysis("AXP.US"); axp.valuation!.shares = 2; // cap 100 = quote 50 × shares 2
    writeOutput({ repo, files: output([analysis(), axp, analysis("DELISTED.US")]) });
    commitOutput({ repo, asOf: "2026-09-29" });
    mkdirSync(path.join(corpusDir(), "prices"), { recursive: true });
    writeFileSync(path.join(corpusDir(), "prices/US.json"), JSON.stringify({ "AXP.US": [50, "2026-09-29", "seed"] }));
    mkdirSync(path.join(repo, "search"), { recursive: true });
    writeFileSync(path.join(repo, "search/a.json"), "{}");
    const updated = analysis(); updated.tests.moat.result = "fail";
    publishSnapshot({ repo, analyses: [updated], universe: ["KO.US", "AXP.US", "PENDING.US"].map(id => analysis(id).company), partial: true, force: true, holdersByTicker: {}, investorNames: {} });
    const rows = JSON.parse(readFileSync(path.join(repo, "index/default.json"), "utf8")) as IndexRow[];
    expect(rows.map((row) => [row.id, row.t])).toEqual([["AXP.US", "PPPPP"], ["KO.US", "PFPPP"]]);
    const search = (key: string) => JSON.parse(readFileSync(path.join(repo, `search/${key}.json`), "utf8"));
    expect(search("ax").rows).toContainEqual(["AXP.US", "AXP.US", "US", "a", 100]);
    expect(search("pe").rows).toContainEqual(["PENDING.US", "PENDING.US", "US", "p", 100]);
    expect(search("de").rows).toEqual([]);
    expect(search("manifest")).toEqual({ version: 1, split: [], maxPrefix: 2 });
    expect(existsSync(path.join(repo, "search/a.json"))).toBe(false);
    const funnel = (JSON.parse(readFileSync(path.join(repo, "meta.json"), "utf8")) as StoreMeta).funnel!;
    expect(funnel.analysed).toBe(2);
    expect(funnel.gates.map(g => g.passing)).toEqual([2, 1, 1, 1, 1, 1]);
    expect(git(repo, ["rev-list", "--count", "HEAD"])).toBe("1");
  });
  it("loads only active latest-quarter holders from stock shards and resolves investor names", () => {
    const store = directory(); mkdirSync(path.join(store, "stocks"));
    writeFileSync(path.join(store, "holders.json"), JSON.stringify({ KO: 1 }));
    writeFileSync(path.join(store, "index.json"), JSON.stringify({ quarters: ["2026 Q2"], investors: [{ code: "BRK", person: "Warren Buffett" }] }));
    writeFileSync(path.join(store, "stocks/K.json"), JSON.stringify({ KO: { ticker: "KO", quarters: [{ q: "2026 Q1", holders: [{ code: "OLD", value: 10, activity: "hold" }] }, { q: "2026 Q2", holders: [{ code: "BRK", value: 10, activity: "hold" }, { code: "SOLD", value: 10, activity: "sold" }] }] } }));
    expect(loadHolders(store)).toEqual({ holdersByTicker: { KO: ["BRK"] }, investorNames: { BRK: "Warren Buffett" } });
  });
});

describe("prices", () => {
  it("normalizes recorded bulk closes and dates, excluding unknown or invalid rows", () => {
    const raw = JSON.parse(readFileSync("tests/fixtures/value/prices/eodhd-US.json", "utf8"));
    expect(parseBulkPrices({ rows: raw, companies: [analysis().company, analysis("BRK-B.US").company] })).toEqual({ "KO.US": [87.18, "2026-09-28"], "BRK-B.US": [503.09, "2026-09-28"] });
    expect(parseBulkPrices({ rows: [{ code: "KO", date: "2026-09-28", close: 0 }, { code: "KO", date: "bad", close: 1 }], companies: [analysis().company] })).toEqual({});
    expect(() => parseBulkPrices({ rows: { error: "bad" }, companies: [] })).toThrow();
  });
  it("reads the recorded Yahoo market price and uses the JST market date", async () => {
    const raw = JSON.parse(readFileSync("tests/fixtures/value/prices/yahoo-8058.json", "utf8"));
    expect(parseYahooPrice(raw)).toEqual([4637, "2026-09-29"]);
    raw.chart.result[0].meta.regularMarketTime = Date.parse("2026-09-28T23:30:00Z") / 1000;
    expect(parseYahooPrice(raw)).toEqual([4637, "2026-09-29"]);
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      expect(url).toBe("https://query1.finance.yahoo.com/v8/finance/chart/8058.T?range=5d&interval=1d");
      expect(new Headers(init.headers).get("User-Agent")).toContain("Mozilla/5.0");
      return new Response(JSON.stringify(raw));
    });
    expect(await yahooPrice(analysis("8058.JP").company)).toEqual([4637, "2026-09-29"]);
    expect(() => parseYahooPrice({ chart: { result: null, error: { code: "Not Found" } } })).toThrow();
    raw.chart.result[0].meta.regularMarketPrice = 0;
    expect(() => parseYahooPrice(raw)).toThrow();
  });
  it("keeps a failed Japanese quote while publishing successful quotes", async () => {
    const repo = directory();
    mkdirSync(path.join(repo, "prices"));
    writeFileSync(path.join(repo, "prices/JP.json"), '{"8058.JP":[4500,"2026-09-28"]}');
    const companies = ["8058.JP", "8031.JP"].map(id => ({ ...analysis(id).company, country: "JP" }));
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    await refreshPrices({ repo, companies, yahoo: async company => {
      if (company.id === "8058.JP") throw new Error("HTTP 404");
      return [3200, "2026-09-29"];
    } });
    expect(JSON.parse(readFileSync(path.join(repo, "prices/JP.json"), "utf8"))).toEqual({ "8058.JP": [4500, "2026-09-28"], "8031.JP": [3200, "2026-09-29"] });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("8058.JP"));
  });
  it("does not write fetched US prices when the Japanese provider fails", async () => {
    const repo = directory();
    mkdirSync(path.join(repo, "prices"));
    const before = '{"KO.US":[70,"2026-09-25"]}';
    writeFileSync(path.join(repo, "prices/US.json"), before);
    const japan = analysis("8058.JP"); japan.company.country = "JP";
    const raw = JSON.parse(readFileSync("tests/fixtures/value/prices/eodhd-US.json", "utf8"));
    await expect(refreshPrices({ repo, companies: [analysis().company, japan.company], bulk: async () => raw, yahoo: async () => { throw new Error("Yahoo HTTP 403"); } })).rejects.toThrow("All Yahoo quotes failed");
    expect(readFileSync(path.join(repo, "prices/US.json"), "utf8")).toBe(before);
  });
  it("routes Japanese companies to Yahoo and separates same-country exchanges", async () => {
    const repo = directory();
    const japan = analysis("8058.JP"); japan.company.country = "JP";
    const uk = analysis("KO.L"); uk.company.country = "GB";
    await refreshPrices({ repo, companies: [analysis().company, japan.company, uk.company],
      bulk: async (exchange) => [{ code: "KO", date: "2026-09-28", close: exchange === "US" ? 70 : 150 }],
      yahoo: async () => [3400, "2026-09-28"],
    });
    expect(JSON.parse(readFileSync(path.join(repo, "prices/JP.json"), "utf8"))).toEqual({ "8058.JP": [3400, "2026-09-28"] });
    expect(JSON.parse(readFileSync(path.join(repo, "prices/GB.json"), "utf8"))).toEqual({ "KO.L": [150, "2026-09-28"] });
    expect(JSON.parse(readFileSync(path.join(repo, "prices/US.json"), "utf8"))).toEqual({ "KO.US": [70, "2026-09-28"] });
  });
  it("refreshes selected companies while preserving newer prices and other countries; repeat is a no-op", async () => {
    const repo = repository();
    writeOutput({ repo, files: output([analysis()]) }); commitOutput({ repo, asOf: "2026-09-29" });
    mkdirSync(path.join(repo, "prices"), { recursive: true });
    writeFileSync(path.join(repo, "prices/US.json"), JSON.stringify({ "OTHER.US": [5, "2026-09-28"], "BRK-B.US": [999, "2026-09-29"] }));
    writeFileSync(path.join(repo, "prices/JP.json"), '{"8058.JP":[1,"2026-09-28"]}\n');
    commitPrices({ repo, asOf: "2026-09-28" });
    const raw = JSON.parse(readFileSync("tests/fixtures/value/prices/eodhd-US.json", "utf8"));
    vi.stubGlobal("fetch", () => { throw new Error("Tests must not use the network"); });
    await refreshPrices({ repo, companies: [analysis().company, analysis("BRK-B.US").company], bulk: async () => raw });
    expect(JSON.parse(readFileSync(path.join(repo, "prices/US.json"), "utf8"))).toEqual({ "OTHER.US": [5, "2026-09-28"], "KO.US": [87.18, "2026-09-28"], "BRK-B.US": [999, "2026-09-29"] });
    expect(readFileSync(path.join(repo, "prices/JP.json"), "utf8")).toBe('{"8058.JP":[1,"2026-09-28"]}\n');
    expect(commitPrices({ repo, asOf: "2026-09-29" })).toBe(true);
    expect(git(repo, ["rev-list", "--count", "HEAD"])).toBe("3");
    const paths = git(repo, ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]);
    expect(paths.split("\n")).toEqual(["dossiers/027.json", "meta.json", "prices/US.json"]);
    await refreshPrices({ repo, companies: [analysis().company], bulk: async () => raw });
    expect(commitPrices({ repo, asOf: "2026-09-29" })).toBe(false);
  });
});


describe("publish rollout safeguards", () => {
  it("publishes available analyses and skips missing and unreadable files", () => {
    const root = directory(); vi.stubEnv("VALUE_CORPUS_DIR", root);
    mkdirSync(path.join(root, "analysis"));
    writeFileSync(path.join(root, "analysis/KO.US.json"), JSON.stringify(analysis()));
    writeFileSync(path.join(root, "analysis/BAD.US.json"), "{broken");
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    const companies = [analysis().company, analysis("BAD.US").company, analysis("MISSING.US").company];
    const analyses = loadAnalyses(companies);
    expect(analyses.map(row => row.id)).toEqual(["KO.US"]);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("BAD.US"));
    const repo = repository();
    publishSnapshot({ repo, analyses, universe: companies, partial: false, holdersByTicker: {}, investorNames: {} });
    expect(JSON.parse(readFileSync(path.join(repo, "meta.json"), "utf8")).counts).toEqual({ universe: 3, analysed: 1, scored: 1, insufficient: 0 });
  });
  it("reports the modal version pair and the count on other versions", () => {
    const old = analysis(); old.versions = { pipeline: "old", questions: "old" };
    expect(output([old, analysis("A.US"), analysis("B.US")])["meta.json"]).toMatchObject({ versions: { pipeline: "1", questions: "1", other: 1 } });
  });
  it.each([0, 7])("rejects a published count of %i before changing the prior snapshot", count => {
    const repo = repository();
    const previous = Array.from({ length: 10 }, (_, i) => analysis(`${i}.US`));
    writeOutput({ repo, files: output(previous) }); commitOutput({ repo, asOf: "2026-09-29" });
    const before = git(repo, ["rev-parse", "HEAD"]);
    expect(() => publishSnapshot({ repo, analyses: previous.slice(0, count), universe: previous.map(row => row.company), partial: false, holdersByTicker: {}, investorNames: {} })).toThrow(/--force/);
    expect(git(repo, ["rev-parse", "HEAD"])).toBe(before);
    expect(git(repo, ["status", "--porcelain"])).toBe("");
  });
  it("allows exactly a 20% decline and compares published count rather than universe", () => {
    const repo = repository();
    writeOutput({ repo, files: { ...output([analysis()]), "meta.json": { counts: { universe: 60000, analysed: 10, scored: 10, insufficient: 0 } } } });
    commitOutput({ repo, asOf: "2026-09-29" });
    const analyses = Array.from({ length: 8 }, (_, i) => analysis(`${i}.US`));
    expect(publishSnapshot({ repo, analyses, universe: analyses.map(row => row.company), partial: false, holdersByTicker: {}, investorNames: {} }).count).toBe(8);
  });
  it("guards legacy metadata and allows an explicit forced empty snapshot", () => {
    const repo = repository();
    writeOutput({ repo, files: { ...output([analysis()]), "meta.json": { counts: { universe: 10, scored: 8, insufficient: 2 } } } });
    commitOutput({ repo, asOf: "2026-09-29" });
    const args = { repo, analyses: [], universe: [], partial: false, holdersByTicker: {}, investorNames: {} };
    expect(() => publishSnapshot(args)).toThrow(/--force/);
    expect(publishSnapshot({ ...args, force: true }).count).toBe(0);
    expect(JSON.parse(readFileSync(path.join(repo, "meta.json"), "utf8")).counts.analysed).toBe(0);
  });
  it("guards a legacy nonempty count drop and permits --force", () => {
    const repo = repository();
    writeOutput({ repo, files: { ...output([analysis()]), "meta.json": { counts: { universe: 10, scored: 8, insufficient: 2 } } } });
    commitOutput({ repo, asOf: "2026-09-29" });
    const args = { repo, analyses: [analysis()], universe: [analysis().company], partial: false, holdersByTicker: {}, investorNames: {} };
    expect(() => publishSnapshot(args)).toThrow(/--force/);
    expect(publishSnapshot({ ...args, force: true }).count).toBe(1);
  });
  it("rejects an empty first publish", () => {
    const repo = repository();
    expect(() => publishSnapshot({ repo, analyses: [], universe: [analysis().company], partial: false, holdersByTicker: {}, investorNames: {} })).toThrow(/--force/);
    expect(git(repo, ["status", "--porcelain"])).toBe("");
  });
  it("does not release a replacement owner's lock", () => {
    const lock = path.join(directory(), "publish.lock");
    const oldRelease = acquirePublishLock(lock);
    const ownerFile = path.join(lock, "owner.json");
    const owner = JSON.parse(readFileSync(ownerFile, "utf8"));
    writeFileSync(ownerFile, JSON.stringify({ ...owner, timestamp: Date.now() - 7 * 3600000 }));
    const release = acquirePublishLock(lock);
    oldRelease();
    expect(() => acquirePublishLock(lock)).toThrow(lock);
    release();
  });
  it("resets tracked changes and removes leftover untracked output", () => {
    const repo = repository();
    writeOutput({ repo, files: output([analysis()]) }); commitOutput({ repo, asOf: "2026-09-29" });
    writeFileSync(path.join(repo, "meta.json"), "broken");
    mkdirSync(path.join(repo, "leftovers")); writeFileSync(path.join(repo, "leftovers/tmp"), "broken");
    resetRepository(repo);
    expect(git(repo, ["status", "--porcelain"])).toBe("");
  });
  it("records lock ownership, blocks live owners with the path, and releases", () => {
    const lock = path.join(directory(), "publish.lock");
    const release = acquirePublishLock(lock);
    expect(JSON.parse(readFileSync(path.join(lock, "owner.json"), "utf8"))).toMatchObject({ pid: process.pid, timestamp: expect.any(Number) });
    expect(() => acquirePublishLock(lock)).toThrow(lock);
    release();
    acquirePublishLock(lock)();
  });
  it.each(["expired", "dead"])("breaks a %s lock automatically", kind => {
    const lock = path.join(directory(), "publish.lock"); mkdirSync(lock);
    writeFileSync(path.join(lock, "owner.json"), JSON.stringify({ pid: kind === "dead" ? 2147483647 : process.pid, timestamp: Date.now() - (kind === "expired" ? 7 * 3600000 : 0) }));
    const release = acquirePublishLock(lock);
    expect(JSON.parse(readFileSync(path.join(lock, "owner.json"), "utf8")).pid).toBe(process.pid);
    release();
  });
});

describe("Yahoo rate limiting", () => {
  it("limits Yahoo requests to two per second", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    const starts: number[] = [];
    const raw = readFileSync("tests/fixtures/value/prices/yahoo-8058.json", "utf8");
    vi.stubGlobal("fetch", async () => { starts.push(Date.now()); return new Response(raw); });
    const requests = Promise.all([1, 2, 3].map(() => yahooPrice(analysis("8058.JP").company)));
    await vi.runAllTimersAsync();
    await requests;
    expect(starts).toHaveLength(3);
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(500);
    expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(500);
  });
});

it("publishes volatility discount, compact ROIC and the added dossier data", () => {
  const row = analysis(); row.requiredMos = 0.5; row.volatility = 'volatile';
  row.valueHistory = [[2025,80,100,120]];
  row.series = { revenuePerShare: [[2025,10]] };
  row.events = [{ fy:2025, kind:'acquisition', note:'Acquisition spending exceeded 10% of assets' }];
  row.tests.moat.series.roic = Array.from({length:12}, (_, i) => [2014+i, i === 10 ? null : 0.123456]);
  const { files } = buildOutput({ analyses:[row], holdersByTicker:{}, investorNames:{}, fx:{}, prices:{'KO.US':[70,'2026-09-29']}, priceHistories:{'KO.US':[['2025-01',70]]} });
  expect((files['index/US.json'] as IndexRow[])[0]).toMatchObject({m:0.5,r:[0.123,0.123,0.123,0.123,0.123,0.123,0.123,0.123,null,0.123]});
  const dossier = (files[`dossiers/${shardOf(row.id)}.json`] as Record<string,Dossier>)[row.id];
  expect(dossier).toMatchObject({valueHistory:row.valueHistory,priceHistory:[['2025-01',70]],events:row.events,series:row.series,tests:{price:{result:'unclear'}}});
});

it("loads analysis with a cheap shape check without building output", async () => {
  const root = directory(); vi.stubEnv('VALUE_CORPUS_DIR',root);
  const { writeCorpusJson } = await import('@/lib/value/corpus');
  const module = await import('@/lib/value/build-output');
  const build = vi.spyOn(module,'buildOutput').mockImplementation(() => { throw Error('Must not build during validation'); });
  writeCorpusJson('analysis/KO.US.json',analysis());
  writeCorpusJson('analysis/BAD.US.json',{ ...analysis('BAD.US'),tests:{moat:null} });
  writeCorpusJson('analysis/BADCOUNTRY.US.json',{ ...analysis('BADCOUNTRY.US'),company:{ ...analysis().company,country:'../../bad'} });
  vi.spyOn(console,'warn').mockImplementation(() => {});
  expect(loadAnalyses([analysis().company,analysis('BAD.US').company,analysis('BADCOUNTRY.US').company]).map(row => row.id)).toEqual(['KO.US']);
  expect(build).not.toHaveBeenCalled();
});

it("joins the corpus monthly history at publish time and preserves it on partial publish", async () => {
  const root = directory(); vi.stubEnv('VALUE_CORPUS_DIR',root);
  const { writeCorpusJson } = await import('@/lib/value/corpus');
  writeCorpusJson('prices-history/KO.US.json',[['2025-01',70]]);
  const repo = repository();
  const args = {repo,universe:['KO.US','AXP.US'].map(id => analysis(id).company),holdersByTicker:{},investorNames:{}};
  const row = analysis(); row.series={revenuePerShare:[[2025,10]]};
  publishSnapshot({...args,analyses:[row,analysis('AXP.US')],partial:false});
  const read = () => JSON.parse(readFileSync(path.join(repo,`dossiers/${shardOf(row.id)}.json`),'utf8'))[row.id];
  expect(read().priceHistory).toEqual([['2025-01',70]]);
  rmSync(path.join(root,'prices-history'),{recursive:true});
  publishSnapshot({...args,analyses:[analysis('AXP.US')],partial:true});
  expect(read().priceHistory).toEqual([['2025-01',70]]);
  expect(read().series.revenuePerShare).toEqual([[2025,10]]);
});

it('pads unavailable ROIC years with nulls without substituting financial-company ROE', () => {
  const row = analysis(); row.tests.moat.series.roic = [[2024,0.15678],[2025,null]];
  expect((output([row])['index/US.json'] as IndexRow[])[0].r).toEqual([null,null,null,null,null,null,null,null,0.157,null]);
  delete row.tests.moat.series.roic; row.tests.moat.series.roe = [[2025,0.2]]; row.company.kind = 'bank';
  expect((output([row])['index/US.json'] as IndexRow[])[0].r).toEqual(Array(10).fill(null));
});

it("C4 publish skips invalid IDs and loads ampersand analyses", async () => {
  const { writeCorpusJson } = await import("@/lib/value/corpus");
  vi.stubEnv("VALUE_CORPUS_DIR", directory());
  const ids = ["PE&OLES.MX", "F&D.BK", "L&E.BK", "C&G.XNAI"];
  const rows = ids.map(id => analysis(id));
  for (const row of rows) writeCorpusJson(`analysis/${row.id}.json`, row);
  const log = vi.spyOn(console, "warn").mockImplementation(() => {});
  expect(loadAnalyses([analysis("../bad").company, ...rows.map(row => row.company)])).toEqual(rows);
  expect(log.mock.calls.flat().join(" ")).toMatch(/skipp.*bad/i);
});

it('preserves an unpushed prices commit when preparing the next publish', () => {
  const remote = directory(); git(remote, ['init', '--bare', '-b', 'main']);
  const repo = directory();
  git(repo, ["init", "-b", "main"]); git(repo, ["config", "user.name", "Value Test"]); git(repo, ["config", "user.email", "value-test@example.com"]);
  git(repo, ['remote', 'add', 'origin', remote]);
  writeFileSync(path.join(repo, 'meta.json'), '{}');
  git(repo, ['add', '.']); git(repo, ['commit', '-m', 'initial']); git(repo, ['push', 'origin', 'main']);
  mkdirSync(path.join(repo, 'prices')); writeFileSync(path.join(repo, 'prices/US.json'), '{"KO.US":[60,"2026-09-29"]}');
  commitPrices({ repo, asOf: '2026-09-29' });
  const writer = directory();
  git(writer, ['clone', remote, '.']);
  git(writer, ['config', 'user.name', 'Value Test']); git(writer, ['config', 'user.email', 'value-test@example.com']);
  git(writer, ['checkout', '--orphan', 'snapshot']);
  writeFileSync(path.join(writer, 'meta.json'), '{"newSnapshot":true}');
  git(writer, ['add', '.']); git(writer, ['commit', '-m', 'new snapshot']);
  git(writer, ['push', '-f', 'origin', 'HEAD:main']);
  syncRepository(repo);
  expect(JSON.parse(readFileSync(path.join(repo, 'meta.json'), 'utf8'))).toEqual({ newSnapshot: true });
  expect(JSON.parse(readFileSync(path.join(repo, 'prices/US.json'), 'utf8'))['KO.US'][0]).toBe(60);
  expect(git(repo, ['rev-list', '--count', 'origin/main..HEAD'])).toBe('1');
});


describe("published funnel", () => {
  it("counts all analyses cumulatively and isolates quality failures independently of price by country", () => {
    const keys = ["understandable", "moat", "economics", "management", "accounting"] as const;
    const rows = keys.map((key, i) => {
      const row = analysis(`FAIL${i}.US`);
      row.tests[key].result = "fail";
      return row;
    });
    const pass = analysis("PASS.US");
    const multi = analysis("MULTI.US"); multi.tests.understandable.result = "fail"; multi.tests.moat.result = "fail";
    const unclear = analysis("UNCLEAR.US"); unclear.tests.moat.result = "unclear";
    const na = analysis("NA.US"); na.tests.economics.result = "na";
    const insufficient = analysis("INSUFFICIENT.US"); insufficient.status = "insufficient_data";
    const costly = analysis("COSTLY.JP"); costly.company.country = "JP"; costly.requiredMos = 0.5;
    const seed = analysis("SEED.JP"); seed.company.country = "JP"; seed.requiredMos = 0.5;
    const missing = analysis("MISSING.JP"); missing.company.country = "JP";
    const noValue = analysis("NOVALUE.JP"); noValue.company.country = "JP"; noValue.valuation = null;
    const all = [...rows, pass, multi, unclear, na, insufficient, costly, seed, missing, noValue];
    const prices: PriceMap = Object.fromEntries(all.filter(row => row !== missing).map(row => [row.id, [50, "2026-09-29"]]));
    prices[costly.id] = [60, "2026-09-29"];
    prices[seed.id] = [50, "2026-09-29", "seed"];
    for (const row of all) row.company.marketCapUsd = null; // This fixture tests gates, not cap/share reconciliation.
    const files = buildOutput({ analyses: all, prices, holdersByTicker: {}, investorNames: {}, fx: {} }).files;
    const funnel = (files["meta.json"] as StoreMeta).funnel!;
    expect(funnel).toMatchObject({ asOf: "2026-09-29", analysed: 14 });
    expect(funnel.gates.map(g => [g.key, g.passing, g.failsOnlyThis])).toEqual([
      ["understandable", 11, 1], ["moat", 9, 1], ["economics", 7, 1],
      ["management", 6, 1], ["accounting", 5, 1], ["price", 2, 1],
    ]);
    expect(funnel.gates.every(g => g.label.length > 0)).toBe(true);
    expect(funnel.byCountry.US).toMatchObject({ asOf: "2026-09-29", analysed: 10 });
    expect(funnel.byCountry.US.gates.map(g => g.passing)).toEqual([7, 5, 3, 2, 1, 1]);
    expect(funnel.byCountry.JP).toMatchObject({ asOf: "2026-09-29", analysed: 4 });
    expect(funnel.byCountry.JP.gates.map(g => [g.passing, g.failsOnlyThis])).toEqual([[4,0],[4,0],[4,0],[4,0],[4,0],[1,1]]);
    expect((files["index/default.json"] as IndexRow[]).length).toBeLessThan(funnel.analysed);
    expect((buildOutput({ analyses: all.reverse(), prices, holdersByTicker: {}, investorNames: {}, fx: {} }).files["meta.json"] as StoreMeta).funnel).toEqual(funnel);
  });

  it("publishes zero counts for an empty snapshot", () => {
    const funnel = (output([])["meta.json"] as StoreMeta).funnel!;
    expect(funnel).toMatchObject({ asOf: null, analysed: 0, byCountry: {} });
    expect(funnel.gates.map(g => [g.passing, g.failsOnlyThis])).toEqual(Array(6).fill([0, 0]));
  });
});

it('publishes English names, logos, about and story counts consistently', () => {
  const a=analysis(); a.company.name='日本語'; a.company.nameEn='English Company'; a.company.nameLocal='日本語';
  a.company.marketCapUsd=70; a.company.logo='https://eodhd.com/img/logo.png'; a.company.about='Makes widgets.';
  const {files}=buildOutput({analyses:[a],holdersByTicker:{},investorNames:{},fx:{},prices:{'KO.US':[70,'2026-09-28']}});
  expect((files['index/default.json'] as IndexRow[])[0]).toMatchObject({n:'English Company',lg:a.company.logo});
  expect((files[`dossiers/${shardOf(a.id)}.json`] as Record<string,Dossier>)[a.id]).toMatchObject({company:{nameEn:'English Company',nameLocal:'日本語',logo:a.company.logo,about:'Makes widgets.'}});
  expect(files['meta.json']).toMatchObject({story:{analysed:1,qualityPasses:1,qualityShare:1,atBuy:1,countriesCovered:1}});
});

it('joins new enrichment and completed numeric history when the controller publishes', async () => {
  const {writeCorpusJson}=await import('@/lib/value/corpus');
  const repo=repository(), a=analysis();
  writeCorpusJson('enrichment-v7/companies/KO.US.json',{nameEn:'English name',nameLocal:'日本語',logo:null,about:'Makes drinks.',nameSource:'eodhd',logoSource:null});
  writeCorpusJson('enrichment-v7/logos/KO.US.json',{logo:'https://eodhd.com/img/logos/US/ko.png'});
  writeCorpusJson('history-v7/20260929/2016.json',[['KO.US','PPPPP',.7,true,2]]);
  writeCorpusJson('history-v7/20260929/index.json',{years:[2016],perYear:{},scope:'universe'});
  publishSnapshot({repo,analyses:[a],universe:[a.company],partial:false,holdersByTicker:{},investorNames:{}});
  const row=JSON.parse(readFileSync(path.join(repo,'index/default.json'),'utf8'))[0];
  expect(row).toMatchObject({n:'English name',lg:'https://eodhd.com/img/logos/US/ko.png'});
  expect(JSON.parse(readFileSync(path.join(repo,`dossiers/${shardOf(a.id)}.json`),'utf8'))[a.id].company).toMatchObject({nameEn:'English name',nameLocal:'日本語',about:'Makes drinks.'});
  expect(JSON.parse(readFileSync(path.join(repo,'history/2016.json'),'utf8'))).toEqual([['KO.US','PPPPP',.7,true,2]]);
});
