import {numericMemo} from '../../../lib/value/owner-memo';
import {alignHistoryShares} from '../../../lib/value/history-split-basis';
import {completeCachedSplits} from '../../../lib/value/completeness/cached-years';
import { forwardFiles } from './forward';
import { METHOD_VERSION } from '../../../lib/value/method-version';
import { isDeepStrictEqual } from 'node:util';
import {publicBusiness} from '../../../lib/value/flags/public';
import {applyAdjustments} from '../../../lib/value/judgement/apply';
import judgementTrust from '../../../lib/value/judgement/trust.json';
import { applyThesis } from '../../../lib/value/thesis/apply';
import type { ThesisResult } from '../../../lib/value/thesis/types';
import { withCapitalReturns } from '../../../lib/value/capital-returns';
import { summarizeSnapshots } from '../../../lib/value/snapshots';
import { bestWesternListing } from '../../../lib/value/western';
import { isDecided, undecidedReasons } from '../../../lib/value/publication-eligibility';
import { companyExclusion } from '../../../lib/value/fund-exclusion';
import { applyMembership } from '../../../lib/value/index-membership';
import {applyShareCheck,type ShareCheck} from '../../../lib/value/share-check';
import { publishViews } from '../../../lib/value/publish-views';
import { writeCorpusJson } from '../../../lib/value/corpus';
import { enrichedCompany } from "../../../lib/value/enrichment";
import { latestHistoryFiles } from "./history-snapshots";
import { buildAdaptiveSearchShards } from "../../../lib/value/search";
import { mergeSeedFiles, readPrices } from "../../../lib/value/price-files";
import { validCompanyId } from "../../../lib/value/companies";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, linkSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { T } from "../../../lib/value/config";
import { buildOutput } from "../../../lib/value/build-output";
import { corpusPath, readCorpusJson, readJsonl } from "../../../lib/value/corpus";
import type { Analysis, Company, Dossier, PriceHistory } from "../../../lib/value/types";
import { readPriceHistory } from "../../../lib/value/price-history";
import type { Index, StockShard } from "../../../lib/types";

import { revalidatePublishedValue } from '../revalidate';

const REMOTE = "https://github.com/mikipalet/gigainvestors-value-data.git";

export function git(repo: string, args: string[]): string {
  try {
    return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    throw new Error(`Data repository git ${args[0]} failed`);
  }
}

export function resetRepository(repo: string): void {
  git(repo, ["reset", "--hard"]);
  git(repo, ["clean", "-fd"]);
}

export function prepareRepository(): string {
  const repo = corpusPath("publish-repo");
  mkdirSync(corpusPath(), { recursive: true });
  if (!existsSync(repo)) {
    git(corpusPath(), ["-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential", "clone", REMOTE, repo]);
  } else {
    if (git(repo, ["remote", "get-url", "origin"]) !== REMOTE) throw new Error("Unexpected data repository origin");
    syncRepository(repo);
  }
  return repo;
}

/** Preserve commits left by a failed price push instead of resetting to origin. */
export function syncRepository(repo: string): void {
  resetRepository(repo);
  const previous = git(repo, ["branch", "-r", "--list", "origin/main"])
    ? git(repo, ["rev-parse", "origin/main"]) : null;
  git(repo, ["-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential", "fetch", "origin"]);
  if (git(repo, ["branch", "-r", "--list", "origin/main"])) {
    git(repo, ["checkout", "main"]);
    try {
      // Publish replaces history with an orphan snapshot. Replay only commits
      // made locally since the old remote tip, including any failed price push.
      git(repo, previous ? ["rebase", "--onto", "origin/main", previous, "main"] : ["rebase", "origin/main"]);
    } catch (error) {
      git(repo, ["rebase", "--abort"]);
      throw error;
    }
  }
}

