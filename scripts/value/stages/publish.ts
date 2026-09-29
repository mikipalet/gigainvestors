import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildOutput } from "../../../lib/value/build-output";
import { corpusPath, readCorpusJson, readJsonl } from "../../../lib/value/corpus";
import type { Analysis, Company, Dossier, PriceMap } from "../../../lib/value/types";
import type { Index, StockShard } from "../../../lib/types";

const REMOTE = "https://github.com/mikipalet/gigainvestors-value-data.git";

export function git(repo: string, args: string[]): string {
  try {
    return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    throw new Error(`Data repository git ${args[0]} failed`);
  }
}

export function prepareRepository(): string {
  const repo = corpusPath("publish-repo");
  mkdirSync(corpusPath(), { recursive: true });
  if (!existsSync(repo)) {
    git(corpusPath(), ["-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential", "clone", REMOTE, repo]);
  } else {
    if (git(repo, ["remote", "get-url", "origin"]) !== REMOTE) throw new Error("Unexpected data repository origin");
    if (git(repo, ["status", "--porcelain"])) throw new Error("Data repository has uncommitted changes");
    git(repo, ["-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential", "fetch", "origin"]);
    if (git(repo, ["branch", "-r", "--list", "origin/main"])) {
      git(repo, ["checkout", "-B", "main", "origin/main"]);
    }
  }
  return repo;
}

export async function withPublishRepository(run: (repo: string) => Promise<void>): Promise<void> {
  const lock = corpusPath("publish.lock");
  mkdirSync(corpusPath(), { recursive: true });
  try { mkdirSync(lock); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error("Another publish or prices stage holds publish.lock");
    throw error;
  }
  try { await run(prepareRepository()); } finally { rmSync(lock, { recursive: true, force: true }); }
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

export function publishSnapshot({ repo, analyses, universeIds, partial, holdersByTicker, investorNames }: {
  repo: string;
  analyses: Analysis[];
  universeIds: string[];
  partial: boolean;
  holdersByTicker: Record<string, string[]>;
  investorNames: Record<string, string>;
}): { count: number; changed: boolean } {
  const merged = new Map<string, Analysis>();
  const directory = path.join(repo, "dossiers");
  if (partial && existsSync(directory)) {
    const ids = new Set(universeIds);
    for (const file of readdirSync(directory).filter((file) => /^\d{3}\.json$/.test(file)).sort()) {
      const dossiers: Record<string, Dossier> = JSON.parse(readFileSync(path.join(directory, file), "utf8"));
      for (const dossier of Object.values(dossiers)) if (ids.has(dossier.id)) {
        const { holders: _holders, series: _series, ...analysis } = dossier;
        merged.set(analysis.id, analysis);
      }
    }
  }
  for (const analysis of analyses) merged.set(analysis.id, analysis);
  const rows = [...merged.values()];
  const { files } = buildOutput({ analyses: rows, holdersByTicker, investorNames, fx: {}, prices: readPriceFiles(repo) });
  const asOf = rows.map((analysis) => analysis.asOf).sort().at(-1)!;
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

export default async function publish(options: { only?: string[]; limit?: number; force?: boolean }): Promise<void> {
  const companies = readJsonl<Company>("universe.jsonl");
  if (!companies.length) throw new Error("Run the universe stage before publish");
  const selected = companies.filter((company) => !options.only || options.only.includes(company.id)).slice(0, options.limit);
  if (!selected.length) throw new Error("No companies selected for publish");
  const analyses = selected.map((company) => {
    if (/[\\/]/.test(company.id)) throw new Error("Invalid company ID");
    const analysis = readCorpusJson<Analysis>(`analysis/${company.id}.json`);
    if (!analysis || analysis.id !== company.id) throw new Error(`Missing analysis for ${company.id}`);
    return analysis;
  });
  const holders = loadHolders(path.resolve(__dirname, "../../../data/store"));
  runCalibration();
  await withPublishRepository(async (repo) => {
    const { count, changed } = publishSnapshot({ repo, analyses, universeIds: companies.map((company) => company.id), partial: Boolean(options.only || options.limit), ...holders });
    pushRepository(repo, true);
    console.log(`publish: ${count} companies, ${changed ? "replaced data snapshot" : "unchanged snapshot"}`);
  });
}
