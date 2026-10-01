import { universeCompanies } from '../../../lib/value/companies';
import { refreshPublishedBuyPrices } from '../../../lib/value/refresh-buy-prices';
import { existsSync, mkdirSync, readFileSync, readdirSync, statfsSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readCorpusJson, writeCorpusJson } from "../../../lib/value/corpus";
import { bulkLastDay, callsUsedToday } from "../../../lib/value/eodhd";
import { yahooPrice } from "../../../lib/value/prices-yahoo";
import type { Company, PriceMap } from "../../../lib/value/types";
import { git, pushRepository, withPublishRepository } from "./publish";

function validPrice(close: unknown, date: unknown): close is number {
  return typeof close === "number" && Number.isFinite(close) && close > 0 && typeof date === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
}

export function parseBulkPrices({ rows, companies }: { rows: unknown; companies: Company[] }): PriceMap {
  if (!Array.isArray(rows)) throw new Error("Invalid EODHD bulk price response");
  const byCode = new Map(companies.map((company) => [company.code, company.id]));
  const prices: PriceMap = {};
  for (const row of rows) {
    if (typeof row !== "object" || row === null) continue;
    const id = byCode.get(row.code);
    if (id && validPrice(row.close, row.date)) prices[id] = [row.close, row.date];
  }
  return prices;
}

export interface PriceRefreshSummary {
  total: number; fresh: number; yahoo: number; ok: boolean;
  exchangeFailures: Array<{ exchange: string; error: string }>;
  quoteFailures: Array<{ id: string; error: string }>;
  missing: string[];
}

// A week permits weekends and exchange holidays, but rejects suspended/stale quotes.
export function freshPrice(quote: PriceMap[string], now = Date.now()): boolean {
  const today = new Date(now).toISOString().slice(0, 10);
  return validPrice(quote[0], quote[1]) && quote[1] <= today
    && Date.parse(quote[1]) >= Date.parse(today) - 7 * 86400000;
}

function checkDisk(): void {
  const disk = statfsSync('/');
  if (disk.bavail * disk.bsize < 5 * 1024 ** 3) throw new Error('Disk below 5 GB; stopping');
}

/** Country indexes define the published population; default.json is only a subset. */
export function publishedPriceCompanies(repo: string, universe: Company[]): Company[] {
  const ids = new Set<string>();
  for (const file of readdirSync(path.join(repo, 'index')).filter(f => /^[A-Z]{2}\.json$/.test(f))) {
    const rows = JSON.parse(readFileSync(path.join(repo, 'index', file), 'utf8')) as Array<{ id: string }>;
    for (const row of rows) ids.add(row.id);
  }
  const companies = new Map(universe.filter(c => ids.has(c.id)).map(c => [c.id, c]));
  if (companies.size < ids.size) {
    for (const file of readdirSync(path.join(repo, 'dossiers')).filter(f => /^\d{3}\.json$/.test(f))) {
      const rows = JSON.parse(readFileSync(path.join(repo, 'dossiers', file), 'utf8')) as Record<string, { company: Company }>;
      for (const [id, row] of Object.entries(rows)) if (ids.has(id) && !companies.has(id)) companies.set(id, row.company);
    }
  }
  for (const id of ids) if (!companies.has(id)) throw new Error(`Missing published price identity: ${id}`);
  return [...companies.values()];
}