export function acquirePublishLock(lock: string): () => void {
  const ownerFile = path.join(lock, "owner.json");
  const owner = { pid: process.pid, timestamp: Date.now(), token: randomUUID() };
  for (;;) {
    try { mkdirSync(lock); break; } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      let timestamp: number;
      let dead = false;
      try {
        timestamp = statSync(lock).mtimeMs;
        if (existsSync(ownerFile)) {
          const previous = JSON.parse(readFileSync(ownerFile, "utf8"));
          if (Number.isFinite(previous.timestamp)) timestamp = previous.timestamp;
          if (Number.isInteger(previous.pid) && previous.pid > 0) {
            try { process.kill(previous.pid, 0); } catch (error) {
              dead = (error as NodeJS.ErrnoException).code === "ESRCH";
            }
          }
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        // A malformed/legacy lock still expires based on its directory age.
        timestamp = statSync(lock).mtimeMs;
      }
      if (!dead && Date.now() - timestamp <= T.publish.lockMaxAgeMs) {
        throw new Error(`Another publish or prices stage holds ${lock}`);
      }
      rmSync(lock, { recursive: true, force: true });
    }
  }
  writeFileSync(ownerFile, JSON.stringify(owner));
  return () => {
    if (existsSync(ownerFile) && JSON.parse(readFileSync(ownerFile, "utf8")).token === owner.token) {
      rmSync(lock, { recursive: true, force: true });
    }
  };
}

export async function withPublishRepository(run: (repo: string) => Promise<void>): Promise<void> {
  mkdirSync(corpusPath(), { recursive: true });
  const release = acquirePublishLock(corpusPath("publish.lock"));
  try { await run(prepareRepository()); } finally { release(); }
}

export function pushRepository(repo: string, force: boolean): void {
  git(repo, ["-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential", "push", ...(force ? ["-f"] : []), "origin", "main"]);
}

export function loadHolders(store: string): { holdersByTicker: Record<string, string[]>; investorNames: Record<string, string> } {
  const counts: Record<string, number> = JSON.parse(readFileSync(path.join(store, "holders.json"), "utf8"));
  const index: Index = JSON.parse(readFileSync(path.join(store, "index.json"), "utf8"));
  const investorNames = Object.fromEntries(index.investors.map((investor) => [investor.code, investor.person]));
  const holdersByTicker: Record<string, string[]> = {};
  const latest = [...index.quarters].sort().at(-1);
  for (const file of readdirSync(path.join(store, "stocks")).filter((file) => file.endsWith(".json")).sort()) {
    const shard: StockShard = JSON.parse(readFileSync(path.join(store, "stocks", file), "utf8"));
    for (const stock of Object.values(shard)) {
      if (!(counts[stock.ticker] > 0)) continue;
      const quarter = stock.quarters.find((quarter) => quarter.q === latest);
      holdersByTicker[stock.ticker] = [...new Set((quarter?.holders ?? []).filter((holder) => holder.activity !== "sold" && holder.value > 0).map((holder) => holder.code))].sort();
    }
  }
  return { holdersByTicker, investorNames };
}

export function writeOutput({ repo, files }: { repo: string; files: Record<string, unknown> }): void {
  const allowed = /^(?:logos\/[a-f0-9]{64}|views\/[a-f0-9]{24}|index\/(?:[A-Z]{2}|default)|dossiers\/\d{3}|prices\/[A-Z]{2}|search\/(?:manifest|[a-z0-9][a-z0-9_&.\-]+)|history\/(?:index|companies|[0-9]{4}(?:Q[1-4])?)|forward\/(?:index|[0-9]{4}-[0-9]{2}-[0-9]{2})|aliases|meta|top)\.json$/;
  for (const file of Object.keys(files)) if (!allowed.test(file)) throw new Error("Invalid publish output path");
  // Preflight the entire batch before replacing any published output.
  const unchanged = new Set<string>();
  for (const [file, data] of Object.entries(files)) if (/^forward\/\d{4}-\d{2}-\d{2}\.json$/.test(file)) {
    const destination = path.join(repo, file);
    if (existsSync(destination)) {
      // The first record of a day stands; later publishes that day keep it instead of failing the whole release.
      if (!isDeepStrictEqual(JSON.parse(readFileSync(destination, 'utf8')), data)) console.warn(`publish: kept existing ${file}; forward records are immutable`);
      unchanged.add(file);
    }
  }
  for (const directory of ["index", "dossiers", "search", "history", "views"]) rmSync(path.join(repo, directory), { recursive: true, force: true });
  for (const [file, data] of Object.entries(files)) {
    const destination = path.join(repo, file);
    if (unchanged.has(file)) continue;
    if (file.startsWith("prices/") && existsSync(destination)) continue;
    mkdirSync(path.dirname(destination), { recursive: true });
    if (/^forward\/\d{4}-\d{2}-\d{2}\.json$/.test(file)) {
      // Atomic create-if-absent: a concurrent writer cannot replace this date.
      const temporary = `${destination}.${randomUUID()}.tmp`;
      writeFileSync(temporary, JSON.stringify(data) + "\n");
      try { linkSync(temporary, destination); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || !isDeepStrictEqual(JSON.parse(readFileSync(destination, 'utf8')), data)) throw error;
      } finally { rmSync(temporary, {force:true}); }
    } else {
      writeFileSync(`${destination}.tmp`, JSON.stringify(data) + "\n");
      renameSync(`${destination}.tmp`, destination);
    }
  }
}

