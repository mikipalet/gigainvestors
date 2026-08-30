import { normalizeQuarter } from "../quarters";
import { splitStock } from "./parse-holdings";
import { parseNumber, parseTables } from "./parse-tables";

export type ActivityKind = "Buy" | "Add" | "Reduce" | "Sell";

export interface ActivityItem {
  ticker: string;
  name: string;
  kind: ActivityKind;
  shareChange: number;
}

export interface ActivityQuarter {
  q: string;
  items: ActivityItem[];
}

const kindOf = (s: string): ActivityKind | null => {
  const k = s.split(" ")[0];
  return k === "Buy" || k === "Add" || k === "Reduce" || k === "Sell" ? k : null;
};

export function parseActivity(html: string): ActivityQuarter[] {
  const out: ActivityQuarter[] = [];
  let cur: ActivityQuarter | null = null;
  for (const table of parseTables(html)) {
    for (const r of table) {
      if (r.length === 1) {
        const q = normalizeQuarter(r[0].text);
        if (q) {
          cur = { q, items: [] };
          out.push(cur);
        }
        continue;
      }
      const sym = r[1]?.href?.match(/sym=([^&]+)/)?.[1];
      const kind = kindOf(r[2]?.text ?? "");
      if (!sym || !kind || !cur) continue;
      cur.items.push({
        ticker: sym,
        name: splitStock(r[1].text).name,
        kind,
        shareChange: parseNumber(r[3].text),
      });
    }
  }
  return out;
}
