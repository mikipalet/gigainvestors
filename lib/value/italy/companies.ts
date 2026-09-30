import { readJsonl } from "../corpus";
import { normalizedName, kindFor } from "../universe";
import type { Company } from "../types";

export const MILAN_LIST_URL =
  "https://live.euronext.com/product_directory/data/stocks-all-places/download?mics=MTAA%2CEXGM&format=csv";
/** RFC 4180 quoting, semicolon delimiter used by Euronext's official export. */
export function parseMilanCsv(text: string): Company[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === ";" || c === "\n")) {
      row.push(cell.replace(/\r$/, ""));
      cell = "";
      if (c === "\n") {
        rows.push(row);
        row = [];
      }
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const companies = new Map<string, Company>();
  const savings = /\s+(?:RISP|RSP|RISPARMIO|R)$/i;
  const ordinaryNames = new Set(
    rows.filter((r) => r.length > 4 && !savings.test(r[0])).map((r) => r[0]),
  );
  for (const [name, isin, code, market, currency] of rows) {
    if (
      !/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(isin ?? "") ||
      !code ||
      !/^Euronext (?:Growth )?Milan$/.test(market)
    )
      continue;
    if (
      !/^[\w.&-]+$/.test(code) ||
      /^(?:W |WARR(?:ANT)?\b|W\S+ \d{2}-\d{2}$)|\b(?:RIGHTS|PREF)\b/i.test(name)
    )
      continue;
    if (savings.test(name) && ordinaryNames.has(name.replace(savings, "")))
      continue;
    const id = `${code}.MI`;
    companies.set(id, {
      id,
      code,
      name,
      isin,
      exchange: "MI",
      listingExchange: market,
      country: "IT",
      currency,
      lei: null,
      cik: null,
      edinetCode: null,
      sector: null,
      industry: null,
      kind: kindFor({ sector: null, industry: null }),
      listings: [id],
      marketCapUsd: null,
      description: null,
      source: "esef",
    });
  }
  if (!companies.size) throw new Error("Euronext returned no Milan equities");
  return [...companies.values()];
}
export function mergeItalianCompanies({
  existing,
  incoming,
}: {
  existing: Company[];
  incoming: Company[];
}): { companies: Company[]; merged: Array<{ from: string; to: string }> } {
  const rows = [...existing];
  const normalized = new Map<Company, string>();
  const nameOf = (c: Company) => {
    let name = normalized.get(c);
    if (name === undefined) {
      name = normalizedName(c.name);
      normalized.set(c, name);
    }
    return name;
  };
  const merged: Array<{ from: string; to: string }> = [];
  // Only exact unique issuer names bridge ADR identifiers. LEI/ISIN always take precedence.
  const names = new Map<string, number>();
  for (const c of incoming) {
    const n = nameOf(c);
    names.set(n, (names.get(n) ?? 0) + 1);
  }
  for (const home of [...incoming].sort((a, b) => b.id.localeCompare(a.id))) {
    const matches = rows.filter(
      (c) =>
        c.id === home.id ||
        (home.lei && home.lei === c.lei) ||
        (home.isin && home.isin === c.isin) ||
        (c.exchange !== "MI" &&
          (c.country === "IT" ||
            c.isin?.startsWith("IT") ||
            /\b(ADR|ADS)\b|depositary/i.test(c.name) ||
            (c.exchange === "US" && /^[A-Z]{4}[YF]$/.test(c.code))) &&
          nameOf(home) !== "" &&
          names.get(nameOf(home)) === 1 &&
          nameOf(home) === nameOf(c) &&
          (!home.lei || !c.lei || home.lei === c.lei)),
    );
    const previous = matches.find((c) => c.id === home.id) ?? matches[0];
    const known = previous
      ? Object.fromEntries(
          Object.entries(previous).filter(([, v]) => v != null),
        )
      : {};
    const defined = Object.fromEntries(
      Object.entries(home).filter(([, v]) => v != null),
    );
    const company = {
      ...known,
      ...home,
      ...defined,
      marketCapUsd: home.marketCapUsd ?? previous?.marketCapUsd ?? null,
      cik: home.cik ?? previous?.cik ?? null,
      lei: home.lei ?? previous?.lei ?? null,
      sector: home.sector ?? previous?.sector ?? null,
      industry: home.industry ?? previous?.industry ?? null,
      description: home.description ?? previous?.description ?? null,
      kind:
        home.kind === "operating" ? (previous?.kind ?? home.kind) : home.kind,
      listings: [
        ...new Set([
          home.id,
          ...home.listings,
          ...matches.flatMap((c) => c.listings),
        ]),
      ],
    } as Company;
    for (const c of matches) {
      rows.splice(rows.indexOf(c), 1);
      if (c.id !== home.id) merged.push({ from: c.id, to: home.id });
    }
    rows.push(company);
  }
  return { companies: rows, merged };
}
export function retainItalianCompanies(companies: Company[]): Company[] {
  return mergeItalianCompanies({
    existing: companies,
    incoming: readJsonl<Company>("universe.jsonl").filter(
      (c) => c.source === "esef",
    ),
  }).companies;
}