export function commitOutput({ repo, asOf }: { repo: string; asOf: string }): boolean {
  if (!git(repo, ["status", "--porcelain"]) && git(repo, ["rev-list", "--count", "HEAD"]) === "1") return false;
  git(repo, ["checkout", "--orphan", "tmp"]);
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-m", `data ${asOf}`]);
  git(repo, ["branch", "-M", "main"]);
  return true;
}

export function publishSnapshot({ repo, analyses, universe, partial, force = false, commit = true, holdersByTicker, investorNames }: {
  repo: string;
  analyses: Analysis[];
  universe: Company[];
  partial: boolean;
  force?: boolean;
  commit?: boolean;
  holdersByTicker: Record<string, string[]>;
  investorNames: Record<string, string>;
}): { count: number; changed: boolean } {
  // Read the fetched snapshot before replacing meta.json or creating an orphan commit.
  const metaFile = path.join(repo, "meta.json");
  const previous = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, "utf8")) : null;
  const previousCount = previous?.counts?.analysed
    ?? (previous?.counts ? previous.counts.scored + previous.counts.insufficient : 0);
  if (!Number.isInteger(previousCount) || previousCount < 0) throw new Error(`Invalid published count in ${metaFile}`);
  universe = universe.filter(company => company.indexes?.length);
  const allowedIds = new Set(universe.map(company => company.id));
  const merged = new Map<string, Analysis>();
  const directory = path.join(repo, "dossiers");
  if (partial && existsSync(directory)) {
    const ids = new Set(universe.map(company => company.id));
    for (const file of readdirSync(directory).filter((file) => /^\d{3}\.json$/.test(file)).sort()) {
      const dossiers: Record<string, Dossier> = JSON.parse(readFileSync(path.join(directory, file), "utf8"));
      for (const dossier of Object.values(dossiers)) if (ids.has(dossier.id)) {
        const { holders: _holders, ...analysis } = dossier;
        merged.set(analysis.id, analysis);
      }
    }
  }
  for (const analysis of analyses) if (allowedIds.has(analysis.id)) merged.set(analysis.id, analysis);
  const identities = new Map(universe.map(company => [company.id, company]));
  const rows = [...merged.values()].map(analysis => ({ ...analysis, company: enrichedCompany({...analysis.company, indexes: identities.get(analysis.id)?.indexes ?? [], listings: identities.get(analysis.id)?.listings ?? analysis.company.listings}) }));
  if (!force && (rows.length === 0 || rows.length < previousCount * (1 - T.publish.maxCountDrop))) {
    throw new Error(`Publish aborted: ${rows.length} companies versus ${previousCount} previously published; use --force to override`);
  }
  const priceHistories: Record<string, PriceHistory> = {};
  for (const row of rows) {
    try {
      const prices = readPriceHistory(row.id);
      if (prices) priceHistories[row.id] = prices;
    } catch (error) {
      console.warn(`publish: skipped price history for ${row.id}: ${error instanceof Error ? error.message : "unreadable history"}`);
    }
  }
  mergeSeedFiles(repo);
  const fx: Record<string, number> = {};
  const fxDir = corpusPath("raw/eodhd/universe");
  if (existsSync(fxDir)) for (const file of readdirSync(fxDir).filter(file => /^fx-[A-Z]{3}\.json$/.test(file))) {
    const rate = readCorpusJson<{ data: Array<{ close: number }> }>(`raw/eodhd/universe/${file}`)?.data?.[0]?.close;
    if (rate && Number.isFinite(rate) && rate > 0) fx[file.slice(3, 6)] = rate;
  }
  const { files, unresolved } = buildOutput({ priceHistories, analyses: rows, universe: universe.length, holdersByTicker, investorNames, fx, prices: readPrices(path.join(repo, "prices")) });
  writeCorpusJson('staging/unresolved-shares.json', {asOf:new Date().toISOString(),companies:unresolved});
  console.log(`Private share residual: ${unresolved.length}; quality passes: ${unresolved.filter(r=>r.qualityPass).length}`);
  const asOf = rows.map((analysis) => analysis.asOf).sort().at(-1) ?? new Date().toISOString().slice(0, 10);
  const eligible=new Set(rows.filter(isDecided).map(row=>row.id));
  writeCorpusJson('staging/undecided.json',{asOf:new Date().toISOString(),companies:rows.filter(row=>!isDecided(row)).map(row=>({id:row.id,reasons:undecidedReasons(row)}))});
  const { shards, manifest } = buildAdaptiveSearchShards(universe.filter(company=>eligible.has(company.id)).map(company => enrichedCompany(company)), eligible);
  files["search/manifest.json"] = manifest;
  for (const [key, shard] of Object.entries(shards)) {
    files[`search/${key}.json`] = shard;
  }
  const history=latestHistoryFiles(universe.filter(c=>eligible.has(c.id)));
  for(const [file,data]of Object.entries(history)) {
    // Published historical rows must also have a decided checklist.
    if(Array.isArray(data)&&file!=='history/companies.json') history[file]=data.filter((row:any)=>Array.isArray(row)&&eligible.has(row[0])&&typeof row[1]==='string'&&/^[PF]{5}$/.test(row[1]));
  }
  const historyIndex=history['history/index.json'] as import('../../../lib/value/time-travel').HistoryIndex|undefined;
  if(historyIndex){
    const westernIds=new Set(universe.filter(c=>bestWesternListing(c)).map(c=>c.id));
    historyIndex.perYear={};historyIndex.western={perYear:{}};
    historyIndex.perQuarter={};historyIndex.western.perQuarter={};
    for(const q of historyIndex.quarters??[]){
      const snapshots=history[`history/${q}.json`] as import('../../../lib/value/types').SnapshotRow[];
      historyIndex.perQuarter[q]=summarizeSnapshots(snapshots);
      historyIndex.western.perQuarter[q]=summarizeSnapshots(snapshots.filter(r=>westernIds.has(r[0])));
    }
    for(const year of historyIndex.years){
      const snapshots=history[`history/${year}.json`] as import('../../../lib/value/types').SnapshotRow[];
      historyIndex.perYear[year]=summarizeSnapshots(snapshots);
      historyIndex.western.perYear[year]=summarizeSnapshots(snapshots.filter(r=>westernIds.has(r[0])));
    }
  }
  if (Array.isArray(history['history/companies.json'])) history['history/companies.json'] = (history['history/companies.json'] as import('../../../lib/value/types').IndexRow[]).map(row=>({...row,methodVersion:METHOD_VERSION}));
  Object.assign(files, history);
  for(const row of rows){
    const logo=enrichedCompany(row.company).logo;
    const asset=logo?.match(/^\/api\/value\/logo\?asset=([a-f0-9]{64})$/)?.[1];
    if(asset){const cached=readCorpusJson(`enrichment-v7/logos/assets/${asset}.json`);if(!cached)throw Error(`Missing logo asset ${asset}`);files[`logos/${asset}.json`]=cached;}
  }
  forwardFiles(repo, files, universe, readPrices(path.join(repo, 'prices')), new Date().toISOString().slice(0,10));
  publishViews(files);
  writeOutput({ repo, files });
  const changed = commit ? commitOutput({ repo, asOf }) : true;
  return { count: rows.length, changed };
}