export async function refreshPrices({ repo, companies, bulk = bulkLastDay, yahoo = yahooPrice, now = Date.now() }: {
  repo: string;
  companies: Company[];
  bulk?: (exchange: string) => Promise<unknown>;
  yahoo?: (company: Company) => Promise<[number, string]>;
  now?: number;
}): Promise<PriceRefreshSummary> {
  const updates: PriceMap = {};
  const summary: PriceRefreshSummary = { total: companies.length, fresh: 0, yahoo: 0, ok: false, exchangeFailures: [], quoteFailures: [], missing: [] };
  const exchanges = [...new Set(companies.filter(c => !c.id.endsWith('.JP') && c.source !== 'esef').map(c => c.exchange))].sort();
  for (const exchange of exchanges) {
    checkDisk();
    try {
      const prices = parseBulkPrices({ rows: await bulk(exchange), companies: companies.filter(c => c.exchange === exchange) });
      for (const [id, quote] of Object.entries(prices)) if (freshPrice(quote, now)) updates[id] = quote;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      summary.exchangeFailures.push({ exchange, error: message });
      console.warn(`prices: exchange ${exchange} failed: ${message}; falling back to Yahoo`);
    }
  }
  // Also cover missing/stale rows in an otherwise successful bulk response.
  for (const company of companies.filter(c => !updates[c.id])) {
    checkDisk();
    try {
      const quote = await yahoo(company);
      if (!freshPrice(quote, now)) throw new Error('Invalid or stale Yahoo quote');
      updates[company.id] = quote;
      summary.yahoo++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      summary.quoteFailures.push({ id: company.id, error: message });
      console.warn(`prices: skipped ${company.id}: ${message}`);
    }
  }
  const byCountry = new Map<string, PriceMap>();
  const refreshed = new Set<string>();
  for (const company of companies) {
    const update = updates[company.id];
    if (!update) continue;
    if (!/^[A-Z]{2}$/.test(company.country)) throw new Error("Invalid price country");
    let prices = byCountry.get(company.country);
    if (!prices) {
      const file = path.join(repo, "prices", `${company.country}.json`);
      prices = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) as PriceMap : {};
      byCountry.set(company.country, prices);
    }
    if (!prices[company.id] || prices[company.id][2] === "seed" || prices[company.id][1] <= update[1]) {
      prices[company.id] = update;
      refreshed.add(company.id);
    }
  }
  for (const [country, prices] of byCountry) {
    const file = path.join(repo, "prices", `${country}.json`);
    const serialized = JSON.stringify(Object.fromEntries(Object.entries(prices).sort(([a], [b]) => a.localeCompare(b)))) + "\n";
    if (existsSync(file) && readFileSync(file, "utf8") === serialized) continue;
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(`${file}.tmp`, serialized); renameSync(`${file}.tmp`, file);
  }
  refreshPublishedBuyPrices(repo);
  summary.fresh = refreshed.size;
  summary.missing = companies.filter(c => !refreshed.has(c.id)).map(c => c.id);
  summary.ok = summary.total > 0 && summary.fresh / summary.total >= 0.95;
  console.log(`prices summary: ${summary.fresh}/${summary.total} fresh (${(100 * summary.fresh / (summary.total || 1)).toFixed(2)}%); Yahoo ${summary.yahoo}; failed exchanges ${summary.exchangeFailures.map(f => f.exchange).join(',') || 'none'}; missing ${summary.missing.length}; status=${summary.ok ? 'ok' : 'partial'}`);
  return summary;
}

export function commitPrices({ repo, asOf }: { repo: string; asOf: string }): boolean {
  if (!git(repo, ["status", "--porcelain", "--", "prices/", "index/", "meta.json", "dossiers/", "views/"])) return false;
  git(repo, ["add", "--", ...["prices/", "index/", "meta.json", "dossiers/", "views/"].filter(file => existsSync(path.join(repo, file)))]);
  git(repo, ["commit", "-m", `prices ${asOf}`]);
  return true;
}

export default async function prices(options: { only?: string[]; limit?: number; force?: boolean }): Promise<void> {
  checkDisk();
  const universe = universeCompanies();
  const today = new Date().toISOString().slice(0, 10);
  async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const file = `raw/prices/${key}.json`;
    const existing = readCorpusJson<{ date: string; data: T }>(file);
    if (!options.force && existing?.date === today) return existing.data;
    const data = await fetcher(); writeCorpusJson(file, { date: today, data }); return data;
  }
  try { await callsUsedToday(); } catch (error) { console.warn(`prices: usage check failed; attempting cached quotes and Yahoo: ${String(error)}`); }
  await withPublishRepository(async (repo) => {
    const companies = publishedPriceCompanies(repo, universe).filter(c => !options.only || options.only.includes(c.id)).slice(0, options.limit);
    if (!companies.length) throw new Error('No published companies selected for prices');
    const summary = await refreshPrices({ repo, companies,
      bulk: (exchange) => cached(`eodhd-${encodeURIComponent(exchange)}`, () => bulkLastDay(exchange)),
      yahoo: (company) => cached(`yahoo-${encodeURIComponent(company.id)}`, () => yahooPrice(company)),
    });
    writeCorpusJson(`prices-runs/${new Date().toISOString().replaceAll(':', '-')}.json`, summary);
    checkDisk();
    const changed = commitPrices({ repo, asOf: today });
    pushRepository(repo, false);
    console.log(`prices: ${companies.length} published companies, ${changed ? "committed updated quotes" : "unchanged quotes"}`);
    if (!summary.ok) throw new Error(`Fresh price coverage below 95%: ${summary.fresh}/${summary.total}; successful updates published`);
  });
}
