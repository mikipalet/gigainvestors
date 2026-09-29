import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { T } from "../../../lib/value/config";
import { buildOutput } from "../../../lib/value/build-output";
import { corpusPath, readCorpusJson, readJsonl } from "../../../lib/value/corpus";
import type { Analysis, Company, Dossier, PriceMap, PriceHistory } from "../../../lib/value/types";
import type { CachedPriceHistory } from "../../../lib/value/price-history";
import type { Index, StockShard } from "../../../lib/types";

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
    resetRepository(repo);
    git(repo, ["-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential", "fetch", "origin"]);
    if (git(repo, ["branch", "-r", "--list", "origin/main"])) {
      git(repo, ["checkout", "-B", "main", "origin/main"]);
    }
  }
  return repo;
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
  const allowed = /^(?:index\/(?:[A-Z]{2}|default)|dossiers\/\d{3}|prices\/[A-Z]{2}|meta|top)\.json$/;
  for (const file of Object.keys(files)) if (!allowed.test(file)) throw new Error("Invalid publish output path");
  for (const directory of ["index", "dossiers"]) rmSync(path.join(repo, directory), { recursive: true, force: true });
  for (const [file, data] of Object.entries(files)) {
    const destination = path.join(repo, file);
    if (file.startsWith("prices/") && existsSync(destination)) continue;
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(`${destination}.tmp`, JSON.stringify(data) + "\n");
    renameSync(`${destination}.tmp`, destination);
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

export function readPriceFiles(repo: string): PriceMap {
  const directory = path.join(repo, "prices");
  if (!existsSync(directory)) return {};
  return Object.assign({}, ...readdirSync(directory).filter((file) => /^[A-Z]{2}\.json$/.test(file)).sort()
    .map((file) => JSON.parse(readFileSync(path.join(directory, file), "utf8")) as PriceMap));
}

export function publishSnapshot({ repo, analyses, universeIds, partial, force = false, holdersByTicker, investorNames }: {
  repo: string;
  analyses: Analysis[];
  universeIds: string[];
  partial: boolean;
  force?: boolean;
  holdersByTicker: Record<string, string[]>;
  investorNames: Record<string, string>;
}): { count: number; changed: boolean } {
  // Read the fetched snapshot before replacing meta.json or creating an orphan commit.
  const metaFile = path.join(repo, "meta.json");
  const previous = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, "utf8")) : null;
  const previousCount = previous?.counts?.analysed
    ?? (previous?.counts ? previous.counts.scored + previous.counts.insufficient : 0);
  if (!Number.isInteger(previousCount) || previousCount < 0) throw new Error(`Invalid published count in ${metaFile}`);
  const merged = new Map<string, Analysis>();
  const directory = path.join(repo, "dossiers");
  if (partial && existsSync(directory)) {
    const ids = new Set(universeIds);
    for (const file of readdirSync(directory).filter((file) => /^\d{3}\.json$/.test(file)).sort()) {
      const dossiers: Record<string, Dossier> = JSON.parse(readFileSync(path.join(directory, file), "utf8"));
      for (const dossier of Object.values(dossiers)) if (ids.has(dossier.id)) {
        const { holders: _holders, ...analysis } = dossier;
        merged.set(analysis.id, analysis);
      }
    }
  }
  for (const analysis of analyses) merged.set(analysis.id, analysis);
  const rows = [...merged.values()];
  if (!force && (rows.length === 0 || rows.length < previousCount * (1 - T.publish.maxCountDrop))) {
    throw new Error(`Publish aborted: ${rows.length} companies versus ${previousCount} previously published; use --force to override`);
  }
  const priceHistories: Record<string, PriceHistory> = {};
  for (const row of rows) {
    try {
      const cached = readCorpusJson<CachedPriceHistory>(`prices-history/${row.id}.json`);
      if (cached && Array.isArray(cached.prices)) priceHistories[row.id] = cached.prices;
    } catch (error) {
      console.warn(`publish: skipped price history for ${row.id}: ${error instanceof Error ? error.message : "unreadable history"}`);
    }
  }
  const { files } = buildOutput({ priceHistories, analyses: rows, universe: universeIds.length, holdersByTicker, investorNames, fx: {}, prices: readPriceFiles(repo) });
  const asOf = rows.map((analysis) => analysis.asOf).sort().at(-1) ?? new Date().toISOString().slice(0, 10);
  writeOutput({ repo, files });
  const changed = commitOutput({ repo, asOf });
  return { count: rows.length, changed };
}

export function runCalibration(cli = path.resolve(__dirname, "../cli.ts")): void {
  try {
    execFileSync(process.execPath, ["--import", "tsx", cli, "calibrate"], { stdio: "inherit" });
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
    if (/[\\/]/.test(company.id)) throw new Error("Invalid company ID");
    try {
      const analysis = readCorpusJson<Analysis>(`analysis/${company.id}.json`);
      if (!analysis) continue; // The rolling download has not analysed this company yet.
      if (analysis.id !== company.id) throw new Error("Analysis ID mismatch");
      // Validate the consumer contract here so one malformed document cannot stop the rollout.
      if (!isAnalysis(analysis)) throw new Error("Invalid analysis shape");
      analyses.push(analysis);
    } catch (error) {
      console.warn(`publish: skipped analysis/${company.id}.json: ${error instanceof Error ? error.message : "unreadable analysis"}`);
    }
  }
  return analyses;
}

export default async function publish(options: { only?: string[]; limit?: number; force?: boolean }): Promise<void> {
  const companies = readJsonl<Company>("universe.jsonl");
  if (!companies.length) throw new Error("Run the universe stage before publish");
  const selected = companies.filter((company) => !options.only || options.only.includes(company.id)).slice(0, options.limit);
  if (!selected.length) throw new Error("No companies selected for publish");
  const analyses = loadAnalyses(selected);
  const holders = loadHolders(path.resolve(__dirname, "../../../data/store"));
  runCalibration();
  await withPublishRepository(async (repo) => {
    const { count, changed } = publishSnapshot({ repo, analyses, universeIds: companies.map((company) => company.id), partial: Boolean(options.only || options.limit), force: options.force, ...holders });
    pushRepository(repo, true);
    console.log(`publish: ${count} companies, ${changed ? "replaced data snapshot" : "unchanged snapshot"}`);
  });
}