export function runCalibration(cli = path.resolve(__dirname, "../cli.ts")): void {
  try {
    execFileSync(process.execPath, ["--import", "tsx", cli, "calibrate", "--existing"], { stdio: "inherit" });
  } catch {
    throw new Error("Calibration failed; publish aborted");
  }
}

/** Validate the consumed shape without allocating dossiers, tags, indexes or FX loaders. */
export function isAnalysis(value: unknown): value is Analysis {
  const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
  const numberOrNull = (v: unknown) => v === null || typeof v === "number" && Number.isFinite(v);
  const series = (v: unknown) => record(v) && Object.values(v).every(rows => Array.isArray(rows)
    && rows.every(row => Array.isArray(row) && row.length === 2 && typeof row[0] === "number" && numberOrNull(row[1])));
  if (!record(value) || typeof value.id !== "string" || !record(value.company) || !record(value.tests)
    || !record(value.versions) || typeof value.versions.pipeline !== "string" || typeof value.versions.questions !== "string"
    || typeof value.asOf !== "string" || !["scored", "insufficient_data"].includes(String(value.status))) return false;
  const company = value.company;
  if (company.id !== value.id || typeof company.country !== "string" || !/^[A-Z]{2}$/.test(company.country)
    || typeof company.name !== "string" || typeof company.currency !== "string" || !numberOrNull(company.marketCapUsd)
    || !Array.isArray(company.listings) || !company.listings.every(id => typeof id === "string")) return false;
  for (const key of ["understandable", "moat", "economics", "management", "accounting"]) {
    const test = value.tests[key];
    if (!record(test) || !["pass", "fail", "unclear", "na"].includes(String(test.result))
      || !Array.isArray(test.jev) || !test.jev.every(answer => record(answer) && typeof answer.q === "string")
      || !series(test.series) || !record(test.metrics) || !Array.isArray(test.reasons)) return false;
  }
  if (value.series !== undefined && !series(value.series)) return false;
  if (value.requiredMos !== undefined && (typeof value.requiredMos !== "number" || !Number.isFinite(value.requiredMos) || value.requiredMos < 0 || value.requiredMos > 1)) return false;
  if (value.valuation !== null) {
    const valuation = value.valuation;
    if (!record(valuation) || typeof valuation.currency !== "string" || !record(valuation.perShare)
      || ![valuation.perShare.low, valuation.perShare.mid, valuation.perShare.high].every(v => typeof v === "number" && Number.isFinite(v))) return false;
    if (valuation.perShareTrading !== undefined && (!record(valuation.perShareTrading)
      || typeof valuation.perShareTrading.currency !== "string" || ![valuation.perShareTrading.low, valuation.perShareTrading.mid, valuation.perShareTrading.high].every(v => typeof v === "number" && Number.isFinite(v)))) return false;
  }
  return true;
}

