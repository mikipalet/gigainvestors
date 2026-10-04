import { T } from "./config";
import type { Id, Kind } from "./types";

import { exchangeCountries, offshoreDomiciles, secondaryVenues, nonHomeVenues, lastResortVenues, offshoreVenueOrder, dualListedIssuers, adrUnderlyingIsins, cdiUnderlyingIsins, issuerNameAliases } from "./universe-config";
;

const isBrazilianClass = (row: { code: string; exchange: string }): boolean => row.exchange === "SA" && /^[A-Z]{4}[34]$/i.test(row.code);
const isDerivative = (code: string, name: string): boolean => /-(WT|WS|W|R|RT|U|UN)$|\.(WS|W|U)$/i.test(code) || /Warrant/i.test(name);

export function isCommonStock(row: { Type: string; Name: string; Code?: string; Exchange?: string }): boolean {
  const brazilianClass = isBrazilianClass({ code: row.Code ?? "", exchange: row.Exchange ?? "" });
  const equity = row.Type === "Common Stock" || /^(ADR|ADS|American Depositary (Receipt|Share)s?)$/i.test(row.Type)
    || (brazilianClass && row.Type === "Preferred Stock");
  return equity && !isDerivative(row.Code ?? "", row.Name) && !/\b(ETF|FUND|TRUST UNITS|WARRANT|RIGHTS|ACQUISITION CORP|SPAC)\b/i.test(row.Name)
    && (brazilianClass || !/\b(PREF|PREFERRED|PFD)\b/i.test(row.Name));
}

interface Listing { code: string; exchange: string; isin: string | null; name: string; country?: string; volume?: number | null; type?: string; listingExchange?: string }

export function normalizedName(name: string, listing?: { code: string; exchange: string }): string {
  // A ticker-only vendor name also carries the Brazilian share-class digit.
  const issuer = listing && isBrazilianClass(listing)
    ? name.replace(new RegExp(`^${listing.code}$`, "i"), listing.code.slice(0, -1)).replace(/\s+[34]$/, "").replace(/\b(on|pn|pref|preferred|pfd)\b/gi, " ") : name;
  const stem = issuer.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/\bag na\b/g, "ag")
    .replace(/\ba\/s\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b((?:american |global )?depositary(?: shares| receipts)?|new york registry(?: shares)?|ordinary shares|common stock|class [a-z0-9]+|cl [ab]|ser(?:ies)? [a-z0-9]+)\b/g, " ")
    .replace(/\b(ltd|limited|co|company|corp|corporation|inc|plc|ag|sa|nv|se|spa|asa|ab|oyj|holdings|holding|group|adr|ads|gdr|gds|sponsored)\b/g, " ")
    .replace(/\b[ab]\s*$/, " ")
    .replace(/\s+/g, "");
  return issuerNameAliases[stem] ?? stem;
}

export const isGlobalDepositary = (name: string): boolean => /\b(GDR|GDS|global depositary)/i.test(name);
const isAdr = (row: Listing): boolean => /\b(ADR|ADS)\b|Depositary|New York Registry|Sponsored/i.test([row.name, row.type, row.listingExchange].filter(Boolean).join(" ")) || /^[A-Z]{4}[YF]$/i.test(row.code);

const id = (row: Listing): Id => `${row.code}.${row.exchange}`;
const isinCountry = (row: Listing): string | undefined => (row.isin ? cdiUnderlyingIsins[row.isin] ?? row.isin : null)?.slice(0, 2);
const listingCountry = (row: Listing): string => exchangeCountries[row.exchange] ?? row.country ?? row.exchange;

