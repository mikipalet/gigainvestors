import { normalizeQuarter } from "../quarters";
import { parseNumber, parseTables } from "./parse-tables";

export interface HistRow {
  q: string;
  shares: number;
  pct: number;
  activity: string;
  price: number;
}

export function parseHist(html: string): HistRow[] {
  const out: HistRow[] = [];
  for (const table of parseTables(html)) {
    for (const r of table) {
      const q = normalizeQuarter(r[0]?.text ?? "");
      if (!q || r.length < 6) continue;
      out.push({
        q,
        shares: parseNumber(r[1].text),
        pct: parseNumber(r[2].text),
        activity: r[3].text,
        price: parseNumber(r[5].text),
      });
    }
  }
  return out;
}