export function loadAnalyses(companies: Company[]): Analysis[] {
  const analyses: Analysis[] = [];
  for (const company of companies) {
    if (!validCompanyId(company.id, "publish")) continue;
    try {
      const analysis = readCorpusJson<Analysis>(`analysis/${company.id}.json`);
      if (!analysis) continue; // The rolling download has not analysed this company yet.
      const publishedMemo=readCorpusJson<Analysis["ownerMemo"]>(`published-memos/${company.id}.json`);
      const currentMemo=readCorpusJson<Analysis["ownerMemo"]>(`business-backfill/memos/${company.id}.json`)??analysis.ownerMemo;
      // Research is incremental: an omitted answer is not a retraction of a live answer.
      // New answers win; the shared public consistency gate still checks every line.
      analysis.ownerMemo=currentMemo?{...currentMemo,lines:[...new Map([...(publishedMemo?.lines??[]),...currentMemo.lines].map(line=>[line.question,line])).values()].sort((a,b)=>a.question-b.question)}:publishedMemo??undefined;
      analysis.businessOverview=readCorpusJson<Analysis["businessOverview"]>(`business-fit/overview/${company.id}.json`)??analysis.businessOverview;
      analysis.businessDepth=publicBusiness(readCorpusJson(`flags/${company.id}.json`),analysis)??publicBusiness(analysis.businessDepth,analysis);
      if (analysis.id !== company.id) throw new Error("Analysis ID mismatch");
      // Validate the consumer contract here so one malformed document cannot stop the rollout.
      if (!isAnalysis(analysis)) throw new Error("Invalid analysis shape");
      const f=readCorpusJson<import('../../../lib/value/types').Fundamentals>(`fundamentals/${company.id}.json`);
      if(f)f.splits=completeCachedSplits(company.id,f.splits,readCorpusJson);
      const years=f?alignHistoryShares(f,readPriceHistory(company.id)??[]).years:undefined;
      if(years&&analysis.ownerMemo?.lines.some(l=>l.question===2&&l.basis==='computed')){
        const customer=numericMemo(analysis,years,null).find(l=>l.question===2);
        analysis.ownerMemo={...analysis.ownerMemo,lines:analysis.ownerMemo.lines.flatMap(l=>l.question===2&&l.basis==='computed'?customer?[customer]:[]:[l])};
      }
      analyses.push(applyThesis(applyShareCheck(years?withCapitalReturns(analysis,applyAdjustments(years,readCorpusJson(`judgement/${company.id}.json`),judgementTrust,analysis.reportingCurrency??company.currency).years):analysis,readCorpusJson<ShareCheck>(`enrichment-v7/share-checks/${company.id}.json`)),readCorpusJson<ThesisResult>(`thesis/${company.id}.json`)));
    } catch (error) {
      console.warn(`publish: skipped analysis/${company.id}.json: ${error instanceof Error ? error.message : "unreadable analysis"}`);
    }
  }
  return analyses;
}

