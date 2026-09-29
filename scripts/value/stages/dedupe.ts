import { loadCompanies } from "../../../lib/value/companies";
import { mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { corpusPath, readCorpusJson, readJsonl, writeCorpusJson } from "../../../lib/value/corpus";
import { T } from "../../../lib/value/config";
import type { Company, Fundamentals } from "../../../lib/value/types";
import { collapseListings, normalizedName } from "../../../lib/value/universe";
import { exchangeCountries, nonHomeVenues, offshoreDomiciles } from "../../../lib/value/universe-config";

interface Merge {
  from: string;
  to: string;
  reason: "fundamentals";
  fiscalYear: number;
  currency: string;
  revenue: { from: number; to: number };
  relativeDifference: number;
}

function evidence(from: Company, to: Company): Merge | null {
  const a = readCorpusJson<Fundamentals>(`fundamentals/${from.id}.json`);
  const b = readCorpusJson<Fundamentals>(`fundamentals/${to.id}.json`);
  if (!a?.currency || a.currency !== b?.currency) return null;
  const common = a.years.filter(year => b.years.some(other => other.fy === year.fy)).sort((x, y) => y.fy - x.fy);
  const latest = common[0];
  if (!latest) return null;
  const home = b.years.find(year => year.fy === latest.fy)!;
  const usRevenue = latest.revenue;
  const homeRevenue = home.revenue;
  // Missing/zero revenue is not identity evidence. Do not fall back to an older
  // year when the latest common year's revenue is absent or disagrees.
  if (usRevenue == null || homeRevenue == null || !Number.isFinite(usRevenue) || !Number.isFinite(homeRevenue)
    || usRevenue <= 0 || homeRevenue <= 0) return null;
  const relativeDifference = Math.abs(usRevenue - homeRevenue) / homeRevenue;
  if (relativeDifference > T.dedupe.revenueTolerance) return null;
  return { from: from.id, to: to.id, reason: "fundamentals", fiscalYear: latest.fy,
    currency: a.currency, revenue: { from: usRevenue, to: homeRevenue }, relativeDifference };
}

function writeJsonl(rel: string, rows: unknown[]): void {
  const destination = corpusPath(rel);
  mkdirSync(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.tmp`;
  writeFileSync(temporary, rows.map(row => JSON.stringify(row) + "\n").join(""));
  renameSync(temporary, destination);
}

/** Run after fundamentals and before reports/analyze. Uses only local evidence. */
export default async function dedupe(options: { only?: string[]; limit?: number } = {}): Promise<void> {
  if (options.only || options.limit) throw new Error("dedupe requires the full universe");
  const input = loadCompanies({});
  const byId = new Map(input.map(company => [company.id, company]));
  const companies = collapseListings(input).map(group => ({ ...byId.get(group.primary)!,
    listings: [...new Set(group.listings.flatMap(id => byId.get(id)!.listings))].sort() }));
  // Re-collapsing must not discard cached secondary rows without an identity match.
  const grouped = new Set(companies.flatMap(company => company.listings));
  companies.push(...input.filter(company => !grouped.has(company.id)));
  if (!companies.length) throw new Error("Run the universe stage before dedupe");
  writeCorpusJson(`dedupe/universe-${new Date().toISOString().replace(/:/g, '-')}.json`, input);
  for (const file of readdirSync(corpusPath("dedupe"), { withFileTypes: true })) {
    const match = /^universe-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2}\.\d{3}Z)\.json$/.exec(file.name);
    if (!file.isFile() || !match) continue;
    const timestamp = Date.parse(`${match[1]}T${match[2]}:${match[3]}:${match[4]}`);
    if (Date.now() - timestamp > T.dedupe.backupRetentionMs) rmSync(corpusPath("dedupe", file.name));
  }
  companies.sort((a, b) => (b.marketCapUsd ?? -Infinity) - (a.marketCapUsd ?? -Infinity) || a.id.localeCompare(b.id));
  const homes = new Map<string, Company[]>();
  for (const company of companies) {
    if (company.exchange === "US" || !company.isin || company.isin.startsWith("US") || nonHomeVenues.has(company.exchange)) continue;
    const domicile = company.isin.slice(0, 2);
    if (domicile !== exchangeCountries[company.exchange] && !offshoreDomiciles.has(domicile)) continue;
    const name = normalizedName(company.name, company);
    if (name) homes.set(name, [...homes.get(name) ?? [], company]);
  }
  const merges: Merge[] = [];
  for (const company of companies) {
    if (company.exchange !== "US" || !company.isin?.startsWith("US")) continue;
    const candidates = homes.get(normalizedName(company.name, company)) ?? [];
    const matches = candidates.flatMap(home => {
      const match = evidence(company, home);
      return match ? [{ home, match }] : [];
    });
    if (matches.length !== 1) continue;
    const { home, match } = matches[0];
    home.listings = [...new Set([...home.listings, ...company.listings])];
    merges.push(match);
  }
  const removed = new Set(merges.map(merge => merge.from));
  // Preserve evidence on no-op reruns. Write audit first so a crash cannot
  // remove a company without leaving its reason. A retry upserts the same pair.
  const audit = new Map(readJsonl<Merge>("dedupe.jsonl").map(merge => [`${merge.from}:${merge.to}`, merge]));
  for (const merge of merges) audit.set(`${merge.from}:${merge.to}`, merge);
  writeJsonl("dedupe.jsonl", [...audit.values()]);
  writeJsonl("universe.jsonl", companies.filter(company => !removed.has(company.id)));
  for (const merge of merges) console.log(`dedupe: ${merge.from} -> ${merge.to}; FY${merge.fiscalYear} ${merge.currency} revenue ${merge.revenue.from}/${merge.revenue.to}; difference ${(merge.relativeDifference * 100).toFixed(4)}%`);
  console.log(`dedupe: ${merges.length} merged; ${companies.length - merges.length} companies; ${audit.size} recorded merges`);
}
