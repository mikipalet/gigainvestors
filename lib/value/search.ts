import { rankItems } from "../search/rank";
import type { Company, SearchRow, SearchShard } from "./types";

export const SEARCH_KEYS = "0123456789abcdefghijklmnopqrstuvwxyz";
const stopWords = new Set("inc incorporated ltd limited plc sa ag corp corporation holdings holding co company nv".split(" "));

export function normalizeSearch(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function nameWords(name: string): string[] {
  // Remove periods first so S.A. and N.V. are treated as corporate suffixes.
  return normalizeSearch(name).replace(/\./g, "").split(/[^a-z0-9]+/).filter(word => word && !stopWords.has(word));
}

function aliases(company: Company): string[] {
  return [...new Set([company.code, ...company.listings.map(id => id.slice(0, id.lastIndexOf("."))), company.isin ?? ""]
    .map(normalizeSearch).filter(Boolean))].sort();
}

export function searchTokens(company: Company): string[] {
  return [...new Set([...nameWords(company.name), ...aliases(company)])];
}

/** Each company appears once in each matching first-character shard. */
export function buildSearchShards(companies: Company[], analysed: ReadonlySet<string>): Record<string, SearchShard> {
  const shards = Object.fromEntries([...SEARCH_KEYS].map(key => [key, { rows: [], aliases: {} } as SearchShard]));
  for (const company of [...companies].sort((a, b) => a.id.localeCompare(b.id))) {
    const codes = aliases(company);
    const keys = new Set(searchTokens(company).map(token => token[0]).filter(key => SEARCH_KEYS.includes(key)));
    const cap = company.marketCapUsd;
    const row: SearchRow = [company.id, company.name, company.country, analysed.has(company.id) ? "a" : "p",
      cap != null && Number.isFinite(cap) ? Number(cap.toPrecision(2)) : null];
    for (const key of keys) {
      const shard = shards[key];
      const offset = shard.rows.length;
      shard.rows.push(row);
      for (const code of codes.filter(code => code[0] === key)) (shard.aliases[code] ??= []).push(offset);
    }
  }
  return shards;
}

/** Pure adapter for the shared palette ranker; usable by the later UI integration. */
export function searchShard(shard: SearchShard, query: string, limit = 12): SearchRow[] {
  const rowAliases: string[][] = shard.rows.map(() => []);
  for (const [alias, offsets] of Object.entries(shard.aliases)) {
    for (const offset of offsets) rowAliases[offset].push(alias);
  }
  return rankItems(shard.rows.map((row, i) => ({
    value: row,
    fields: [nameWords(row[1]).join(" "), ...nameWords(row[1])].map(text => ({ text })),
    aliases: rowAliases[i],
    marketCap: row[4],
  })), query, { normalize: normalizeSearch, marketCapTiebreak: true, limit });
}
