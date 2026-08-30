import { parseMoney, parseNumber, parseTables } from "./parse-tables";

export interface ManagerRow {
  code: string;
  label: string;
  portfolioValue: number;
  stockCount: number;
}

export function parseManagers(html: string): ManagerRow[] {
  const rows: ManagerRow[] = [];
  for (const table of parseTables(html)) {
    for (const r of table) {
      const code = r[0]?.href?.match(/holdings\.php\?m=([^&]+)/)?.[1];
      if (!code || r.length < 3) continue;
      rows.push({
        code,
        label: r[0].text,
        portfolioValue: parseMoney(r[1].text),
        stockCount: parseNumber(r[2].text),
      });
    }
  }
  return rows;
}
