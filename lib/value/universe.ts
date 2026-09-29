import type { Id, Kind } from "./types";

import { exchangeCountries, offshoreDomiciles, secondaryVenues, lastResortVenues, offshoreVenueOrder, dualListedIssuers } from "./universe-config";
export { exchangeCountries } from "./universe-config";

export function isCommonStock(row: { Type: string; Name: string }): boolean {
  return row.Type === "Common Stock" && !/\b(ETF|FUND|TRUST UNITS|WARRANT|RIGHTS|PREF|PREFERRED|PFD|ACQUISITION CORP|SPAC)\b/i.test(row.Name);
}

interface Listing { code: string; exchange: string; isin: string | null; name: string; country?: string }

export function normalizedName(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(new york registry(?: shares)?|ordinary shares|common stock|class [a-z0-9]+|cl [ab])\b/g, " ")
    .replace(/\b(ltd|limited|co|company|corp|corporation|inc|plc|ag|sa|nv|se|spa|asa|ab|oyj|holdings|holding|group|adr|sponsored)\b/g, " ")
    .replace(/\s+/g, "");
}

const id = (row: Listing): Id => `${row.code}.${row.exchange}`;
const isinCountry = (row: Listing): string | undefined => row.isin?.slice(0, 2);
const listingCountry = (row: Listing): string => exchangeCountries[row.exchange] ?? row.country ?? row.exchange;

function primaryListing(group: Listing[]): Listing {
  // Even a domicile match on a secondary venue loses to a regular listing.
  const regular = group.filter((row) => !lastResortVenues.has(row.exchange));
  const choices = regular.length ? regular : group;
  const rank = (row: Listing): number => {
    if (isinCountry(row) === listingCountry(row)) return -2;
    if (offshoreDomiciles.has(isinCountry(row) ?? "")) {
      const index = offshoreVenueOrder.indexOf(row.exchange);
      return index < 0 ? offshoreVenueOrder.length : index;
    }
    return row.exchange === "US" ? -1 : offshoreVenueOrder.length;
  };
  return [...choices].sort((a, b) => rank(a) - rank(b)
    || Number(/\b(?:class|cl) a\b/i.test(b.name)) - Number(/\b(?:class|cl) a\b/i.test(a.name))
    || id(a).localeCompare(id(b)))[0];
}

function foreignSecondary(row: Listing): boolean {
  if (!secondaryVenues.has(row.exchange)) return false;
  if (row.exchange === "LSE" && !/^(?:0|\d{4}[a-z])/i.test(row.code)) return false;
  return !row.isin || isinCountry(row) !== listingCountry(row);
}

export function collapseListings(input: Listing[]): Array<{ primary: Id; listings: Id[] }> {
  const byId = new Map(input.map((row) => [id(row), row]));
  const rows = input.filter((row) => {
    if (/\b(CDR|BDR|DRN|NVDR|DR|CEDEAR|pref|preferred|pfd)\b|\(CAD Hedged\)/i.test(row.name)) return false;
    if (row.exchange === "SA" && /3[2-9]$/.test(row.code)) return false;
    if (row.exchange === "BK" && /[a-z]\d{2}$/i.test(row.code)) return false;
    if (row.exchange === "BA" && isinCountry(row) !== "AR") return false;
    if (["KO", "KQ"].includes(row.exchange) && row.code.endsWith("5")) {
      const ordinary = byId.get(`${row.code.slice(0, -1)}0.${row.exchange}`);
      if (ordinary && normalizedName(ordinary.name) === normalizedName(row.name)) return false;
    }
    return true;
  });
  const parents = rows.map((_, i) => i);
  const root = (i: number): number => {
    while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; }
    return i;
  };
  const keys = new Map<string, number>();
  rows.forEach((row, i) => {
    const country = isinCountry(row) ?? listingCountry(row);
    const name = normalizedName(row.name);
    const aliases = name ? [`name:${country}:${name}`] : [];
    if (row.isin) {
      aliases.push(`isin:${row.isin}`);
      if (dualListedIssuers[row.isin]) aliases.push(`dual:${dualListedIssuers[row.isin]}`);
    }
    for (const key of aliases) {
      const previous = keys.get(key);
      if (previous !== undefined) parents[root(i)] = root(previous);
      keys.set(key, i);
    }
  });
  const grouped = new Map<number, Listing[]>();
  rows.forEach((row, i) => {
    const key = root(i);
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  });
  const groups = [...grouped.values()].map((group) => {
    const primary = primaryListing(group);
    return group.filter((row) => !foreignSecondary(row)
      || (row === primary && offshoreDomiciles.has(isinCountry(row) ?? "")));
  }).filter((group) => group.length);

  // Only merge into an actual home listing. Ambiguous names remain separate.
  const homes = new Map<string, Set<number>>();
  groups.forEach((group, i) => {
    const primary = primaryListing(group);
    if (primary.exchange === "US" || isinCountry(primary) === "US") return;
    if (isinCountry(primary) !== listingCountry(primary) && !offshoreDomiciles.has(isinCountry(primary) ?? "")) return;
    for (const row of group) {
      const name = normalizedName(row.name);
      if (!name) continue;
      const matches = homes.get(name) ?? new Set<number>();
      matches.add(i);
      homes.set(name, matches);
    }
  });
  const merged = new Set<number>();
  const primaries = groups.map(primaryListing);
  const standaloneAdrs = new Map<string, Set<number>>();
  primaries.forEach((primary, i) => {
    if (primary.exchange !== "US" || isinCountry(primary) !== "US" || !/\bADR\b|New York Registry|Sponsored/i.test(primary.name)) return;
    const name = normalizedName(primary.name);
    const matches = standaloneAdrs.get(name) ?? new Set<number>();
    matches.add(i);
    standaloneAdrs.set(name, matches);
  });
  groups.forEach((group, i) => {
    const primary = primaries[i];
    // A real home cannot be displaced by a foreign listing with the same name.
    if ([...homes.get(normalizedName(primary.name)) ?? []].includes(i)) return;
    const matches = new Set<number>();
    for (const row of group) {
      const country = isinCountry(row);
      // Missing identifiers and US-ISIN receipts also occur on non-US venues
      // (e.g. Samsung's LSE receipts and unlabelled Canadian receipts).
      if (country === "US" || (!country && row.exchange !== "US")) {
        for (const home of homes.get(normalizedName(row.name)) ?? []) matches.add(home);
      }
      // Without a home venue (Japan), keep an existing US ADR as primary.
      if (row.exchange !== "US" && country !== listingCountry(row)
        && !homes.has(normalizedName(row.name))) {
        for (const adr of standaloneAdrs.get(normalizedName(row.name)) ?? []) matches.add(adr);
      }
    }
    if (matches.size !== 1 || matches.has(i)) return;
    const home = [...matches][0];
    groups[home].push(...group);
    merged.add(i);
  });
  const order = new Map(input.map((row, i) => [id(row), i]));
  return groups.flatMap((group, i) => merged.has(i) ? [] : [{
    primary: id(primaries[i]),
    listings: [...new Set(group.map(id))].sort((a, b) => order.get(a)! - order.get(b)!),
  }]);
}

export function kindFor({ industry }: { sector: string | null; industry: string | null }): Kind {
  if (/bank/i.test(industry ?? "")) return "bank";
  if (/insurance/i.test(industry ?? "")) return "insurer";
  return "operating";
}
