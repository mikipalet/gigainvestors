import { loadCompanies } from "../companies";
import { readCorpusJson } from "../corpus";
import type { Company } from "../types";
import { normalizedName } from "../universe";

// These words distinguish separate Japanese listed issuers (e.g. SoftBank and
// SoftBank Group); the global share-class normalizer intentionally drops them.
function issuerName(name: string): string {
  const qualifiers = name.normalize("NFKD").toLowerCase().match(/\b(?:holdings?|group)\b/g) ?? [];
  return `${normalizedName(name)}:${qualifiers.map(word => word === "group" ? word : "holding").join(",")}`;
}

export interface JapaneseIssuer { company: Company; englishName: string | null }
/** Exact, unique issuer identities only. Never fuzzy-match a Japanese conglomerate's name. */
export function mergeJapaneseCompanies({ existing, incoming }: { existing: Company[]; incoming: JapaneseIssuer[] }): {
  companies: Company[]; merged: Array<{from:string;to:string}>;
} {
  const homes = new Map(incoming.map(i => [i.company.id, { ...i.company, listings: [...i.company.listings] }]));
  const names = new Map<string, Set<string>>();
  const identitiesByKey = new Map<string, Set<string>>();
  for (const home of homes.values()) {
    const keys = [...home.listings.map(id => `listing:${id}`), ...(home.edinetCode ? [`edinet:${home.edinetCode}`] : []), ...(home.isin ? [`isin:${home.isin}`] : [])];
    for (const key of keys) identitiesByKey.set(key, new Set([...(identitiesByKey.get(key) ?? []), home.id]));
  }
  for (const issuer of incoming) {
    const name = issuer.englishName && issuerName(issuer.englishName);
    if (name) names.set(name, new Set([...(names.get(name) ?? []), issuer.company.id]));
  }
  const companies: Company[] = []; const merged: Array<{from:string;to:string}> = [];
  for (const old of existing) {
    if (old.exchange === "JP" && !homes.has(old.id)) { companies.push(old); continue; }
    const identities = new Set<string>();
    if (homes.has(old.id)) identities.add(old.id);
    for (const key of [`listing:${old.id}`, `edinet:${old.edinetCode}`, `isin:${old.isin}`]) {
      for (const id of identitiesByKey.get(key) ?? []) identities.add(id);
    }
    // Japanese ISIN receipts and US ADRs can both carry non-JP vendor country labels.
    if (identities.size === 0 && (old.country === "JP" || old.isin?.startsWith("JP") || /\b(?:ADR|ADS)\b|depositary|depository/i.test(old.name)
      || (old.exchange === "US" && (/^[A-Z]{4}[YF]$/.test(old.code)
        || /headquartered in [^.]*Japan\./i.test(old.description ?? ""))))) for (const id of names.get(issuerName(old.name)) ?? []) identities.add(id);
    if (identities.size !== 1) { companies.push(old); continue; }
    const home = homes.get([...identities][0])!;
    home.listings = [...new Set([home.id, ...home.listings, old.id, ...old.listings])];
    home.marketCapUsd ??= old.marketCapUsd;
    home.sector ??= old.sector; home.industry ??= old.industry;
    home.description ??= old.description;
    if (!home.isin && old.isin?.startsWith("JP")) home.isin = old.isin;
    home.cik ??= old.cik; home.lei ??= old.lei;
    if (home.kind === "operating" && old.kind !== "operating") home.kind = old.kind;
    if (old.id !== home.id) merged.push({from:old.id,to:home.id});
  }
  return { companies: [...companies,...homes.values()].sort((a,b) => a.id.localeCompare(b.id)), merged };
}

/** EODHD has no Tokyo listings; its universe refresh must retain the EDINET homes. */
export function retainJapaneseCompanies(companies: Company[]): Company[] {
  const incoming = loadCompanies({}).filter(c => c.source === "edinet").map(company => ({
    company, englishName: readCorpusJson<{ issuer: JapaneseIssuer }>(`raw/edinet/issuers/${company.id}.json`)?.issuer.englishName ?? null,
  }));
  return incoming.length ? mergeJapaneseCompanies({ existing: companies, incoming }).companies : companies;
}
