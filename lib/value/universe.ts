import type { Id, Kind } from "./types";

export const exchangeCountries: Record<string, string> = {
  US: "US", LSE: "GB", NEO: "CA", V: "CA", TO: "CA", F: "DE", STU: "DE", MU: "DE",
  HA: "DE", DU: "DE", HM: "DE", XETRA: "DE", LU: "LU", VI: "AT", PA: "FR", BR: "BE",
  SW: "CH", MC: "ES", LS: "PT", AS: "NL", CO: "DK", ST: "SE", OL: "NO", HE: "FI",
  IR: "IE", VFEX: "ZW", XZIM: "ZW", PR: "CZ", XBOT: "BW", LUSE: "ZM", EGX: "EG",
  GSE: "GH", USE: "UG", XNAI: "KE", RSE: "RW", DSE: "TZ", BC: "MA", SEM: "MU",
  MSE: "MW", XNSA: "NG", KQ: "KR", KO: "KR", BUD: "HU", WAR: "PL", PSE: "PH",
  BK: "TH", AU: "AU", SHE: "CN", AT: "GR", SHG: "CN", JK: "ID", JSE: "ZA", KAR: "PK",
  SN: "CL", CM: "LK", VN: "VN", KLSE: "MY", RO: "RO", BA: "AR", SA: "BR", MX: "MX",
  ZSE: "HR", TW: "TW", TWO: "TW", LIM: "PE", HK: "HK", SG: "SG", JP: "JP", TSE: "JP",
};

export function isCommonStock(row: { Type: string; Name: string }): boolean {
  return row.Type === "Common Stock" && !/\b(ETF|FUND|TRUST UNITS|WARRANT|RIGHTS|PREFERRED|PFD|ACQUISITION CORP|SPAC)\b/i.test(row.Name);
}

interface Listing { code: string; exchange: string; isin: string | null; name: string; country?: string }

function normalizedName(name: string): string {
  return name.toLowerCase().replace(/\bclass\s+[a-z0-9]+\b/g, "")
    .replace(/\b(new york registry shares|ordinary shares|common stock|adr)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function collapseListings(rows: Listing[]): Array<{ primary: Id; listings: Id[] }> {
  const parents = rows.map((_, i) => i);
  const root = (i: number): number => {
    while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; }
    return i;
  };
  const keys = new Map<string, number>();
  rows.forEach((row, i) => {
    const country = row.isin?.slice(0, 2) ?? row.country ?? exchangeCountries[row.exchange] ?? row.exchange;
    const aliases = [`name:${country}:${normalizedName(row.name)}`];
    if (row.isin) aliases.push(`isin:${row.isin.slice(0, 2)}:${row.isin.slice(2, 11)}`);
    for (const key of aliases) {
      const previous = keys.get(key);
      if (previous !== undefined) parents[root(i)] = root(previous);
      keys.set(key, i);
    }
  });
  const groups = new Map<number, Listing[]>();
  rows.forEach((row, i) => { const key = root(i); groups.set(key, [...(groups.get(key) ?? []), row]); });
  return [...groups.values()].map((group) => {
    const home = group.filter((row) => row.isin && exchangeCountries[row.exchange] === row.isin.slice(0, 2));
    const candidates = home.length ? home : group.filter((row) => row.exchange === "US");
    const choices = candidates.length ? candidates : group;
    const primary = choices.find((row) => /\bclass a\b/i.test(row.name)) ?? choices[0];
    return { primary: `${primary.code}.${primary.exchange}`, listings: [...new Set(group.map((row) => `${row.code}.${row.exchange}`))] };
  });
}

export function kindFor({ industry }: { sector: string | null; industry: string | null }): Kind {
  if (/bank/i.test(industry ?? "")) return "bank";
  if (/insurance/i.test(industry ?? "")) return "insurer";
  return "operating";
}
