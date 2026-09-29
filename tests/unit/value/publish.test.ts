import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildOutput } from "@/lib/value/build-output";
import { corpusDir } from "@/lib/value/corpus";
import { shardOf } from "@/lib/value/shard";
import type { Analysis, Dossier, IndexRow, JevAnswer } from "@/lib/value/types";
import { commitOutput, loadHolders, publishSnapshot, runCalibration, writeOutput } from "@/scripts/value/stages/publish";
import { parseBulkPrices, parseStooqPrice, refreshPrices, commitPrices } from "@/scripts/value/stages/prices";

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
afterEach(() => { vi.unstubAllGlobals(); for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true }); });
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
  it("excludes unclear, na and multiple failures from the default", () => {
    const rows = [analysis("U.US"), analysis("N.US"), analysis("F.US")];
    rows[0].tests.moat.result = "unclear"; rows[1].tests.moat.result = "na";
    rows[2].tests.moat.result = "fail"; rows[2].tests.economics.result = "fail";
    expect(output(rows)["index/default.json"]).toEqual([]);
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
    writeOutput({ repo, files: output([analysis(), analysis("AXP.US"), analysis("DELISTED.US")]) });
    commitOutput({ repo, asOf: "2026-09-29" });
    const updated = analysis(); updated.tests.moat.result = "fail";
    publishSnapshot({ repo, analyses: [updated], universeIds: ["KO.US", "AXP.US"], partial: true, holdersByTicker: {}, investorNames: {} });
    const rows = JSON.parse(readFileSync(path.join(repo, "index/default.json"), "utf8")) as IndexRow[];
    expect(rows.map((row) => [row.id, row.t])).toEqual([["AXP.US", "PPPPP"], ["KO.US", "PFPPP"]]);
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
  it("reads the latest valid Japanese daily close and rejects access-denied or no-data responses", () => {
    expect(parseStooqPrice("Date,Open,High,Low,Close,Volume\r\n2026-09-25,1,2,1,2,100\r\n2026-09-28,2,4,2,3,200\r\n")).toEqual([3, "2026-09-28"]);
    expect(() => parseStooqPrice("No data")).toThrow();
    expect(() => parseStooqPrice(readFileSync("tests/fixtures/value/prices/stooq-8058-response.txt", "utf8"))).toThrow();
  });
  it("does not write fetched US prices when the Japanese provider fails", async () => {
    const repo = directory();
    mkdirSync(path.join(repo, "prices"));
    const before = '{"KO.US":[70,"2026-09-25"]}';
    writeFileSync(path.join(repo, "prices/US.json"), before);
    const japan = analysis("8058.JP"); japan.company.country = "JP";
    const raw = JSON.parse(readFileSync("tests/fixtures/value/prices/eodhd-US.json", "utf8"));
    await expect(refreshPrices({ repo, companies: [analysis().company, japan.company], bulk: async () => raw, stooq: async () => { throw new Error("Stooq HTTP 403"); } })).rejects.toThrow("Stooq HTTP 403");
    expect(readFileSync(path.join(repo, "prices/US.json"), "utf8")).toBe(before);
  });
  it("routes Japanese companies to Stooq and separates same-country exchanges", async () => {
    const repo = directory();
    const japan = analysis("8058.JP"); japan.company.country = "JP";
    const uk = analysis("KO.L"); uk.company.country = "GB";
    await refreshPrices({ repo, companies: [analysis().company, japan.company, uk.company],
      bulk: async (exchange) => [{ code: "KO", date: "2026-09-28", close: exchange === "US" ? 70 : 150 }],
      stooq: async () => [3400, "2026-09-28"],
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
    expect(paths).toBe("prices/US.json");
    await refreshPrices({ repo, companies: [analysis().company], bulk: async () => raw });
    expect(commitPrices({ repo, asOf: "2026-09-29" })).toBe(false);
  });
});
