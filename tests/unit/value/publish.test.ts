import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildOutput } from "@/lib/value/build-output";
import { corpusDir, writeCorpusJson } from "@/lib/value/corpus";
import { parseYahooPrice, yahooPrice } from "@/lib/value/prices-yahoo";
import { shardOf } from "@/lib/value/shard";
import type { Analysis, Dossier, IndexRow, JevAnswer, StoreMeta, PriceMap } from "@/lib/value/types";
import { syncRepository, acquirePublishLock, resetRepository, loadAnalyses, commitOutput, loadHolders, publishSnapshot, runCalibration, writeOutput } from "@/scripts/value/stages/publish";
import { parseBulkPrices, refreshPrices, commitPrices } from "@/scripts/value/stages/prices";

function analysis(id = "KO.US"): Analysis {
  return {
    id, company: { id, indexes: ["S&P 500"], name: id, code: id.split(".")[0], exchange: id.split(".").at(-1)!, country: "US", currency: "USD", isin: null, cik: null, lei: null, edinetCode: null, sector: "Consumer", industry: null, kind: "operating", listings: [id], marketCapUsd: 100, description: null, source: "eodhd" },
    historyCoverage: {years:11,first:2015,last:2025,source:"fixture"}, asOf: "2026-09-29", status: "scored", report: { id, kind: "description", url: null, filed: null, period: null, sections: [] },
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
  it('keeps completed predecessor years when publication refreshes capital-return series',async()=>{
    const {emptyYear}=await import('@/lib/value/completeness/second-sources');
    const a=analysis('PLX.PA');
    a.predecessorHistory=[{fy:2019,parent:'Sodexo',segment:'Benefits & Rewards Services',basis:'segment',source:'https://example.com/segment',detail:'Segment'}];
    writeCorpusJson(`analysis/${a.id}.json`,a);
    writeCorpusJson(`fundamentals/${a.id}.json`,{id:a.id,currency:'EUR',years:[emptyYear('2025-08-31','EUR')],integrity:{ok:true,reasons:[]}});
    expect(loadAnalyses([a.company])[0].tests.moat.series.totalRoic?.map(([fy])=>fy)).toEqual([2019,2020,2021,2022,2023,2024,2025]);
  });
  it('retains reported NAV when independent share counts reconcile despite a stale market cap',()=>{
    const row=analysis();row.company.investmentHolding=true;
    row.valuation={...row.valuation!,method:'nav',shareSources:2};
    row.company.marketCapUsd=999;
    const result=buildOutput({analyses:[row],holdersByTicker:{},investorNames:{},fx:{},prices:{'KO.US':[80,'2026-10-01']}});
    expect(result.unresolved).toEqual([]);
    expect((result.files['index/US.json'] as IndexRow[])[0].v).toEqual([80,100,120]);
  });
  it('audits newly analysed companies before the first publication exists',async()=>{
    const {auditShares}=await import('@/scripts/value/audit-shares');
    const {writeCorpusJson,readCorpusJson}=await import('@/lib/value/corpus');
    const today=new Date().toISOString().slice(0,10);
    writeCorpusJson('analysis/NEW.US.json',analysis('NEW.US'));
    writeCorpusJson('raw/eodhd/NEW.US.json',{General:{UpdatedAt:today},SharesStats:{SharesOutstanding:100}});
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({timeseries:{result:[{timestamp:[Math.floor(Date.now()/1000)],shares_out:[101]}]}}))));
    await auditShares(undefined,{only:['NEW.US']});
    expect(readCorpusJson('enrichment-v7/share-checks/NEW.US.json')).toMatchObject({status:'verified',shares:101});
    expect(readCorpusJson('staging/share-audit.json')).toMatchObject({quality:{flagged:1,resolved:1,residual:0}});
  });
  it('keeps published filing memo lines when a new research memo omits them',()=>{
    const a=analysis();
    const line={question:6,answer:'European data transfers are highly regulated and litigated.',basis:'filing',evidence:[{quote:'European data transfers are highly regulated and litigated.',url:'https://example.com/report',filed:'2026-01-01',section:'Risk factors'}]};
    writeCorpusJson(`analysis/${a.id}.json`,a);
    writeCorpusJson(`published-memos/${a.id}.json`,{version:1,asOf:'2026-01-01',inputHash:'live',lines:[line]});
    writeCorpusJson(`business-backfill/memos/${a.id}.json`,{version:1,asOf:'2026-10-02',inputHash:'research',lines:[]});
    expect(loadAnalyses([a.company])[0].ownerMemo?.lines).toEqual([line]);
  });
  it("stages existing analyses and cached closes without running calibration or touching the cached repository", async () => {
    const { default: publish } = await import("@/scripts/value/stages/publish");
    const row = analysis(), out = path.join(corpusDir(), "staging");
    writeFileSync(path.join(corpusDir(), "universe.jsonl"), JSON.stringify(row.company) + "\n");
    mkdirSync(path.join(corpusDir(), "analysis"));
    mkdirSync(path.join(corpusDir(), "index-membership"), {recursive:true});
    writeFileSync(path.join(corpusDir(), "index-membership/latest.json"), JSON.stringify({complete:true,memberships:{[row.id]:["S&P 500"]}}));
    const source = JSON.stringify(row);
    writeFileSync(path.join(corpusDir(), "analysis/KO.US.json"), source);
    mkdirSync(path.join(corpusDir(), "publish-repo/prices"), { recursive: true });
    const closes = JSON.stringify({ "KO.US": [60, "2026-09-29"] });
    writeFileSync(path.join(corpusDir(), "publish-repo/prices/US.json"), closes);
    await publish({ out });
    expect(readFileSync(path.join(corpusDir(), "analysis/KO.US.json"), "utf8")).toBe(source);
    expect(readFileSync(path.join(corpusDir(), "publish-repo/prices/US.json"), "utf8")).toBe(closes);
    expect(JSON.parse(readFileSync(path.join(out, "prices/US.json"), "utf8"))["KO.US"]).toEqual([60, "2026-09-29"]);
    expect(existsSync(path.join(out, ".git"))).toBe(false);
    await expect(publish({ out })).rejects.toThrow("new or empty directory");
    writeFileSync(path.join(out, 'audit-note.txt'), 'retain local review evidence');
    writeFileSync(path.join(out, 'dossiers/999.json'), JSON.stringify({'OLD.US':{id:'OLD.US'}}));
    await publish({ out, overwrite: true });
    expect(existsSync(path.join(out, 'dossiers/999.json'))).toBe(false);
    expect(readFileSync(path.join(out, 'audit-note.txt'), 'utf8')).toBe('retain local review evidence');
    expect(JSON.parse(readFileSync(path.join(out,'prices/US.json'),'utf8'))['KO.US']).toEqual([60,'2026-09-29']);
    await expect(publish({ overwrite: true })).rejects.toThrow('requires local --out');
    mkdirSync(path.join(out,'.git'));
    await expect(publish({ out, overwrite: true })).rejects.toThrow('cannot target a git repository');
  });
  it("refuses publication without index membership and excludes nonmembers", async () => {
    const { default: publish } = await import("@/scripts/value/stages/publish");
    const rows=[analysis(),analysis('OBSCURE.US')], out=path.join(corpusDir(),'scoped');
    writeFileSync(path.join(corpusDir(),'universe.jsonl'),rows.map(r=>JSON.stringify(r.company)).join('\n'));
    mkdirSync(path.join(corpusDir(),'analysis'));
    for(const r of rows)writeFileSync(path.join(corpusDir(),`analysis/${r.id}.json`),JSON.stringify(r));
    await expect(publish({out})).rejects.toThrow('Run index-membership');
    mkdirSync(path.join(corpusDir(),'index-membership'));
    writeFileSync(path.join(corpusDir(),'index-membership/latest.json'),JSON.stringify({complete:true,memberships:{'KO.US':['S&P 500']}}));
    await publish({out});
    const index=JSON.parse(readFileSync(path.join(out,'index/US.json'),'utf8'));
    expect(index.map((r:IndexRow)=>r.id)).toEqual(['KO.US']);
  });
  it("writes a local snapshot without requiring or changing a git repository", () => {
    const repo = directory(), row = analysis();
    const result = publishSnapshot({ repo, analyses: [row], universe: [row.company], partial: false, commit: false, holdersByTicker: {}, investorNames: {} });
    expect(result.count).toBe(1);
    expect(JSON.parse(readFileSync(path.join(repo, "meta.json"), "utf8")).counts.analysed).toBe(1);
    expect(existsSync(path.join(repo, ".git"))).toBe(false);
  });
  it("uses cached FX to retain non-USD share-basis verification during publication", () => {
    const repo = directory(), row = analysis("TEST.PA");
    row.company.currency = row.valuation!.currency = "EUR";
    row.company.marketCapUsd = 100;
    mkdirSync(path.join(corpusDir(), "raw/eodhd/universe"), { recursive: true });
    writeFileSync(path.join(corpusDir(), "raw/eodhd/universe/fx-EUR.json"), JSON.stringify({ date: "2026-09-30", data: [{ close: 1.1 }] }));
    mkdirSync(path.join(repo, "prices"));
    writeFileSync(path.join(repo, "prices/US.json"), JSON.stringify({ "TEST.PA": [50, "2026-09-29"] }));
    publishSnapshot({ repo, analyses: [row], universe: [row.company], partial: false, commit: false, holdersByTicker: {}, investorNames: {} });
    const published = JSON.parse(readFileSync(path.join(repo, "index/default.json"), "utf8"))[0];
    expect(published.b).toBe(false);
    expect(published.dataQualityFlags).toBeUndefined();
    expect(published.v).toBeNull();
    expect(JSON.parse(readFileSync(path.join(process.env.VALUE_CORPUS_DIR!,"staging/unresolved-shares.json"),"utf8")).companies).toHaveLength(1);
  });
  it("publishes only all-pass and exact one-fail scored rows by market cap, and shards dossiers", () => {
    const pass = analysis();
    const miss = analysis("AXP.US"); miss.tests.moat.result = "fail"; miss.company.marketCapUsd = 200;
    const insufficient = analysis("BAD.US"); insufficient.status = "insufficient_data";
    const files = output([pass, miss, insufficient]);
    expect((files["index/default.json"] as IndexRow[]).map((row) => row.id)).toEqual(["AXP.US", "KO.US"]);
    expect(files[`dossiers/${shardOf(pass.id)}.json`]).toMatchObject({ "KO.US": { id: "KO.US", series: { revenue: [[2025, 100]] } } });
    expect((files["index/US.json"] as IndexRow[]).find((row) => row.id === "BAD.US")?.st).toBeUndefined();
    expect(files["meta.json"]).toMatchObject({ asOf: "2026-09-29", counts: { universe: 3, scored: 2, insufficient: 0 }, versions: pass.versions });
    expect(files["prices/US.json"]).toEqual({});
  });
  it("keeps unresolved quality rows private; excludes na and multiple failures from the default view", () => {
    const rows = [analysis("U.US"), analysis("N.US"), analysis("F.US")];
    rows[0].tests.moat.result = "unclear"; rows[1].tests.moat.result = "na";
    rows[2].tests.moat.result = "fail"; rows[2].tests.economics.result = "fail";
    expect((output(rows)["index/default.json"] as IndexRow[]).map(r=>r.id)).toEqual([]);
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
    writeFileSync(cli, 'process.exit(process.argv[2] === "calibrate" && process.argv[3] === "--existing" ? 0 : 2);');
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
    expect(search("ax").rows).toContainEqual(["AXP.US", "AXP.US", "US", "a", 100, "AXP.US"]);
    expect(search("pe").rows).toEqual([]);
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
  it("writes fetched US prices even when every Japanese quote fails", async () => {
    const repo = directory();
    mkdirSync(path.join(repo, "prices"));
    const before = '{"KO.US":[70,"2026-09-25"]}';
    writeFileSync(path.join(repo, "prices/US.json"), before);
    const japan = analysis("8058.JP"); japan.company.country = "JP";
    const raw = JSON.parse(readFileSync("tests/fixtures/value/prices/eodhd-US.json", "utf8"));
    await refreshPrices({ repo, companies: [analysis().company, japan.company], bulk: async () => raw, yahoo: async () => { throw new Error("Yahoo HTTP 403"); } });
    expect(JSON.parse(readFileSync(path.join(repo, "prices/US.json"), "utf8"))["KO.US"]).toEqual([87.18, "2026-09-28"]);
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
    expect(paths.split("\n")).toEqual(["meta.json", "prices/US.json"]);
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
    writeOutput({ repo, files: { ...output([analysis()]), "meta.json": { counts: { universe: 60000, analysed: 7, scored: 10, insufficient: 0 } } } });
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
  row.tests.moat.series.totalRoic = Array.from({length:12}, (_, i) => [2014+i, i === 10 ? null : 0.123456]);
  const { files } = buildOutput({ analyses:[row], holdersByTicker:{}, investorNames:{}, fx:{}, prices:{'KO.US':[70,'2026-09-29']}, priceHistories:{'KO.US':[['2025-01',70]]} });
  expect((files['index/US.json'] as IndexRow[])[0]).toMatchObject({m:0.5,r:[0.123,0.123,0.123,0.123,0.123,0.123,0.123,0.123,null,0.123]});
  const dossier = (files[`dossiers/${shardOf(row.id)}.json`] as Record<string,Dossier>)[row.id];
  expect(dossier).toMatchObject({valuation:null,valueHistory:[],priceHistory:[['2025-01',70]],events:row.events,series:row.series});
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
  const row = analysis(); row.tests.moat.series.totalRoic = [[2024,0.15678],[2025,null]];
  expect((output([row])['index/US.json'] as IndexRow[])[0].r).toEqual([null,null,null,null,null,null,null,null,0.157,null]);
  delete row.tests.moat.series.totalRoic; row.tests.moat.series.roe = [[2025,0.2]]; row.company.kind = 'bank';
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
    expect(funnel).toMatchObject({ asOf: "2026-09-29", analysed: 11 });
    expect(funnel.gates.map(g => [g.key, g.passing, g.failsOnlyThis])).toEqual([
      ["understandable", 9, 1], ["moat", 8, 1], ["economics", 7, 1],
      ["management", 6, 1], ["accounting", 5, 1], ["price", 2, 1],
    ]);
    expect(funnel.gates.every(g => g.label.length > 0)).toBe(true);
    expect(funnel.byCountry.US).toMatchObject({ asOf: "2026-09-29", analysed: 7 });
    expect(funnel.byCountry.US.gates.map(g => g.passing)).toEqual([5, 4, 3, 2, 1, 1]);
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
  writeCorpusJson('history-return-prices/KO.US.json',{currency:'USD',fetchedAt:'2026-10-03',prices:[['2016-12',20]],latest:[60,'2026-10-02']});
  publishSnapshot({repo,analyses:[a],universe:[a.company],partial:false,holdersByTicker:{},investorNames:{}});
  const row=JSON.parse(readFileSync(path.join(repo,'index/default.json'),'utf8'))[0];
  expect(row).toMatchObject({n:'English name',lg:'https://eodhd.com/img/logos/US/ko.png'});
  expect(JSON.parse(readFileSync(path.join(repo,`dossiers/${shardOf(a.id)}.json`),'utf8'))[a.id].company).toMatchObject({nameEn:'English name',nameLocal:'日本語',about:'Makes drinks.'});
  expect(JSON.parse(readFileSync(path.join(repo,'history/2016.json'),'utf8'))).toEqual([['KO.US','PPPPP',.7,true,2,null,null,null,{date:'2026-10-02'}]]);
});

it('uses current universe listings consistently across dossier, index and search on republish',()=>{
 const repo=repository(), row=analysis('TEST.JP');
 publishSnapshot({repo,analyses:[row],universe:[{...row.company,listings:['TEST.JP','TESTY.US']}],partial:false,holdersByTicker:{},investorNames:{}});
 const index=JSON.parse(readFileSync(path.join(repo,'index/default.json'),'utf8'));
 const dossiers=JSON.parse(readFileSync(path.join(repo,`dossiers/${shardOf(row.id)}.json`),'utf8'));
 expect(index[0].w).toBe('TESTY.US');
 expect(dossiers[row.id].w).toBe('TESTY.US');
 const meta=JSON.parse(readFileSync(path.join(repo,'meta.json'),'utf8'));
 expect(meta.western.story.analysed).toBe(1);
});


it('refreshes hashed browser views without dropping quotes outside the analysed index', async () => {
  const {refreshPublishedBuyPrices}=await import('@/lib/value/refresh-buy-prices');
  const {publishViews}=await import('@/lib/value/publish-views');
  const repo=directory(),files=output([analysis()]);
  files['prices/US.json']={'KO.US':[60,'2026-09-29'],'UNANALYSED.US':[25,'2026-09-29']};
  publishViews(files);writeOutput({repo,files});
  refreshPublishedBuyPrices(repo);
  expect(JSON.parse(readFileSync(path.join(repo,'prices/US.json'),'utf8'))['UNANALYSED.US']).toEqual([25,'2026-09-29']);
});

it('excludes current nonmembers from current surfaces but retains their historical returns on partial republish',()=>{
 const repo=repository(), member=analysis('KO.US'), excluded=analysis('NOISE.US');
 excluded.company.indexes=[];
 writeCorpusJson('companies/NOISE.US.json',excluded.company);
 writeFileSync(path.join(corpusDir(),'universe.jsonl'),JSON.stringify(excluded.company)+'\n');
 for(const id of [member.id,excluded.id])writeCorpusJson(`history-return-prices/${id}.json`,{currency:'USD',fetchedAt:'2026-10-03',prices:[['2020-12',10]],latest:[20,'2026-10-02']});
 writeCorpusJson('history-v7/index-universe/2020.json',[[member.id,'PPPPP',.5,true,1],[excluded.id,'PPPPP',.2,true,99]]);
 writeCorpusJson('history-v7/index-universe/index.json',{scope:'universe',years:[2020],perYear:{2020:{analysed:2}}});
 publishSnapshot({repo,analyses:[member,excluded],universe:[member.company,excluded.company],partial:false,holdersByTicker:{},investorNames:{}});
 publishSnapshot({repo,analyses:[excluded],universe:[member.company,excluded.company],partial:true,holdersByTicker:{},investorNames:{}});
 const read=(file:string)=>JSON.parse(readFileSync(path.join(repo,file),'utf8'));
 expect(read('meta.json').counts.universe).toBe(1);
 expect(read('meta.json').counts.analysed).toBe(1);
 expect(read('history/2020.json').map((r:any)=>[r[0],r[4]])).toEqual([[member.id,1],[excluded.id,1]]);
 expect(read('history/index.json').perYear['2020']).toMatchObject({analysed:2,qualityPasses:2,medianReturnAll:1,avgReturnAll:1,avgReturnAtBuy:1});
 expect(read('history/index.json').western.perYear['2020'].analysed).toBe(2);
 expect(read(`dossiers/${shardOf(member.id)}.json`)[member.id].company.indexes).toEqual(['S&P 500']);
 const search=readdirSync(path.join(repo,'search')).map(f=>readFileSync(path.join(repo,'search',f),'utf8')).join('');
 expect(search).not.toContain('NOISE.US');
});

it('withholds investment holdings without NAV from indexes and dossiers, including short history',()=>{
 for(const years of [5,11]){
  const row=analysis('III.LSE');row.company.investmentHolding=true;row.valuation=null;
  row.historyCoverage!.years=years;
  const files=output([row]);
  expect(Object.entries(files).filter(([key])=>key.startsWith('dossiers/')).flatMap(([,v])=>Object.keys(v as object))).not.toContain(row.id);
  expect((files['index/default.json'] as IndexRow[]).map(r=>r.id)).not.toContain(row.id);
 }
});

it('publishes every alias of decided companies without shadowing a home dossier',()=>{
 const tsm=analysis('2330.TW'),asml=analysis('ASML.AS'),hidden=analysis('PRIVATE.US');
 tsm.company.listings=['2330.TW','TSM.US','ASML.AS'];asml.company.listings=['ASML.AS','ASML.US'];
 hidden.company.listings=['PRIVATE.US','HIDDEN.US'];hidden.tests.moat.result='unclear';
 expect(output([tsm,asml,hidden])['aliases.json']).toEqual({'TSM.US':'2330.TW','ASML.US':'ASML.AS'});
});
it('retains a neutral dossier when completion crosses seven years but core decade checks remain unresolved',()=>{
 const row=analysis('8411.JP');row.historyCoverage={years:8,first:2019,last:2026,source:'edinet'};
 row.tests.economics.result='unclear';row.tests.economics.numeric='unclear';
 row.tests.economics.reasons=['not enough data for eleven consecutive book observations and ten dividend observations'];
 const files=output([row]);
 expect((files[`dossiers/${shardOf(row.id)}.json`] as Record<string,Dossier>)?.[row.id]).toMatchObject({status:'insufficient_data',valuation:null,b:false});
 expect(files['index/default.json']).toEqual([]);
 const neutral=(files[`dossiers/${shardOf(row.id)}.json`] as Record<string,Dossier>)[row.id];
 expect(neutral.tests.economics.result).toBe('na');
 expect(output([neutral])[`dossiers/${shardOf(row.id)}.json`]).toBeDefined();
});

it('commits regenerated browser views together with refreshed prices',()=>{
 const repo=repository();
 writeOutput({repo,files:output([analysis()])});commitOutput({repo,asOf:'2026-10-01'});
 mkdirSync(path.join(repo,'views'),{recursive:true});
 writeFileSync(path.join(repo,'views/aaaaaaaaaaaaaaaaaaaaaaaa.json'),'{}\n');
 expect(commitPrices({repo,asOf:'2026-10-01'})).toBe(true);
 expect(git(repo,['status','--porcelain'])).toBe('');
});

it('routes a verified NSE symbol to the existing depositary dossier without changing quote units',()=>{
 const a=analysis('RIGD.LSE');a.company.indexes=['Nifty 50'];a.company.country='GB';
 const files=output([a]);
 expect(files['aliases.json']).toMatchObject({'RELIANCE.NSE':'RIGD.LSE'});
 const d=(files[`dossiers/${shardOf(a.id)}.json`] as Record<string,Dossier>)[a.id];
 expect(d.company.currency).toBe('USD');expect(d.company.listings).toEqual(['RIGD.LSE']);
 const ordinary=analysis('RELIANCE.NSE');ordinary.company.currency='INR';
 expect(output([a,ordinary])['aliases.json']).not.toHaveProperty('RELIANCE.NSE');
});

it('stamps every published dossier and index row with the live method',()=>{
 const full=analysis(), short=analysis('SHORT.US');short.historyCoverage!.years=5;
 const files=output([full,short]);
 for(const [file,data] of Object.entries(files)){
  if(file.startsWith('dossiers/'))for(const d of Object.values(data as Record<string,Dossier>))expect(d.methodVersion).toBe('3.2.0');
  if(file.startsWith('index/'))for(const row of data as IndexRow[])expect(row.methodVersion).toBe('3.2.0');
 }
});

it('publishes immutable daily records through orphan commits and reads the forward view from snapshots',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-01T15:00:00Z'));
 const repo=repository(), pick=analysis(), benchmark=analysis('OTHER.US').company;
 pick.company.marketCapUsd=null;
 mkdirSync(path.join(repo,'prices'));
 const prices=(price:number)=>writeFileSync(path.join(repo,'prices/US.json'),JSON.stringify({'KO.US':[price,new Date().toISOString().slice(0,10)],'OTHER.US':[100,new Date().toISOString().slice(0,10)]}));
 prices(50);
 const args={repo,analyses:[pick],universe:[pick.company,benchmark],partial:false,holdersByTicker:{},investorNames:{}};
 publishSnapshot(args);
 const first=readFileSync(path.join(repo,'forward/2026-10-01.json'),'utf8');
 expect(JSON.parse(first)).toMatchObject({picks:{all:['KO.US'],western:['KO.US']},universe:{all:['KO.US','OTHER.US']}});
 publishSnapshot(args);
 expect(readFileSync(path.join(repo,'forward/2026-10-01.json'),'utf8')).toBe(first);
 prices(55);
 publishSnapshot({...args,force:true});
 expect(readFileSync(path.join(repo,'forward/2026-10-01.json'),'utf8')).toBe(first);
 vi.setSystemTime(new Date('2026-10-31T15:00:00Z'));prices(55);
 publishSnapshot(args);
 expect(readFileSync(path.join(repo,'forward/2026-10-01.json'),'utf8')).toBe(first);
 expect(git(repo,['ls-files','forward'])).toContain('forward/2026-10-01.json');
 vi.stubEnv('VALUE_STORE_DIR',repo);
 const {getForwardRecord}=await import('@/lib/value/store');
 const record=await getForwardRecord();
 expect(record).toMatchObject({days:30,snapshots:2});
 expect(record.all.priceReturn).toBeCloseTo(.1);
 expect(record.all.benchmarkPriceReturn).toBeCloseTo(.05);
 const {picks:_picks,...summary}=record;
 expect(summary).toEqual(JSON.parse(readFileSync(path.join(repo,'meta.json'),'utf8')).forward);
});

it('records optional dividend levels only for matching quote dates and carries split basis across provider truncation',async()=>{
 const {forwardFiles}=await import('@/scripts/value/stages/forward');
 const repo=repository(), a=analysis();
 const run=(date:string,price:number)=>{
  const files=output([a]);forwardFiles(repo,files,[a.company],{[a.id]:[price,date]},date);writeOutput({repo,files});
  return files[`forward/${date}.json`] as import('@/lib/value/forward').ForwardSnapshot;
 };
 run('2026-10-01',100);
 writeCorpusJson(`fundamentals/${a.id}.json`,{splits:[{date:'2026-10-02',factor:2}]});
 expect(run('2026-10-02',50).observations[a.id].splitFactor).toBe(2);
 writeCorpusJson(`fundamentals/${a.id}.json`,{splits:[{date:'2026-10-03',factor:3}]});
 writeCorpusJson('forward-total-return/2026-10-03.json',{[a.id]:{value:104,basis:'fixed',currency:'USD',priceDate:'2026-10-02'}});
 const third=run('2026-10-03',100/6);
 expect(third.observations[a.id].splitFactor).toBe(6);
 expect(third.observations[a.id].totalReturn).toBeUndefined();
 writeCorpusJson('forward-total-return/2026-10-04.json',{[a.id]:{value:105,basis:'fixed',currency:'USD',priceDate:'2026-10-04'}});
 expect(run('2026-10-04',100/6).observations[a.id].totalReturn).toEqual({value:105,basis:'fixed'});
});

it('makes short histories searchable and browsable without placing them in investment lists',async()=>{
 const {matchesView}=await import('@/lib/value/view-filter');
 const {unpackView}=await import('@/lib/value/browser-view');
 const row=analysis('PLX.PA');row.historyCoverage={years:5,first:2021,last:2025,source:'fixture'};row.status='insufficient_data';
 const repo=directory();
 publishSnapshot({repo,analyses:[row],universe:[row.company],partial:false,commit:false,holdersByTicker:{},investorNames:{}});
 const read=(file:string)=>JSON.parse(readFileSync(path.join(repo,file),'utf8'));
 const search=readdirSync(path.join(repo,'search')).filter(f=>f!=='manifest.json').flatMap(f=>read(`search/${f}`).rows);
 expect(search.some((r:any)=>r[0]===row.id)).toBe(true);
 const index=read('index/US.json')[0];
 expect(index).toMatchObject({id:row.id,st:'i',t:'UUUUU',b:false,v:null});
 const meta=read('meta.json');
 const browse=[meta.views.current,...meta.views.deferred].flatMap(f=>unpackView(read(f)));
 expect(browse.map(r=>r.id)).toContain(row.id);
 expect(matchesView(browse[0],{gate:'0'})).toBe(true);
 expect(matchesView(browse[0],{near:'1'})).toBe(false);
 expect(matchesView(browse[0],{})).toBe(false);
 expect(read(`dossiers/${shardOf(row.id)}.json`)[row.id]).toMatchObject({status:'insufficient_data',valuation:null,b:false});
});

it('keeps predecessor-backed test verdicts findable when a different test remains undecided',async()=>{
 const {matchesView}=await import('@/lib/value/view-filter');
 const {unpackView}=await import('@/lib/value/browser-view');
 const row=analysis('PLX.PA');row.historyCoverage={years:7,first:2019,last:2025,source:'fixture'};
 row.predecessorHistory=[{fy:2019,parent:'Sodexo',segment:'Benefits & Rewards Services',basis:'segment',source:'https://example.com/annual.pdf',detail:'Underlying operating profit'}];
 row.tests.moat.result=row.tests.moat.numeric='fail';
 row.tests.management.result=row.tests.management.numeric='unclear';
 const repo=directory();publishSnapshot({repo,analyses:[row],universe:[row.company],partial:false,commit:false,holdersByTicker:{},investorNames:{}});
 const read=(file:string)=>JSON.parse(readFileSync(path.join(repo,file),'utf8'));
 expect(readdirSync(path.join(repo,'search')).filter(f=>f!=='manifest.json').flatMap(f=>read(`search/${f}`).rows).some((r:any)=>r[0]===row.id)).toBe(true);
 expect(read(`dossiers/${shardOf(row.id)}.json`)[row.id]).toMatchObject({status:'scored',tests:{moat:{result:'fail'},management:{result:'unclear'}},predecessorHistory:row.predecessorHistory});
 const index=read('index/US.json')[0];expect(index).toMatchObject({t:'PFPUP',b:false});
 const meta=read('meta.json'),browse=[meta.views.current,...meta.views.deferred].flatMap(f=>unpackView(read(f)));
 expect(matchesView(browse[0],{gate:'0'})).toBe(true);expect(matchesView(browse[0],{near:'1'})).toBe(false);
});
