import { refreshPublishedBuyPrices } from '../../../lib/value/refresh-buy-prices';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readCorpusJson, readJsonl, writeCorpusJson } from "../../../lib/value/corpus";
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

export async function refreshPrices({ repo, companies, bulk = bulkLastDay, yahoo = yahooPrice }: {
  repo: string;
  companies: Company[];
  bulk?: (exchange: string) => Promise<unknown>;
  yahoo?: (company: Company) => Promise<[number, string]>;
}): Promise<void> {
  const updates: PriceMap = {};
  const exchanges = [...new Set(companies.filter((company) => !company.id.endsWith(".JP")).map((company) => company.exchange))].sort();
  for (const exchange of exchanges) {
    Object.assign(updates, parseBulkPrices({ rows: await bulk(exchange), companies: companies.filter((company) => company.exchange === exchange) }));
  }
  const japanese = companies.filter((company) => company.id.endsWith(".JP"));
  let succeeded = 0;
  for (const company of japanese) {
    try {
      const quote = await yahoo(company);
      if (!validPrice(quote[0], quote[1])) throw new Error("Invalid Yahoo quote");
      updates[company.id] = quote;
      succeeded++;
    } catch (error) {
      console.warn(`prices: skipped ${company.id}: ${error instanceof Error ? error.message : "Yahoo quote failed"}`);
    }
  }
  if (japanese.length && !succeeded) throw new Error("All Japanese quotes failed; prices aborted");
  const byCountry = new Map<string, PriceMap>();
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
    if (!prices[company.id] || prices[company.id][2] === "seed" || prices[company.id][1] <= update[1]) prices[company.id] = update;
  }
  for (const [country, prices] of byCountry) {
    const file = path.join(repo, "prices", `${country}.json`);
    const serialized = JSON.stringify(Object.fromEntries(Object.entries(prices).sort(([a], [b]) => a.localeCompare(b)))) + "\n";
    if (existsSync(file) && readFileSync(file, "utf8") === serialized) continue;
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(`${file}.tmp`, serialized); renameSync(`${file}.tmp`, file);
  }
  refreshPublishedBuyPrices(repo);
}

export function commitPrices({ repo, asOf }: { repo: string; asOf: string }): boolean {
  if (!git(repo, ["status", "--porcelain", "--", "prices/", "index/", "meta.json", "dossiers/"])) return false;
  git(repo, ["add", "--", ...["prices/", "index/", "meta.json", "dossiers/"].filter(file => existsSync(path.join(repo, file)))]);
  git(repo, ["commit", "-m", `prices ${asOf}`]);
  return true;
}

export default async function prices(options: { only?: string[]; limit?: number; force?: boolean }): Promise<void> {
  const companies = readJsonl<Company>("universe.jsonl").filter((company) => !options.only || options.only.includes(company.id)).slice(0, options.limit);
  if (!companies.length) throw new Error("No companies selected; run the universe stage before prices");
  const today = new Date().toISOString().slice(0, 10);
  async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const file = `raw/prices/${key}.json`;
    const existing = readCorpusJson<{ date: string; data: T }>(file);
    if (!options.force && existing?.date === today) return existing.data;
    const data = await fetcher(); writeCorpusJson(file, { date: today, data }); return data;
  }
  await callsUsedToday();
  await withPublishRepository(async (repo) => {
    await refreshPrices({ repo, companies,
      bulk: (exchange) => cached(`eodhd-${encodeURIComponent(exchange)}`, () => bulkLastDay(exchange)),
      yahoo: (company) => cached(`yahoo-${encodeURIComponent(company.id)}`, () => yahooPrice(company)),
    });
    const changed = commitPrices({ repo, asOf: today });
    pushRepository(repo, false);
    console.log(`prices: ${companies.length} companies, ${changed ? "committed updated quotes" : "unchanged quotes"}`);
  });
}