function primaryListing(group: Listing[]): Listing {
  // Even a domicile match on a secondary venue loses to a regular listing.
  const regular = group.filter((row) => {
    if (row.exchange === "LSE" && /^(?:0|\d{4}[a-z])/i.test(row.code) && group.some(other => other.exchange !== "LSE" && !foreignSecondary(other))) return false;
    if (row.exchange === "SA") return isinCountry(row) === "BR";
    if (row.exchange === "MC" && row.code.startsWith("X") && group.some((other) =>
      other !== row && isinCountry(row) === listingCountry(other))) return false;
    return !lastResortVenues.has(row.exchange);
  });
  const nonNeo = group.filter((row) => row.exchange !== "NEO");
  const choices = regular.length ? regular : nonNeo.length ? nonNeo : group;
  const rank = (row: Listing): number => {
    if (isinCountry(row) === listingCountry(row)) return -2;
    if (offshoreDomiciles.has(isinCountry(row) ?? "")) {
      const index = offshoreVenueOrder.indexOf(row.exchange);
      return index < 0 ? offshoreVenueOrder.length : index;
    }
    return row.exchange === "US" ? -1 : offshoreVenueOrder.length;
  };
  // Resolve classes within each venue first; liquidity across venues does not
  // displace an issuer's home market. Brazil explicitly prefers ON over PN.
  const classRank = (row: Listing) => row.exchange === "SA" && /3$/.test(row.code) ? -1 : 0;
  const nordicRank = (row: Listing) => ["ST", "CO", "HE", "OL"].includes(row.exchange)
    && (/-B$/i.test(row.code) || /\b(?:ser\.?|series|class)?\s*b$/i.test(row.name)) ? -1 : 0;
  const volume = (row: Listing) => row.volume != null && Number.isFinite(row.volume) && row.volume >= 0 ? row.volume : -1;
  const venues = new Map<string, Listing[]>();
  for (const row of choices) venues.set(row.exchange, [...venues.get(row.exchange) ?? [], row]);
  const candidates = [...venues.values()].map(rows => [...rows].sort((a, b) => classRank(a) - classRank(b)
    || (volume(b) - volume(a))
    || nordicRank(a) - nordicRank(b) || id(a).localeCompare(id(b)))[0]);
  return candidates.sort((a, b) => rank(a) - rank(b) || id(a).localeCompare(id(b)))[0];
}

function foreignSecondary(row: Listing): boolean {
  if (!secondaryVenues.has(row.exchange)) return false;
  if (row.exchange === "LSE" && !/^(?:0|\d{4}[a-z])/i.test(row.code)) return false;
  return !row.isin || isinCountry(row) !== listingCountry(row);
}

