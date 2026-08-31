import type { Activity, InvestorData } from "./types";

// Compact client payload: names once, positions as tuples, no shares.
const ACT: Activity[] = ["new", "add", "reduce", "hold", "sold"];
type Tuple = [string, number, number, number, number | null];
export interface InvestorWire {
  code: string;
  person: string;
  firm: string;
  names: Record<string, string>;
  quarters: [string, number, Tuple[]][];
}

export function toWire(d: InvestorData): InvestorWire {
  const names: Record<string, string> = {};
  const quarters = d.quarters.map((q) => {
    const rows: Tuple[] = q.positions.map((p) => {
      names[p.ticker] ??= p.name;
      return [p.ticker, p.pct, p.value, ACT.indexOf(p.activity), p.change];
    });
    return [q.q, q.total, rows] as [string, number, Tuple[]];
  });
  return { code: d.code, person: d.person, firm: d.firm, names, quarters };
}

export function fromWire(w: InvestorWire): InvestorData {
  return {
    code: w.code,
    person: w.person,
    firm: w.firm,
    quarters: w.quarters.map(([q, total, rows]) => ({
      q,
      total,
      positions: rows.map(([ticker, pct, value, a, change]) => ({ ticker, name: w.names[ticker] ?? ticker, shares: 0, pct, value, activity: ACT[a], change })),
    })),
  };
}
