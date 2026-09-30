import { bestWesternListing } from "./western";
import { rankItems, type RankItem } from "../search/rank";
import type { Company, SearchRow, SearchShard } from "./types";

import { SEARCH_KEYS, SEARCH_CHARACTERS, normalizeSearch, type SearchManifest } from "./search-shard";
const stopWords = new Set("inc incorporated ltd limited plc sa ag corp corporation holdings holding co company nv".split(" "));

function nameWords(name: string): string[] {
  // Remove periods first so S.A. and N.V. are treated as corporate suffixes.
  return normalizeSearch(name).replace(/\./g, "").split(/[^a-z0-9]+/).filter(word => word && !stopWords.has(word));
}

function aliases(company: Company): string[] {
  return [...new Set([company.code, ...company.listings.map(id => id.slice(0, id.lastIndexOf("."))), company.isin ?? "", company.nameLocal ?? company.nativeName ?? ""]
    .map(normalizeSearch).filter(Boolean))].sort();
}

export function searchTokens(company: Company): string[] {
  return [...new Set([...nameWords(company.nameEn ?? company.name), ...nameWords(company.nameLocal ?? company.nativeName ?? ""), ...aliases(company)])];
}

/** Legacy base-prefix helper. Clients must use shardKeyFor(query, manifest). */
export function searchShardKey(query: string): string {
  const token = normalizeSearch(query.trim());
  return token.length === 1 ? `${token}_` : token.slice(0, 2);
}

const MAX_SHARD_BYTES = 60_000;
const HEAD_ROWS = 300;
type Entry = { row: SearchRow; tokens: string[]; codes: string[]; cap: number };

function payload(entries: Entry[]): SearchShard {
  const shard: SearchShard = { rows: [], aliases: {} };
  for (const entry of entries) {
    const offset = shard.rows.length;
    shard.rows.push(entry.row);
    for (const code of entry.codes) (shard.aliases[code] ??= []).push(offset);
  }
  return shard;
}

function rawBytes(shard: SearchShard): number {
  return new TextEncoder().encode(JSON.stringify(shard) + "\n").length;
}

/** Every split retains a top-cap head; all possible children exist, even when empty. */
export function buildAdaptiveSearchShards(companies: Company[], analysed: ReadonlySet<string>): {
  shards: Record<string, SearchShard>; manifest: SearchManifest;
} {
  const shards: Record<string, SearchShard> = {};
  const manifest: SearchManifest = { version: 1, split: [], maxPrefix: 2 };
  const entries: Entry[] = [...companies].sort((a, b) => a.id.localeCompare(b.id)).map(company => {
    const cap = company.marketCapUsd;
    return {
      row: [company.id, company.nameEn ?? company.name, company.country, analysed.has(company.id) ? "a" : "p",
        cap != null && Number.isFinite(cap) ? Number(cap.toPrecision(2)) : null, bestWesternListing(company)],
      cap: cap != null && Number.isFinite(cap) ? cap : -Infinity,
      tokens: searchTokens(company), codes: aliases(company),
    };
  });
  function head(key: string, entries: Entry[]): void {
    const top = [...entries].sort((a, b) => b.cap - a.cap || a.row[0].localeCompare(b.row[0])).slice(0, HEAD_ROWS);
    const shard = payload(top);
    // Do not silently violate either the byte budget or the top-300 contract.
    if (rawBytes(shard) > MAX_SHARD_BYTES) throw new Error(`Search head ${key} exceeds 60000 bytes`);
    shards[key] = shard;
  }
  function visit(prefix: string, entries: Entry[]): void {
    manifest.maxPrefix = Math.max(manifest.maxPrefix, prefix.length);
    const shard = payload(entries);
    if (rawBytes(shard) <= MAX_SHARD_BYTES) {
      shards[prefix] = shard;
      return;
    }
    manifest.split.push(prefix);
    head(prefix, entries);
    // Exact tokens stop here and remain represented by the head. They cannot
    // be partitioned by a longer prefix. Longer tokens continue recursively.
    for (const char of SEARCH_CHARACTERS) {
      const key = prefix + char;
      const children = entries.filter(entry => entry.tokens.some(token => token.startsWith(key)))
        .map(entry => ({ ...entry, codes: entry.codes.filter(code => code.startsWith(key)) }));
      visit(key, children);
    }
  }
  for (const first of SEARCH_KEYS) {
    const matching = entries.filter(entry => entry.tokens.some(token => token.startsWith(first)))
      .map(entry => ({ ...entry, codes: entry.codes.filter(code => code.startsWith(first)) }));
    head(`${first}_`, matching);
    for (const second of SEARCH_CHARACTERS) {
      const prefix = first + second;
      visit(prefix, matching.filter(entry => entry.tokens.some(token => token.startsWith(prefix)))
        .map(entry => ({ ...entry, codes: entry.codes.filter(code => code.startsWith(prefix)) })));
    }
  }
  // Non-Latin aliases use UTF-8-safe filenames and the same 60 KB budget.
  const local = entries.filter(e => e.codes.some(code => /^\p{L}/u.test(code) && !SEARCH_KEYS.includes(code[0])));
  const firsts = new Set(local.flatMap(e => e.codes.filter(code => /^\p{L}/u.test(code) && !SEARCH_KEYS.includes(code[0])).map(code => [...code][0])));
  function visitLocal(prefix: string, matching: Entry[]): void {
    const key = 'u' + [...prefix].map(c=>c.codePointAt(0)!.toString(16)).join('_');
    (manifest.localPrefixes ??= {})[prefix] = key;
    const data = payload(matching);
    if (rawBytes(data) <= MAX_SHARD_BYTES) { shards[key] = data; return; }
    head(key, matching);
    const next = new Set(matching.flatMap(e=>e.codes.filter(c=>c.startsWith(prefix) && c.length>prefix.length).map(c=>[...c.slice(prefix.length)][0])));
    for (const char of next) visitLocal(prefix+char, matching.filter(e=>e.codes.some(c=>c.startsWith(prefix+char))));
  }
  for (const first of firsts) visitLocal(first, local.filter(e=>e.codes.some(c=>c.startsWith(first))));
  manifest.split.sort();
  return { shards, manifest };
}

export function buildSearchShards(companies: Company[], analysed: ReadonlySet<string>): Record<string, SearchShard> {
  return buildAdaptiveSearchShards(companies, analysed).shards;
}

/** Pure adapter for the shared palette ranker; usable by the later UI integration. */
const rankedShards=new WeakMap<SearchShard,RankItem<SearchRow>[]>();
export function searchShard(shard: SearchShard, query: string, limit = 12): SearchRow[] {
  let items=rankedShards.get(shard);
  if(!items){
  const rowAliases: string[][] = shard.rows.map(() => []);
  for (const [alias, offsets] of Object.entries(shard.aliases)) {
    for (const offset of offsets) rowAliases[offset].push(alias);
  }
  items=shard.rows.map((row, i) => ({
    value: row,
    fields: [nameWords(row[1]).join(" "), ...nameWords(row[1])].map(text => ({ text })),
    aliases: rowAliases[i],
    marketCap: row[4],
  }));
  rankedShards.set(shard,items);
  }
  return rankItems(items, query, { normalize: normalizeSearch, marketCapTiebreak: true, limit });
}