export function collapseListings(input: Listing[]): Array<{ primary: Id; listings: Id[] }> {
  const japanese = input.filter(row => row.exchange === "JP");
  if (japanese.length) {
    // EDINET owns these identities and ADR aliases. The global heuristics strip
    // Japanese characters and can mistake a home for an unrelated foreign acronym.
    const order = new Map(input.map((row, index) => [id(row), index]));
    return [...collapseListings(input.filter(row => row.exchange !== "JP")),
      ...japanese.map(row => ({ primary: id(row), listings: [id(row)] }))]
      .sort((a, b) => order.get(a.primary)! - order.get(b.primary)!);
  }
  const byId = new Map(input.map((row) => [id(row), row]));
  const foreignHomeNames = new Set(input.filter((row) => row.exchange !== "BA" && !isAdr(row)
    && isinCountry(row) === listingCountry(row)).map((row) => normalizedName(row.name, row)));
  const eligible = input.filter((row) => {
    if (isDerivative(row.code, row.name)) return false;
    if (/\b(CDR|BDR|DRN|NVDR|DR|CEDEAR)\b|\(CAD Hedged\)/i.test(row.name)) return false;
    if (!isBrazilianClass(row) && /\b(pref|preferred|pfd)\b/i.test(row.name)) return false;
    if (row.exchange === "SA" && (/3[2-9]$/.test(row.code) || /\dF$/i.test(row.code))) return false;
    if (row.exchange === "BK" && /[a-z]\d{2}$/i.test(row.code)) return false;
    if (row.exchange === "BA" && (isinCountry(row) !== "AR" || /^ARDEUT/i.test(row.isin ?? "")
      || foreignHomeNames.has(normalizedName(row.name, row)))) return false;
    if (["KO", "KQ"].includes(row.exchange) && row.code.endsWith("5")) {
      const ordinary = byId.get(`${row.code.slice(0, -1)}0.${row.exchange}`);
      if (ordinary && normalizedName(ordinary.name, ordinary) === normalizedName(row.name, row)) return false;
    }
    return true;
  });
  const ordinaryNames = new Set(eligible.filter((row) => !isGlobalDepositary(row.name)).map((row) => normalizedName(row.name, row)));
  const ordinaryIsins = new Set(eligible.filter((row) => !isGlobalDepositary(row.name) && row.isin).map((row) => row.isin));
  const rows = eligible.filter((row) => !isGlobalDepositary(row.name)
    || !(ordinaryNames.has(normalizedName(row.name, row)) || (row.isin && ordinaryIsins.has(row.isin))));
  const parents = rows.map((_, i) => i);
  const root = (i: number): number => {
    while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; }
    return i;
  };
  const keys = new Map<string, number>();
  rows.forEach((row, i) => {
    const country = isinCountry(row) ?? listingCountry(row);
    const name = normalizedName(row.name, row);
    const aliases = name ? [`name:${country}:${name}`] : [];
    if (row.isin) {
      aliases.push(`isin:${cdiUnderlyingIsins[row.isin] ?? row.isin}`);
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
  const homeNames = new Map<string, Set<string>>();
  for (const row of rows) {
    if (isinCountry(row) !== listingCountry(row) || isAdr(row) || nonHomeVenues.has(row.exchange)) continue;
    const name = normalizedName(row.name, row);
    homeNames.set(name, new Set([...(homeNames.get(name) ?? []), listingCountry(row)]));
  }
  const groups = [...grouped.values()].map((group) => {
    const primary = primaryListing(group);
    return group.filter((row) => {
      // CDIs are retained as aliases of the US security (rule 4).
      if (row.exchange === "AU" && isinCountry(row) === "US" && group.some(other => other.exchange === "US")) return true;
      const country = isinCountry(row);
      const offshore = offshoreDomiciles.has(country ?? "");
      const homes = homeNames.get(normalizedName(row.name, row));
      const hasHome = group.some(other => other !== row && (country
        ? listingCountry(other) === country && (!other.isin || isinCountry(other) === country)
        : isinCountry(other) === listingCountry(other)))
        || (homes?.size === 1 && !homes.has(listingCountry(row)));
      if (row.exchange !== "US" && !offshore && country !== listingCountry(row) && hasHome) return false;
      return !foreignSecondary(row) || isGlobalDepositary(row.name) || (row === primary && offshore);
    });
  }).filter((group) => group.length);

  // Canadian identifiers on NEO receipts must not create a competing home.
  const neoTargets = new Map<string, Set<number>>();
  groups.forEach((group, i) => {
    const primary = primaryListing(group);
    if (primary.exchange === "NEO" || (primary.exchange !== "US"
      && isinCountry(primary) !== listingCountry(primary)
      && !offshoreDomiciles.has(isinCountry(primary) ?? ""))) return;
    for (const row of group) {
      const name = normalizedName(row.name, row);
      if (!name) continue;
      const matches = neoTargets.get(name) ?? new Set<number>();
      matches.add(i);
      neoTargets.set(name, matches);
    }
  });
  for (const group of groups) {
    if (primaryListing(group).exchange !== "NEO") continue;
    const matches = new Set(group.flatMap((row) => [...neoTargets.get(normalizedName(row.name, row)) ?? []]));
    const homes = [...matches].filter((i) => primaryListing(groups[i]).exchange !== "US");
    const targets = homes.length ? homes : [...matches];
    if (targets.length === 0) continue;
    // Do not guess between unrelated homes; discard the secondary NEO group.
    if (targets.length === 1) groups[targets[0]].push(...group);
    group.length = 0;
  }
  const retainedGroups = groups.filter((group) => group.length);
  groups.splice(0, groups.length, ...retainedGroups);

  // Only merge into an actual home listing. Ambiguous names remain separate.
  const homes = new Map<string, Set<number>>();
  groups.forEach((group, i) => {
    const primary = primaryListing(group);
    if (primary.exchange === "NEO" || primary.exchange === "US" || isinCountry(primary) === "US") return;
    if (isinCountry(primary) !== listingCountry(primary) && !offshoreDomiciles.has(isinCountry(primary) ?? "")) return;
    for (const row of group) {
      const name = normalizedName(row.name, row);
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
    if (primary.exchange !== "US" || isinCountry(primary) !== "US" || !isAdr(primary)) return;
    const name = normalizedName(primary.name, primary);
    const matches = standaloneAdrs.get(name) ?? new Set<number>();
    matches.add(i);
    standaloneAdrs.set(name, matches);
  });
  groups.forEach((group, i) => {
    const primary = primaries[i];
    // A real home cannot be displaced by a foreign listing with the same name.
    if ([...homes.get(normalizedName(primary.name, primary)) ?? []].includes(i)) return;
    const matches = new Set<number>();
    const ordinaryUs = group.some(row => row.exchange === "US" && isinCountry(row) === "US" && !isAdr(row));
    for (const row of group) {
      const underlying = row.exchange === "US" && row.isin ? adrUnderlyingIsins[row.isin] : undefined;
      if (underlying) {
        groups.forEach((candidate, index) => {
          if (candidate.some(home => home.isin === underlying && listingCountry(home) === isinCountry(home))) matches.add(index);
        });
      }
      if (ordinaryUs) continue;
      const country = isinCountry(row);
      // Missing identifiers and US-ISIN receipts also occur on non-US venues
      // (e.g. Samsung's LSE receipts and unlabelled Canadian receipts).
      if ((country === "US" && (row.exchange !== "US" || isAdr(row))) || (!country && row.exchange !== "US")) {
        for (const home of homes.get(normalizedName(row.name, row)) ?? []) matches.add(home);
      }
      // Without a home venue (Japan), keep an existing US ADR as primary.
      if (row.exchange !== "US" && country !== listingCountry(row)
        && !homes.has(normalizedName(row.name, row))) {
        for (const adr of standaloneAdrs.get(normalizedName(row.name, row)) ?? []) matches.add(adr);
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

export function kindFor({ id, industry, lending, sic }: {
  id?: string; sector: string | null; industry: string | null; sic?: string | number;
  lending?: { receivables: number | null; loans?: number | null; deposits?: number | null; clientAssets?: number | null; cash?: number | null; equity?: number | null; totalAssets: number | null };
}): Kind {
  if (id === "MCO.US" || /insurance.*broker/i.test(industry ?? "")) return "operating";
  if (Number(sic) >= 6310 && Number(sic) < 6400) return "insurer";
  if (/bank/i.test(industry ?? "")) return "bank";
  if (/^credit services$/i.test(industry ?? "") && id && T.kind.missingLoanBankIds.includes(id)
    && lending?.loans == null) return "bank";
  if (/^capital markets$/i.test(industry ?? '') && (lending?.deposits ?? 0) > 0) return 'bank';
  // Brokers may report client cash among cash/investments rather than loan assets.
  // Only infer that cash as client assets when it exceeds three times equity.
  const clientAssets = lending?.clientAssets ?? (/^capital markets$/i.test(industry ?? "")
    && (lending?.equity ?? 0) > 0 && (lending?.cash ?? 0) > 3 * lending!.equity! ? lending!.cash! : 0);
  if (/^(credit services|capital markets)$/i.test(industry ?? "") && lending?.totalAssets != null && lending.totalAssets > 0
    && ((lending.receivables ?? 0) + (lending.loans ?? 0) + clientAssets) / lending.totalAssets > T.kind.lendingAssetsRatio) return "bank";
  if (/insurance/i.test(industry ?? "")) return "insurer";
  return "operating";
}