export default async function publish(options: { only?: string[]; limit?: number; force?: boolean; out?: string; overwrite?: boolean }): Promise<void> {
  // Workaround: the nightly path does not yet reproduce release-script corrections (fix-5); a hold file keeps live data until it does.
  if (!options.out && existsSync(corpusPath("publish.hold"))) { console.log(`publish held: ${readFileSync(corpusPath("publish.hold"), "utf8").trim()}`); return; }
  const out = options.out === undefined ? undefined : path.resolve(options.out);
  if (options.overwrite && !out) throw new Error('--overwrite requires local --out');
  if (out && existsSync(out) && readdirSync(out).length) {
    if (!options.overwrite) throw new Error('--out requires a new or empty directory, or --overwrite for an existing snapshot');
    if (!existsSync(path.join(out, 'meta.json')) || !existsSync(path.join(out, 'index'))) throw new Error('--overwrite requires an existing local snapshot');
    if (existsSync(path.join(out, '.git'))) throw new Error('--overwrite cannot target a git repository');
  }
  if (!T.publish.indexMembersOnly) throw new Error("Publication requires indexMembersOnly");
  const membership = readCorpusJson<{ complete: boolean; memberships: Record<string, string[]>; supplementalCompanies?: Company[] }>("index-membership/latest.json");
  if (!membership || (!membership.complete && !(out && options.force))) throw new Error("Run index-membership and resolve its coverage report before publish (incomplete snapshots may only be inspected with --out --force)");
  const companies = applyMembership([...new Map([...readJsonl<Company>("universe.jsonl"), ...(membership.supplementalCompanies ?? [])].map(c=>[c.id,c])).values()], membership.memberships).filter(company => company.indexes!.length && !companyExclusion(company));
  if (!companies.length) throw new Error("Run the universe stage before publish");
  const selected = companies.filter((company) => !options.only || options.only.includes(company.id)).slice(0, options.limit);
  if (!selected.length) throw new Error("No companies selected for publish");
  const analyses = loadAnalyses(selected);
  const holders = loadHolders(path.resolve(__dirname, "../../../data/store"));
  if (out) {
    mkdirSync(out, { recursive: true });
    // Match normal publication's cached closes before merging local seed quotes.
    const prices = corpusPath("publish-repo", "prices");
    if (existsSync(prices)) cpSync(prices, path.join(out, "prices"), { recursive: true });
    const { count } = publishSnapshot({ repo: out, analyses, universe: companies, partial: false, force: options.force, commit: false, ...holders });
    console.log(`publish: ${count} companies written locally to ${out}; no commit, push or revalidation`);
    return;
  }
  runCalibration();
  await withPublishRepository(async (repo) => {
    const { count, changed } = publishSnapshot({ repo, analyses, universe: companies, partial: Boolean(options.only || options.limit), force: options.force, ...holders });
    pushRepository(repo, true);
    await revalidatePublishedValue();
    console.log(`publish: ${count} companies, ${changed ? "replaced data snapshot" : "unchanged snapshot"}`);
  });
}
