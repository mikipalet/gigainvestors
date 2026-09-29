import { marketCapCurrency } from "../../../lib/value/currency";
import { retainJapaneseCompanies } from "../../../lib/value/japan/companies";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { corpusPath, readCorpusJson, writeCorpusJson } from "../../../lib/value/corpus";
import { additionalExchanges, universeChecks } from "../../../lib/value/universe-config";
import { T } from "../../../lib/value/config";
import { createUsdRate } from "../../../lib/value/fx";
import { listExchanges, listSymbols, screenerPage, type ScreenerRow, type SymbolRow } from "../../../lib/value/eodhd";
import { collapseListings, isCommonStock, isGlobalDepositary, kindFor } from "../../../lib/value/universe";
import type { Company } from "../../../lib/value/types";

interface Options { only?: string[]; limit?: number; force?: boolean }

export default async function universe(options: Options): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const rel = `raw/eodhd/universe/${key}.json`;
    const existing = readCorpusJson<{ date: string; data: T }>(rel);
    if (!options.force && existing?.date === today) return existing.data;
    const data = await fetcher();
    writeCorpusJson(rel, { date: today, data });
    return data;
  }
  const discovered = await cached("exchanges", listExchanges);
  const exchanges = [...discovered, ...additionalExchanges.filter((extra) => !discovered.some((exchange) => exchange.Code === extra.Code))];
  const skip = new Set(["MONEY", "EUFUND", "GBOND", "FOREX", "CC"]);
  const rows: Array<SymbolRow & { exchange: string; country: string }> = [];
  const caps = new Map<string, ScreenerRow>();
  for (const exchange of exchanges) {
    if (skip.has(exchange.Code)) continue;
    if (options.only && !options.only.some((id) => id.endsWith(`.${exchange.Code}`))) continue;
    const symbols = await cached(`symbols-${exchange.Code}`, () => listSymbols(exchange.Code));
    for (const row of symbols) {
      if (!isCommonStock({ ...row, Exchange: exchange.Code })) continue;
      const otc = /OTC|PINK|GREY|OTCQ|OTCBB/i.test(row.Exchange + " " + exchange.Code);
      if (otc && !(row.Isin?.startsWith("JP") && /\bADR\b|depositary|depository/i.test(row.Name))) continue;
      rows.push({ ...row, exchange: exchange.Code, country: exchange.CountryISO2 });
    }
    for (let offset = 0; offset <= T.eodhd.screenerMaxOffset; offset += T.eodhd.screenerPageSize) {
      const page = await cached(`screener-${exchange.Code}-${offset}`, () => screenerPage({ offset, exchange: exchange.Code }));
      if (!page.length) break;
      for (const row of page) caps.set(`${row.code}.${row.exchange.toUpperCase()}`, row);
      if (offset + T.eodhd.screenerPageSize > T.eodhd.screenerMaxOffset) console.warn(`${exchange.Code}: screener pagination ceiling reached; unreturned caps remain null`);
    }
    if (options.limit && !options.only && rows.length >= options.limit) break;
  }
  const byId = new Map(rows.map((row) => [`${row.Code}.${row.exchange}`, row]));
  const groups = collapseListings(rows.map((row) => ({ code: row.Code, exchange: row.exchange, isin: row.Isin, name: row.Name, country: row.country, type: row.Type, listingExchange: row.Exchange,
    volume: caps.get(`${row.Code}.${row.exchange}`)?.avgvol_200d ?? caps.get(`${row.Code}.${row.exchange}`)?.avgvol_1d })));
  const usdRate = createUsdRate(options);
  let companies: Company[] = [];
  for (const group of groups) {
    if (options.only && !group.listings.some((id) => options.only!.includes(id))) continue;
    const row = byId.get(group.primary)!;
    const screen = caps.get(group.primary);
    const cap = isGlobalDepositary(row.Name) ? null : screen?.market_capitalization;
    const rate = cap != null ? await usdRate(marketCapCurrency(row.Currency)) : null;
    const sector = screen?.sector ?? null;
    const industry = screen?.industry ?? null;
    companies.push({
      id: group.primary, name: row.Name, code: row.Code, exchange: row.exchange,
      country: row.country, currency: row.Currency, isin: row.Isin ?? null,
      cik: null, lei: null, edinetCode: null, sector, industry, kind: kindFor({ sector, industry }),
      listings: group.listings, marketCapUsd: cap != null && Number.isFinite(cap) && rate !== null ? cap * rate : null,
      description: null, source: "eodhd",
    });
  }
  companies = retainJapaneseCompanies(companies);
  const largestUsCap = companies.reduce((largest, company) => company.country === "US"
    ? Math.max(largest, company.marketCapUsd ?? 0) : largest, 0);
  if (largestUsCap > 0) {
    const ceiling = largestUsCap * universeChecks.maxUsCapMultiple;
    for (const company of companies) {
      if (company.marketCapUsd !== null && company.marketCapUsd > ceiling) {
        console.warn(`universe: ${company.id} marketCapUsd=${company.marketCapUsd} exceeds ${universeChecks.maxUsCapMultiple}x largest US cap (${ceiling}); data error, set null`);
        company.marketCapUsd = null;
      }
    }
  }
  companies.sort((a, b) => (b.marketCapUsd ?? -Infinity) - (a.marketCapUsd ?? -Infinity) || a.id.localeCompare(b.id));
  const selected = options.limit ? companies.slice(0, options.limit) : companies;
  const destination = corpusPath("universe.jsonl");
  mkdirSync(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.tmp`;
  writeFileSync(temporary, selected.map((row) => JSON.stringify(row) + "\n").join(""));
  renameSync(temporary, destination);
  const counts: Record<string, number> = {};
  for (const company of selected) counts[company.country] = (counts[company.country] ?? 0) + 1;
  console.log(`universe: ${selected.length} companies; counts per country ${JSON.stringify(counts)}`);
}
