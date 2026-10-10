import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildOutput } from "@/lib/value/build-output";
import { PIPELINE_VERSION } from '@/lib/value/analyze-company';
import { QUESTIONS_VERSION } from '@/lib/value/jev/questions';
import { corpusDir, readCorpusJson, writeCorpusJson } from "@/lib/value/corpus";
import { parseYahooPrice, yahooPrice } from "@/lib/value/prices-yahoo";
import { shardOf } from "@/lib/value/shard";
import { baselineAnalysisHash } from '@/scripts/value/coverage-release';
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
    valuationReason: null, versions: { pipeline: PIPELINE_VERSION, questions: QUESTIONS_VERSION },
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
  it('preserves frozen identities and aliases in newly split search children',async()=>{
    const {readVerdictFreeze,applyVerdictFreeze}=await import('@/scripts/value/verdict-freeze');
    const a=analysis(),baseline=output([a]);
    const row=[a.id,'Original name','US','a',100,a.id];
    baseline['search/manifest.json']={version:1,split:[],maxPrefix:2};
    baseline['search/us.json']={rows:[row],aliases:{'us-company':[0]}};
    for(const [file,data]of Object.entries(baseline))writeCorpusJson(`publish-repo/${file}`,data);
    const freeze=readVerdictFreeze(path.join(corpusDir(),'publish-repo'),{all:true});
    const files={...output([a]),'search/manifest.json':{version:1,split:['us'],maxPrefix:3},'search/us.json':{rows:[],aliases:{}},'search/us-.json':{rows:[[a.id,'Changed name','US','a',999,a.id]],aliases:{'us-company':[0]}}};
    expect(()=>applyVerdictFreeze(structuredClone(files),freeze)).toThrow(/routing changed/);
    applyVerdictFreeze(files,freeze,{extendSearch:true});
    expect(files['search/us-.json']).toEqual({rows:[row],aliases:{'us-company':[0]}});
    expect(files['search/us.json']).toEqual({rows:[row],aliases:{'us-company':[0]}});
  });
  it('includes analysed multiple-failure companies in deferred list views',async()=>{
    const {publishViews}=await import('@/lib/value/publish-views');
    const {unpackView}=await import('@/lib/value/browser-view');
    const a=analysis('PLXS.US');a.tests.moat.result='fail';a.tests.moat.numeric='fail';a.tests.economics.result='fail';a.tests.economics.numeric='fail';
    const files=output([a]);
    const manifest=publishViews(files);
    const rows=[manifest.current,...(manifest.deferred??[])].flatMap(file=>unpackView(files[file] as Parameters<typeof unpackView>[0]));
    expect(rows.map(r=>r.id)).toContain('PLXS.US');
  });
  it('adds a held nonmember locally while preserving every existing dossier and country row',async()=>{
    const {default:publish}=await import('@/scripts/value/stages/publish');
    const old=analysis('KO.US'),addition=analysis('PLXS.US');
    addition.company.indexes=[];addition.company.heldBySuperinvestors=true;
    const baseline=output([old]);
    for(const [file,data]of Object.entries(baseline))writeCorpusJson(`publish-repo/${file}`,data);
    const before=readFileSync(path.join(corpusDir(),`publish-repo/dossiers/${shardOf(old.id)}.json`),'utf8');
    writeCorpusJson('analysis/KO.US.json',{...old,asOf:'2099-01-01',company:{...old.company,marketCapUsd:999}});
    writeCorpusJson('analysis/PLXS.US.json',addition);
    writeFileSync(path.join(corpusDir(),'universe.jsonl'),JSON.stringify(old.company)+'\n');
    writeCorpusJson('index-membership/latest.json',{complete:true,memberships:{'KO.US':['S&P 500']}});
    writeCorpusJson('held-membership/latest.json',{version:1,companies:[addition.company],ledger:[],quarters:[]});
    const out=path.join(corpusDir(),'candidate');
    await publish({out,additionsOnly:true});
    const dossiers=JSON.parse(readFileSync(path.join(out,`dossiers/${shardOf(old.id)}.json`),'utf8'));
    expect(dossiers[old.id]).toEqual(JSON.parse(before)[old.id]);
    expect(JSON.parse(readFileSync(path.join(out,'index/US.json'),'utf8')).find((r:IndexRow)=>r.id===old.id)).toEqual((baseline['index/US.json'] as IndexRow[])[0]);
    expect(JSON.parse(readFileSync(path.join(out,`dossiers/${shardOf(addition.id)}.json`),'utf8'))[addition.id]).toBeDefined();
    expect(readFileSync(path.join(corpusDir(),`publish-repo/dossiers/${shardOf(old.id)}.json`),'utf8')).toBe(before);
    await expect(publish({additionsOnly:true})).rejects.toThrow(/requires.*--out/);
  });
  it('ordinary publication consumes coverage scope, freezes baseline and holds incomplete additions',async()=>{
    const {default:publish}=await import('@/scripts/value/stages/publish');
    const {baselineAnalysisHash}=await import('@/scripts/value/coverage-release');
    const old=analysis('KO.US'),addition=analysis('PLXS.US'),held=analysis('HELD.US');
    addition.company.indexes=[];addition.company.heldBySuperinvestors=true;
    held.company.indexes=[];held.company.heldBySuperinvestors=true;
    addition.report={...addition.report,kind:'10-K',sections:['business']};
    addition.ownerMemo={version:1,asOf:addition.asOf,inputHash:'current-input',lines:[]} as any;
    const baseline=output([old]);
    for(const [file,data]of Object.entries(baseline))writeCorpusJson(`publish-repo/${file}`,data);
    writeCorpusJson('verdict-freeze.json',{version:1,ids:[]});

    writeCorpusJson('analysis/KO.US.json',{...old,asOf:'2099-01-01',company:{...old.company,marketCapUsd:999}});
    writeCorpusJson('held-membership/release.json',{version:1,baselineIds:[old.id],baselineAnalysisHashes:{[old.id]:baselineAnalysisHash(old.id)},additionIds:[addition.id],held:[{id:held.id,reasons:['full-filing']}]});
    for(const a of [addition,held])writeCorpusJson(`analysis/${a.id}.json`,a);
    writeCorpusJson('fundamentals/PLXS.US.json',{years:[{year:2025,end:'2025-12-31'}]});
    writeCorpusJson('reports/PLXS.US/meta.json',addition.report);
    writeCorpusJson('analysis/inputs/PLXS.US.json',{asOf:addition.asOf,sections:{business:'Annual filing'}});
    writeCorpusJson('prices-history/PLXS.US.json',[['2026-09',10]]);
    writeCorpusJson('prices/US.json',{'PLXS.US':[10,new Date().toISOString().slice(0,10)]});
    writeFileSync(path.join(corpusDir(),'universe.jsonl'),JSON.stringify(old.company)+'\n');
    writeCorpusJson('index-membership/latest.json',{complete:true,memberships:{'KO.US':['S&P 500']}});
    writeCorpusJson('held-membership/latest.json',{version:1,companies:[addition.company,held.company],ledger:[],quarters:[]});
    const out=path.join(corpusDir(),'candidate');
    await publish({out});
    const dossier=(id:string)=>JSON.parse(readFileSync(path.join(out,`dossiers/${shardOf(id)}.json`),'utf8'))[id];
    expect(dossier(old.id)).toEqual((baseline[`dossiers/${shardOf(old.id)}.json`] as any)[old.id]);
    expect(dossier(addition.id)).toBeDefined();
    const ids=readdirSync(path.join(out,'dossiers')).flatMap(f=>Object.keys(JSON.parse(readFileSync(path.join(out,'dossiers',f),'utf8'))));
    expect(ids.sort()).toEqual([old.id,addition.id].sort());
    // A missing input must abort, even if the id was previously approved.
    writeCorpusJson('reports/PLXS.US/meta.json',{kind:'description',sections:[]});
    await expect(publish({out:path.join(corpusDir(),'incomplete')})).rejects.toThrow(/incomplete.*full-filing/);
  });
  it('ordinary local publication preserves the baseline when every proposed addition remains held',async()=>{
    const {default:publish}=await import('@/scripts/value/stages/publish');
    const old=analysis('KO.US'),held=analysis('HELD.US');
    held.company.indexes=[];held.company.heldBySuperinvestors=true;
    const baseline=output([old]);
    for(const [file,data]of Object.entries(baseline))writeCorpusJson(`publish-repo/${file}`,data);
    writeCorpusJson('analysis/KO.US.json',old);
    writeCorpusJson('analysis/HELD.US.json',held);
    writeCorpusJson('held-membership/release.json',{version:1,baselineIds:[old.id],baselineAnalysisHashes:{[old.id]:baselineAnalysisHash(old.id)},additionIds:[],held:[{id:held.id,reasons:['full-filing']}]});
    writeFileSync(path.join(corpusDir(),'universe.jsonl'),JSON.stringify(old.company)+'\n');
    writeCorpusJson('index-membership/latest.json',{complete:true,memberships:{'KO.US':['S&P 500']}});
    writeCorpusJson('held-membership/latest.json',{version:1,companies:[held.company],ledger:[],quarters:[]});
    const out=path.join(corpusDir(),'all-held');
    await publish({out});
    const dossiers=Object.assign({},...readdirSync(path.join(out,'dossiers')).map(f=>JSON.parse(readFileSync(path.join(out,'dossiers',f),'utf8'))));
    expect(Object.keys(dossiers)).toEqual([old.id]);
    expect(dossiers[old.id]).toEqual((baseline[`dossiers/${shardOf(old.id)}.json`] as any)[old.id]);
    expect(JSON.parse(readFileSync(path.join(out,'index/US.json'),'utf8'))).toEqual(baseline['index/US.json']);
  });
  it('rejects an obsolete analysis before creating a candidate or refreshing returns', async()=>{
    const {default:publish}=await import('@/scripts/value/stages/publish');
    const a=analysis();a.versions.pipeline='obsolete';
    writeCorpusJson('analysis/KO.US.json',a);
    writeFileSync(path.join(corpusDir(),'universe.jsonl'),JSON.stringify(a.company)+'\n');
    writeCorpusJson('index-membership/latest.json',{complete:true,memberships:{'KO.US':['S&P 500']}});
    const out=path.join(corpusDir(),'candidate');
    await expect(publish({out})).rejects.toThrow(/Run analyze.*KO.US/);
    expect(existsSync(out)).toBe(false);
    expect(existsSync(path.join(corpusDir(),'history-return-prices/report.json'))).toBe(false);
  });
  it('uses enriched identities for search and historical identities with the same live since refresh', async()=>{
    const {default:publish}=await import('@/scripts/value/stages/publish');
    const a=analysis();const universe={...a.company,marketCapUsd:null};
    writeCorpusJson('analysis/KO.US.json',a);
    writeFileSync(path.join(corpusDir(),'universe.jsonl'),JSON.stringify(universe)+'\n');
    writeCorpusJson('companies/KO.US.json',a.company);
    writeCorpusJson('index-membership/latest.json',{complete:true,memberships:{'KO.US':['S&P 500']}});
    writeCorpusJson('history-v7/run/index.json',{scope:'universe',years:[],quarters:['2018Q3'],perYear:{},perQuarter:{}});
    writeCorpusJson('history-v7/run/2018Q3.json',[[a.id,'PPPPP',.8,true,99]]);
    writeCorpusJson('history-return-prices/KO.US.json',{currency:'USD',fetchedAt:new Date().toISOString().slice(0,10),prices:[['2018-09',10]],latest:[25,'2026-10-02']});
    const out=path.join(corpusDir(),'candidate');await publish({out});
    const history=JSON.parse(readFileSync(path.join(out,'history/companies.json'),'utf8'));
    expect(history[0].mc).toBe(100);
    const shards=readdirSync(path.join(out,'search')).filter(f=>f!=='manifest.json').flatMap(f=>JSON.parse(readFileSync(path.join(out,'search',f),'utf8')).rows);
    expect(shards.length).toBeGreaterThan(0);
    expect(shards.every(r=>r[4]===100)).toBe(true);
    expect(JSON.parse(readFileSync(path.join(out,'history/2018Q3.json'),'utf8'))).toEqual([[a.id,'PPPPP',.8,true,1.5,null,null,null,{date:'2026-10-02'}]]);
  });
  it('publishes cached history returns when the refresh provider fails, and stops without any cache', async()=>{
    const {default:publish}=await import('@/scripts/value/stages/publish');
    const a=analysis();
    writeCorpusJson('analysis/KO.US.json',a);
    writeFileSync(path.join(corpusDir(),'universe.jsonl'),JSON.stringify(a.company)+'\n');
    writeCorpusJson('index-membership/latest.json',{complete:true,memberships:{'KO.US':['S&P 500']}});
    writeCorpusJson('history-v7/run/index.json',{scope:'universe',years:[],quarters:['2018Q3'],perYear:{},perQuarter:{}});
    writeCorpusJson('history-v7/run/2018Q3.json',[[a.id,'PPPPP',.8,true,.1]]);
    const request=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('provider down'));
    try{
      const out=path.join(corpusDir(),'candidate');
      await expect(publish({out})).rejects.toThrow(/History return prices unavailable for KO.US/);
      writeCorpusJson('history-return-prices/KO.US.json',{currency:'USD',fetchedAt:'2026-10-06',prices:[['2018-09',10]],latest:[25,'2026-10-02']});
      await publish({out});
      expect(JSON.parse(readFileSync(path.join(out,'history/2018Q3.json'),'utf8'))).toEqual([[a.id,'PPPPP',.8,true,1.5,null,null,null,{date:'2026-10-02'}]]);
      expect(readCorpusJson<{failed:Array<{id:string}>}>('history-return-prices/report.json')?.failed.map(f=>f.id)).toEqual(['KO.US']);
    }finally{request.mockRestore();}
  });
  it('does not replace a released filing answer with a computed price-story fallback',()=>{
    const a=analysis();
    a.tests.moat.series.grossMargin=[[2021,.4],[2022,.4],[2023,.4]];
    const line={question:3,answer:'Contract terms allow annual price adjustments.',basis:'filing',evidence:[{quote:'Contract terms allow annual price adjustments.',url:'https://example.com/report',filed:'2026-01-01',section:'Business'}]};
    writeCorpusJson('analysis/KO.US.json',a);
    writeCorpusJson('published-memos/KO.US.json',{version:1,asOf:'2026-01-01',inputHash:'live',lines:[line]});
    expect(loadAnalyses([a.company])[0].ownerMemo?.lines.find(l=>l.question===3)).toEqual(line);
  });
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
  it('does not replace reanalysed inputs with an older backfill memo',()=>{
    const a=analysis();
    a.ownerMemo={version:1,asOf:a.asOf,inputHash:'corrected-inputs',lines:[]};
    writeCorpusJson(`analysis/${a.id}.json`,a);
    writeCorpusJson(`business-backfill/memos/${a.id}.json`,{version:1,asOf:'2026-09-28',inputHash:'old-inputs',lines:[]});
    expect(loadAnalyses([a.company])[0].ownerMemo?.inputHash).toBe('corrected-inputs');
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
    const priorRecord = {date:'2026-09-28',methodVersion:'fixture',picks:{all:[],western:[]},universe:{all:[],western:[]},observations:{}};
    writeCorpusJson('publish-repo/forward/2026-09-28.json', priorRecord);
    await publish({ out });
    expect(JSON.parse(readFileSync(path.join(out, 'forward/2026-09-28.json'), 'utf8'))).toEqual(priorRecord);
    expect(JSON.parse(readFileSync(path.join(out, 'forward/index.json'), 'utf8')).dates).toContain('2026-09-28');
    expect(JSON.parse(readFileSync(path.join(corpusDir(), 'publish-repo/forward/2026-09-28.json'), 'utf8'))).toEqual(priorRecord);
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
    writeFileSync(path.join(repo, 'meta.json'), '{}');
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
  it("stages a partial snapshot but refuses a delisting drop beyond the five-company floor", () => {
    const repo = repository();
    const axp = analysis("AXP.US"); axp.valuation!.shares = 2; // cap 100 = quote 50 × shares 2
    writeOutput({ repo, files: output([analysis(), axp, analysis("DELISTED.US"),...Array.from({length:5},(_,i)=>analysis(`DELISTED${i}.US`))]) });
    commitOutput({ repo, asOf: "2026-09-29" });
    mkdirSync(path.join(corpusDir(), "prices"), { recursive: true });
    writeFileSync(path.join(corpusDir(), "prices/US.json"), JSON.stringify({ "AXP.US": [50, "2026-09-29", "seed"] }));
    mkdirSync(path.join(repo, "search"), { recursive: true });
    writeFileSync(path.join(repo, "search/a.json"), "{}");
    const updated = analysis(); updated.tests.moat.result = "fail";
    expect(() => publishSnapshot({ repo, analyses: [updated], universe: ["KO.US", "AXP.US", "PENDING.US"].map(id => analysis(id).company), partial: true, force: true, holdersByTicker: {}, investorNames: {} })).toThrow(/invariant.*dossiers/i);
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
  // Recorded quotes must not age out as the wall clock advances.
  const now = Date.parse("2026-09-29T12:00:00Z");
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
    await refreshPrices({ now, repo, companies, yahoo: async company => {
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
    await refreshPrices({ now, repo, companies: [analysis().company, japan.company], bulk: async () => raw, yahoo: async () => { throw new Error("Yahoo HTTP 403"); } });
    expect(JSON.parse(readFileSync(path.join(repo, "prices/US.json"), "utf8"))["KO.US"]).toEqual([87.18, "2026-09-28"]);
  });
  it("routes Japanese companies to Yahoo and separates same-country exchanges", async () => {
    const repo = directory();
    const japan = analysis("8058.JP"); japan.company.country = "JP";
    const uk = analysis("KO.L"); uk.company.country = "GB";
    await refreshPrices({ now, repo, companies: [analysis().company, japan.company, uk.company],
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
    await refreshPrices({ now, repo, companies: [analysis().company, analysis("BRK-B.US").company], bulk: async () => raw });
    expect(JSON.parse(readFileSync(path.join(repo, "prices/US.json"), "utf8"))).toEqual({ "OTHER.US": [5, "2026-09-28"], "KO.US": [87.18, "2026-09-28"], "BRK-B.US": [999, "2026-09-29"] });
    expect(readFileSync(path.join(repo, "prices/JP.json"), "utf8")).toBe('{"8058.JP":[1,"2026-09-28"]}\n');
    expect(commitPrices({ repo, asOf: "2026-09-29" })).toBe(true);
    expect(git(repo, ["rev-list", "--count", "HEAD"])).toBe("3");
    const paths = git(repo, ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]);
    expect(paths.split("\n")).toEqual(["meta.json", "prices/US.json"]);
    await refreshPrices({ now, repo, companies: [analysis().company], bulk: async () => raw });
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
    expect(output([old, analysis("A.US"), analysis("B.US")])["meta.json"]).toMatchObject({ versions: { pipeline: PIPELINE_VERSION, questions: QUESTIONS_VERSION, other: 1 } });
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
  it("compares published count rather than universe while admitting additions with logos", () => {
    const repo = repository();
    writeOutput({ repo, files: { ...output([analysis()]), "meta.json": { counts: { universe: 60000, analysed: 7, scored: 10, insufficient: 0 } } } });
    commitOutput({ repo, asOf: "2026-09-29" });
    const analyses = Array.from({ length: 8 }, (_, i) => {const a=analysis(`${i}.US`);a.company.logo="https://example.com/logo.png";return a;});
    expect(publishSnapshot({ repo, analyses, universe: analyses.map(row => row.company), partial: false, holdersByTicker: {}, investorNames: {} }).count).toBe(8);
  });
  it("guards legacy metadata and rejects even a forced empty commit", () => {
    const repo = repository();
    writeOutput({ repo, files: { ...output([analysis()]), "meta.json": { counts: { universe: 10, scored: 8, insufficient: 2 } } } });
    commitOutput({ repo, asOf: "2026-09-29" });
    const args = { repo, analyses: [], universe: [], partial: false, holdersByTicker: {}, investorNames: {} };
    expect(() => publishSnapshot(args)).toThrow(/--force/);
    expect(() => publishSnapshot({ ...args, force: true })).toThrow(/invariant.*dossiers/i);
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
  if(file.startsWith('dossiers/'))for(const d of Object.values(data as Record<string,Dossier>))expect(d.methodVersion).toBe('3.7.1');
  if(file.startsWith('index/'))for(const row of data as IndexRow[])expect(row.methodVersion).toBe('3.7.1');
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

it('blocks a previously published member disappearing when refreshed analysis becomes undecided',()=>{
 const repo=directory(), old=analysis();
 writeOutput({repo,files:output([old])});
 const before=readFileSync(path.join(repo,`dossiers/${shardOf(old.id)}.json`),'utf8');
 const refreshed=structuredClone(old);
 refreshed.tests.accounting.result='unclear';refreshed.tests.accounting.numeric='unclear';
 refreshed.tests.accounting.reasons=['missing cash flow after refresh'];
 expect(()=>publishSnapshot({repo,analyses:[refreshed],universe:[old.company],partial:false,commit:false,holdersByTicker:{},investorNames:{}})).toThrow(/previously published.*KO.US/i);
 expect(readFileSync(path.join(repo,`dossiers/${shardOf(old.id)}.json`),'utf8')).toBe(before);
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

it('freezes the live dossier, every index/history row and search identity in normal and local publication, and unfreezes by removal', async()=>{
 const {default:publish}=await import('@/scripts/value/stages/publish');
 const old=analysis(), next=analysis('PEP.US'), live=path.join(corpusDir(),'publish-repo');
 mkdirSync(live);
 publishSnapshot({repo:live,analyses:[old,next],universe:[old.company,next.company],partial:false,commit:false,holdersByTicker:{},investorNames:{}});
 mkdirSync(path.join(live,'history'));
 const historyRow=[old.id,'PPPPP',0.5,true,23];
 writeFileSync(path.join(live,'history/2025.json'),JSON.stringify([historyRow])+'\n');
 const snapshot=Object.fromEntries(['dossiers','index','search','history'].flatMap(dir=>readdirSync(path.join(live,dir)).map(f=>[`${dir}/${f}`,readFileSync(path.join(live,dir,f),'utf8')])));
 writeCorpusJson('verdict-freeze.json',{version:1,ids:[old.id]});
 old.versions.pipeline='obsolete'; // The released record, not this cache, owns a frozen company.
 old.company.name='Unverified renamed issuer';old.company.country='CA';old.tests.moat.result=old.tests.moat.numeric='fail';
 next.tests.management.result=next.tests.management.numeric='fail';
 writeFileSync(path.join(corpusDir(),'universe.jsonl'),[old.company,next.company].map(c=>JSON.stringify(c)).join('\n')+'\n');
 writeCorpusJson('index-membership/latest.json',{complete:true,memberships:{[old.id]:['S&P 500'],[next.id]:['S&P 500']}});
 for(const a of [old,next])writeCorpusJson(`analysis/${a.id}.json`,a);
 // A fresh local --out must take its freeze from publish-repo, never from its empty destination.
 const out=path.join(corpusDir(),'out');await publish({out});
 const read=(root:string,file:string)=>JSON.parse(readFileSync(path.join(root,file),'utf8'));
 const frozen=JSON.parse(snapshot[`dossiers/${shardOf(old.id)}.json`])[old.id];
 for(const root of [out,live]){
  if(root===live)publishSnapshot({repo:live,analyses:[old,next],universe:[old.company,next.company],partial:false,commit:false,holdersByTicker:{},investorNames:{}});
  expect(JSON.stringify(read(root,`dossiers/${shardOf(old.id)}.json`)[old.id])).toBe(JSON.stringify(frozen));
  for(const [file,text]of Object.entries(snapshot)){
   const prior=JSON.parse(text);
   if(file==='index/US.json')expect(read(root,file).map((r:any)=>r.id)).toEqual(prior.map((r:any)=>r.id));
   if(file.startsWith('index/')||file==='history/companies.json')expect(read(root,file).filter((r:any)=>r.id===old.id)).toEqual(prior.filter((r:any)=>r.id===old.id));
   if(file==='history/2025.json')expect(read(root,file).filter((r:any)=>r[0]===old.id)).toEqual([historyRow]);
   if(file.startsWith('search/')&&file!=='search/manifest.json')expect(read(root,file).rows.filter((r:any)=>r[0]===old.id)).toEqual(prior.rows.filter((r:any)=>r[0]===old.id));
  }
  expect(read(root,`dossiers/${shardOf(next.id)}.json`)[next.id].tests.management.result).toBe('fail');
 }
 expect(readFileSync(path.join(corpusDir(),'staging/verdict-freeze.jsonl'),'utf8')).toContain('unresolved data-quality check');
 expect(readdirSync(out)).not.toContain('verdict-freeze.jsonl');
 writeCorpusJson('verdict-freeze.json',{version:1,ids:[]});
 publishSnapshot({repo:live,analyses:[old,next],universe:[old.company,next.company],partial:false,commit:false,holdersByTicker:{},investorNames:{}});
 expect(read(live,`dossiers/${shardOf(old.id)}.json`)[old.id].tests.moat.result).toBe('fail');
});

it('rejects a freeze without its previous live dossier before writing output',()=>{
 const repo=directory(),a=analysis();writeCorpusJson('verdict-freeze.json',{version:1,ids:[a.id]});
 expect(()=>publishSnapshot({repo,analyses:[a],universe:[a.company],partial:false,commit:false,holdersByTicker:{},investorNames:{}})).toThrow(/Frozen.*KO.US.*missing/i);
 expect(readdirSync(repo)).toEqual([]);
});

it('uses current issuer shares for the cap check instead of last annual diluted shares',()=>{
 const a=analysis();a.company.marketCapUsd=6000;a.valuation!.shares=110;a.valuation!.normalized=1100;
 const repo=directory();mkdirSync(path.join(repo,'prices'));writeFileSync(path.join(repo,'prices/US.json'),JSON.stringify({[a.id]:[60,'2026-10-02']}));
 writeCorpusJson(`raw/eodhd/${a.id}.json`,{General:{Type:'Common Stock',CurrencyCode:'USD',UpdatedAt:'2026-10-02'},SharesStats:{SharesOutstanding:100},Highlights:{MarketCapitalization:6000},Financials:{Balance_Sheet:{quarterly:{'2026-06-30':{commonStockSharesOutstanding:'101'}}}}});
 publishSnapshot({repo,analyses:[a],universe:[a.company],partial:false,commit:false,holdersByTicker:{},investorNames:{}});
 const d=JSON.parse(readFileSync(path.join(repo,`dossiers/${shardOf(a.id)}.json`),'utf8'))[a.id];
 expect(d.tests.price?.result).toBe('pass');expect(d.valuation.shares).toBe(110);
});

it('replaces a dated vendor cap with the current quote times supported issuer shares',()=>{
 const a=analysis();a.company.marketCapUsd=5700;a.valuation!.shares=100;a.valuation!.normalized=1000;
 const repo=directory();mkdirSync(path.join(repo,'prices'));writeFileSync(path.join(repo,'prices/US.json'),JSON.stringify({[a.id]:[60,'2026-10-02']}));
 writeCorpusJson(`raw/eodhd/${a.id}.json`,{General:{Type:'Common Stock',CurrencyCode:'USD',UpdatedAt:'2026-10-01'},SharesStats:{SharesOutstanding:100},Highlights:{MarketCapitalization:5700},Financials:{Balance_Sheet:{quarterly:{'2026-06-30':{commonStockSharesOutstanding:'100'}}}}});
 publishSnapshot({repo,analyses:[a],universe:[a.company],partial:false,commit:false,holdersByTicker:{},investorNames:{}});
 const d=JSON.parse(readFileSync(path.join(repo,`dossiers/${shardOf(a.id)}.json`),'utf8'))[a.id];
 expect(d.company.marketCapUsd).toBe(6000);expect(d.tests.price?.result).toBe('pass');
 expect(JSON.parse(readFileSync(path.join(repo,'index/US.json'),'utf8'))[0].mc).toBe(6000);
});

it('retains supported shares while publishing quality driven Buy changes and repricing later quotes',async()=>{
 const a=analysis();a.company.marketCapUsd=null;
 const repo=directory();mkdirSync(path.join(repo,'prices'));writeFileSync(path.join(repo,'prices/US.json'),JSON.stringify({[a.id]:[50,'2026-10-01']}));
 const run=()=>publishSnapshot({repo,analyses:[a],universe:[a.company],partial:false,commit:false,holdersByTicker:{},investorNames:{}});
 const read=()=>JSON.parse(readFileSync(path.join(repo,`dossiers/${shardOf(a.id)}.json`),'utf8'))[a.id];
 run();const old=read().tests.price;expect(old.result).toBe('pass');
 a.valuation!.assumptions=['current share sources disagree by more than 1.5x; share count not corrected'];run();
 expect(read().b).toBe(true);
 a.tests.moat.result='fail';run();
 expect(read().tests.price).toEqual(old);expect(read().tests.moat.result).toBe('fail');expect(read().b).toBe(false);
 expect(read().valuation.publishedShareReview).toBe(true);
 expect(read().priceTestFreeze).toBeUndefined();
 const {refreshPublishedBuyPrices}=await import('@/lib/value/refresh-buy-prices');
 writeFileSync(path.join(repo,'prices/US.json'),JSON.stringify({[a.id]:[500,'2026-10-02']}));refreshPublishedBuyPrices(repo);
 expect(read().tests.price.result).toBe('fail');expect(read().b).toBe(false);
 // Resolving the evidence resumes calculation; a freeze is not permanent.
 a.valuation!.assumptions=[];run();expect(read().tests.price.result).toBe('fail');expect(read().priceTestFreeze).toBeUndefined();
});

it('keeps unresolved ADR or class-share capitalization conflicts guarded',()=>{
 for(const name of ['Example ADR','Example Class B']){
  const a=analysis();a.company.name=name;a.company.marketCapUsd=5700;a.valuation!.shares=100;a.valuation!.normalized=1000;
  const repo=directory();mkdirSync(path.join(repo,'prices'));writeFileSync(path.join(repo,'prices/US.json'),JSON.stringify({[a.id]:[60,'2026-10-02']}));
  writeCorpusJson(`raw/eodhd/${a.id}.json`,{General:{Name:name,Type:'Common Stock',CurrencyCode:'USD',UpdatedAt:'2026-10-01'},SharesStats:{SharesOutstanding:100},Highlights:{MarketCapitalization:5700},Financials:{Balance_Sheet:{quarterly:{'2026-06-30':{commonStockSharesOutstanding:'100'}}}}});
  publishSnapshot({repo,analyses:[a],universe:[a.company],partial:false,commit:false,holdersByTicker:{},investorNames:{}});
  const d=JSON.parse(readFileSync(path.join(repo,`dossiers/${shardOf(a.id)}.json`),'utf8'))[a.id];
  expect(d.tests.price).toBeUndefined();expect(d.company.marketCapUsd).toBe(5700);
 }
});

it('freezes the last live price test when a quote refresh introduces an unresolved ratio',async()=>{
 const a=analysis();a.company.marketCapUsd=null;
 const repo=directory();mkdirSync(path.join(repo,'prices'));writeFileSync(path.join(repo,'prices/US.json'),JSON.stringify({[a.id]:[50,'2026-10-01']}));
 publishSnapshot({repo,analyses:[a],universe:[a.company],partial:false,commit:false,holdersByTicker:{},investorNames:{}});
 const read=()=>JSON.parse(readFileSync(path.join(repo,`dossiers/${shardOf(a.id)}.json`),'utf8'))[a.id];
 const old=read().tests.price;
 writeFileSync(path.join(repo,'prices/US.json'),JSON.stringify({[a.id]:[5000,'2026-10-02']}));
 const {refreshPublishedBuyPrices}=await import('@/lib/value/refresh-buy-prices');refreshPublishedBuyPrices(repo);
 expect(read().tests.price).toEqual(old);expect(read().priceTestFreeze.test).toEqual(old);expect(read().b).toBe(true);
 const row=JSON.parse(readFileSync(path.join(repo,'index/US.json'),'utf8'))[0];
 expect(row.v).toBeNull();expect(row.priceTestFreeze.test).toEqual(old);expect(row.b).toBe(true);
});

it('retains released historical rows omitted by a newer quarterly run',()=>{
 const repo=directory(),a=analysis();
 const old=['OLD.US','PPPPP',.5,true,.12];
 mkdirSync(path.join(repo,'history'));writeFileSync(path.join(repo,'history/2026.json'),JSON.stringify([old]));
 writeFileSync(path.join(repo,'history/companies.json'),JSON.stringify([{id:'OLD.US',n:'Previous member',c:'US',cur:'USD',k:'operating',mc:12,t:'UUUUU',v:null,g:[],h:0,st:'i',w:'OLD.US'}]));
 writeFileSync(path.join(repo,'history/index.json'),JSON.stringify({years:[2026],quarters:[],perYear:{},perQuarter:{}}));
 writeCorpusJson('history-v7/latest/index.json',{scope:'universe',years:[],quarters:['2026Q1'],perYear:{},perQuarter:{}});
 writeCorpusJson('history-v7/latest/2026Q1.json',[[a.id,'PPPPP',.2,false]]);
 publishSnapshot({repo,analyses:[a],universe:[a.company],partial:false,commit:false,holdersByTicker:{},investorNames:{}});
 expect(JSON.parse(readFileSync(path.join(repo,'history/2026.json'),'utf8'))).toEqual([old]);
 expect(JSON.parse(readFileSync(path.join(repo,'history/companies.json'),'utf8')).some((r:any)=>r.id==='OLD.US')).toBe(true);
 expect(JSON.parse(readFileSync(path.join(repo,'history/index.json'),'utf8')).perYear['2026'].analysed).toBe(1);
});

it('prices keeps all 87 quarterly views, deferred views, annual views and history bytes', async () => {
 const {publishViews}=await import('@/lib/value/publish-views');
 const repo=directory(), a=analysis(), files=output([a]);
 const quarters=Array.from({length:87},(_,i)=>`${2005+Math.floor(i/4)}Q${i%4+1}`);
 files['history/index.json']={years:[2018],quarters,perYear:{},perQuarter:{}};
 for(const q of quarters)files[`history/${q}.json`]=[[a.id,'PPPPP',.8,true,1]];
 files['history/2018.json']=[[a.id,'FFFFF',.1,false,1]];
 const views=structuredClone(publishViews(files));
 writeOutput({repo,files});
 const history=readFileSync(path.join(repo,'history/index.json'),'utf8');
 await refreshPrices({repo,companies:[a.company],now:Date.parse('2026-10-04'),bulk:async()=>[{code:'KO',close:50,date:'2026-10-02'}]});
 const meta=JSON.parse(readFileSync(path.join(repo,'meta.json'),'utf8'));
 expect(Object.keys(meta.views.quarters)).toHaveLength(87);
 for(const key of ['quarters','quarterDeferred','years','yearDeferred'])expect(meta.views[key]).toEqual(views[key as keyof typeof views]);
 expect(readFileSync(path.join(repo,'history/index.json'),'utf8')).toBe(history);
 for(const q of quarters)expect(existsSync(path.join(repo,meta.views.quarters[q]))).toBe(true);
});


describe('coverage additions retired by the issuer registry', () => {
  function retiredAdditionFixture() {
    const canonical=analysis('ALK-B.CO'),alias=analysis('AKBLF.US');
    for(const a of [canonical,alias]) {
      a.report={...a.report,kind:'10-K',sections:['business']};
      a.ownerMemo={version:1,asOf:a.asOf,inputHash:`input-${a.id}`,lines:[]} as any;
      writeCorpusJson(`analysis/${a.id}.json`,a);
      writeCorpusJson(`fundamentals/${a.id}.json`,{years:[{year:2025,end:'2025-12-31'}]});
      writeCorpusJson(`reports/${a.id}/meta.json`,a.report);
      writeCorpusJson(`analysis/inputs/${a.id}.json`,{asOf:a.asOf,sections:{business:'Annual filing'}});
      writeCorpusJson(`prices-history/${a.id}.json`,[['2026-09',10]]);
    }
    writeCorpusJson('prices/US.json',Object.fromEntries([canonical,alias].map(a=>[a.id,[10,new Date().toISOString().slice(0,10)]])));
    writeCorpusJson('held-membership/release.json',{version:1,baselineIds:[],baselineAnalysisHashes:{},additionIds:[alias.id],held:[]});
    // prepareRepository resets to a committed pre-dedupe snapshot: no aliases.json.
    const repo=repository();writeOutput({repo,files:output([canonical])});
    git(repo,['add','.']);git(repo,['commit','-m','pre-dedupe remote']);
    const publish=(a=canonical,commit=false)=>publishSnapshot({repo,analyses:[a],universe:[a.company],partial:false,commit,holdersByTicker:{},investorNames:{}});
    return {repo,canonical,publish};
  }
  it.each([false,true])('binds retired AKBLF.US to ALK-B.CO after reconciliation (commit=%s)',commit=>{
    const {repo,publish}=retiredAdditionFixture();
    expect(publish(undefined,commit).count).toBe(1);
    expect(JSON.parse(readFileSync(path.join(repo,'aliases.json'),'utf8'))['AKBLF.US']).toBe('ALK-B.CO');
    const ids=readdirSync(path.join(repo,'dossiers')).flatMap(f=>Object.keys(JSON.parse(readFileSync(path.join(repo,'dossiers',f),'utf8'))));
    expect(ids).toEqual(['ALK-B.CO']);
  });
  it('selects the canonical when only its retired listing appears in release scope',async()=>{
    const {canonical}=retiredAdditionFixture();
    writeFileSync(path.join(corpusDir(),'universe.jsonl'),JSON.stringify(canonical.company)+'\n');
    writeCorpusJson('index-membership/latest.json',{complete:true,memberships:{[canonical.id]:['S&P 500']}});
    const {default:publish}=await import('@/scripts/value/stages/publish');
    const out=path.join(corpusDir(),'canonical-scope');
    await publish({out});
    expect(JSON.parse(readFileSync(path.join(out,`dossiers/${shardOf(canonical.id)}.json`),'utf8'))[canonical.id]).toBeDefined();
  });
  it('does not let a retired addition bypass canonical input binding',()=>{
    const {canonical,publish}=retiredAdditionFixture();
    const changed={...canonical,ownerMemo:{...canonical.ownerMemo!,inputHash:'unreviewed'}};
    expect(()=>publish(changed)).toThrow(/binding failed: ALK-B.CO/);
  });
  it.each(['unchanged baseline','explicit freeze'])('binds a retired addition to its preserved canonical research (%s)',mode=>{
    const {repo,canonical,publish}=retiredAdditionFixture();
    const file=path.join(repo,`dossiers/${shardOf(canonical.id)}.json`);
    const released=JSON.parse(readFileSync(file,'utf8'))[canonical.id];
    // The reviewed released dossier can predate/differ from the private cache.
    const cached={...canonical,asOf:'2026-10-01',versions:{...canonical.versions,pipeline:'older-cache'},ownerMemo:{...canonical.ownerMemo!,inputHash:'cached-inputs'}};
    writeCorpusJson(`analysis/${canonical.id}.json`,cached);
    writeCorpusJson(`analysis/inputs/${canonical.id}.json`,{asOf:cached.asOf,sections:{business:'Annual filing'}});
    if(mode==='unchanged baseline')writeCorpusJson('held-membership/release.json',{version:1,baselineIds:[canonical.id],baselineAnalysisHashes:{[canonical.id]:baselineAnalysisHash(canonical.id)},additionIds:['AKBLF.US'],held:[]});
    else writeCorpusJson('verdict-freeze.json',{version:1,ids:[canonical.id]});
    expect(publish(cached,true).count).toBe(1);
    expect(JSON.parse(readFileSync(file,'utf8'))[canonical.id]).toEqual(released);
    expect(JSON.parse(readFileSync(path.join(repo,'aliases.json'),'utf8'))['AKBLF.US']).toBe(canonical.id);
  });
  it('preserves a reviewed canonical when its private cache lacks new-addition filing inputs',()=>{
    const {repo,canonical,publish}=retiredAdditionFixture();
    writeCorpusJson('held-membership/release.json',{version:1,baselineIds:[canonical.id],baselineAnalysisHashes:{[canonical.id]:baselineAnalysisHash(canonical.id)},additionIds:['AKBLF.US'],held:[]});
    writeCorpusJson('reports/ALK-B.CO/meta.json',{kind:'description',sections:[]});
    const file=path.join(repo,`dossiers/${shardOf(canonical.id)}.json`);
    const released=JSON.parse(readFileSync(file,'utf8'))[canonical.id];
    expect(publish(undefined,true).count).toBe(1);
    expect(JSON.parse(readFileSync(file,'utf8'))[canonical.id]).toEqual(released);
  });
  it('rejects an invalid preserved canonical rather than treating its alias as complete',()=>{
    const {repo,canonical,publish}=retiredAdditionFixture();
    writeCorpusJson('verdict-freeze.json',{version:1,ids:[canonical.id]});
    const file=path.join(repo,`dossiers/${shardOf(canonical.id)}.json`);
    const rows=JSON.parse(readFileSync(file,'utf8'));rows[canonical.id].status='invalid';
    writeFileSync(file,JSON.stringify(rows));
    expect(()=>publish()).toThrow(/preserved canonical.*invalid.*ALK-B.CO/);
  });
  it('requires complete canonical inputs even when the retired addition has complete inputs',()=>{
    const {publish}=retiredAdditionFixture();
    writeCorpusJson('reports/ALK-B.CO/meta.json',{kind:'description',sections:[]});
    expect(()=>publish()).toThrow(/ALK-B.CO.*incomplete.*full-filing/);
  });
});

it('keeps the released record of a company whose analysis failed, publishes every fresh analysis and withholds an unreleased failure', async()=>{
 const {default:publish}=await import('@/scripts/value/stages/publish');
 const failed=analysis(), fresh=analysis('PEP.US'), unreleased=analysis('MSFT.US'), live=path.join(corpusDir(),'publish-repo');
 mkdirSync(live);
 publishSnapshot({repo:live,analyses:[failed,fresh],universe:[failed.company,fresh.company],partial:false,commit:false,holdersByTicker:{},investorNames:{}});
 const released=JSON.parse(readFileSync(path.join(live,`dossiers/${shardOf(failed.id)}.json`),'utf8'))[failed.id];
 // The failed company's cached file is not tonight's analysis: it may be stale or never released.
 failed.versions.pipeline='obsolete';failed.tests.moat.result=failed.tests.moat.numeric='fail';
 fresh.tests.management.result=fresh.tests.management.numeric='fail';
 writeFileSync(path.join(corpusDir(),'universe.jsonl'),[failed,fresh,unreleased].map(a=>JSON.stringify(a.company)).join('\n')+'\n');
 writeCorpusJson('index-membership/latest.json',{complete:true,memberships:Object.fromEntries([failed,fresh,unreleased].map(a=>[a.id,['S&P 500']]))});
 for(const a of [failed,fresh,unreleased])writeCorpusJson(`analysis/${a.id}.json`,a);
 writeCorpusJson('staging/analysis-retained.json',{version:1,updatedAt:'2026-10-10T07:05:06Z',ids:[failed.id,unreleased.id],reasons:{[failed.id]:'The operation was aborted due to timeout',[unreleased.id]:'The operation was aborted due to timeout'}});
 const log=vi.spyOn(console,'log').mockImplementation(()=>{});
 const out=path.join(corpusDir(),'out');await publish({out});
 const dossiers=(root:string)=>Object.assign({},...readdirSync(path.join(root,'dossiers')).map(f=>JSON.parse(readFileSync(path.join(root,'dossiers',f),'utf8'))));
 expect(JSON.stringify(dossiers(out)[failed.id])).toBe(JSON.stringify(released));
 expect(dossiers(out)[fresh.id].tests.management.result).toBe('fail');
 expect(dossiers(out)[unreleased.id]).toBeUndefined();
 const lines=log.mock.calls.flat().join('\n');
 expect(lines).toContain('publish: retained released analysis for 1 companies whose analysis failed: KO.US');
 expect(lines).toContain('publish: withheld 1 unreleased companies whose analysis failed: MSFT.US');
 expect(readFileSync(path.join(corpusDir(),'staging/verdict-freeze.jsonl'),'utf8')).toContain('analysis failed: The operation was aborted due to timeout');
 // A successful analysis clears the list; the next publication uses it.
 failed.versions.pipeline=PIPELINE_VERSION;writeCorpusJson(`analysis/${failed.id}.json`,failed);
 writeCorpusJson('staging/analysis-retained.json',{version:1,updatedAt:'2026-10-11T07:00:00Z',ids:[],reasons:{}});
 const next=path.join(corpusDir(),'next');await publish({out:next});
 expect(dossiers(next)[failed.id].tests.moat.result).toBe('fail');
 expect(dossiers(next)[unreleased.id]).toBeDefined();
});

it('rejects a malformed analysis-retained file instead of guessing which companies failed', async()=>{
 const {readAnalysisRetained}=await import('@/scripts/value/analysis-retained');
 writeCorpusJson('staging/analysis-retained.json',{version:1,ids:['../KO.US'],reasons:{}});
 vi.spyOn(console,'warn').mockImplementation(()=>{});
 expect(()=>readAnalysisRetained()).toThrow(/Invalid staging\/analysis-retained.json/);
});

it('states the systemic-failure threshold: more than 2% of fresh analyses, or any failure in a tiny run', async()=>{
 const {systemicAnalysisFailure,MAX_ANALYSIS_FAILURE_SHARE}=await import('@/scripts/value/analysis-retained');
 expect(MAX_ANALYSIS_FAILURE_SHARE).toBe(0.02);
 expect(systemicAnalysisFailure(10,6268)).toBe(false); // 2026-10-10: 10 of 6,268
 expect(systemicAnalysisFailure(25,9894)).toBe(false); // 2026-10-09: 25 of 9,894
 expect(systemicAnalysisFailure(126,6268)).toBe(true);
 expect(systemicAnalysisFailure(1,10)).toBe(true);
 expect(systemicAnalysisFailure(0,0)).toBe(false);
});
