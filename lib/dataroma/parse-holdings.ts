import { normalizeQuarter } from "../quarters";
import { parseNumber, parseTables } from "./parse-tables";
import type { Activity } from "../types";

export interface HoldingRow {
  ticker: string;
  name: string;
  pct: number;
  shares: number;
  reportedPrice: number;
  value: number;
  activity: string;
}

export interface HoldingsPage {
  period: string;
  portfolioValue: number;
  positions: HoldingRow[];
}

export const splitStock = (text: string) => {
  const [ticker, ...rest] = text.split(" - ");
  return { ticker: ticker.trim(), name: rest.join(" - ").trim() || ticker.trim() };
};

export function mapActivity(raw: string): Activity {
  const s = raw.toLowerCase();
  if (s.startsWith("buy")) return "new";
  if (s.startsWith("add")) return "add";
  if (s.startsWith("reduce")) return "reduce";
  if (s.startsWith("sell")) return "sold";
  return "hold";
}

export function parseHoldings(html: string): HoldingsPage {
  const period = normalizeQuarter(/Period:\s*<span>\s*([^<]+)/i.exec(html)?.[1] ?? "") ?? "";
  const portfolioValue = parseNumber(/Portfolio value:\s*<span>\s*([^<]+)/i.exec(html)?.[1] ?? "");
  const positions: HoldingRow[] = [];
  for (const table of parseTables(html)) {
    for (const r of table) {
      const sym = r[1]?.href?.match(/sym=([^&]+)/)?.[1];
      if (!sym || r.length < 7) continue;
      const { name } = splitStock(r[1].text);
      positions.push({
        ticker: sym,
        name,
        pct: parseNumber(r[2].text),
        activity: r[3].text,
        shares: parseNumber(r[4].text),
        reportedPrice: parseNumber(r[5].text),
        value: parseNumber(r[6].text),
      });
    }
    if (positions.length) break;
  }
  return { period, portfolioValue, positions };
}
