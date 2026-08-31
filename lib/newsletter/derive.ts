import { formatMoney } from "../format";
import { effectiveActivity } from "@/components/ChangeBadge";
import type { Activity, Index, InvestorData } from "../types";

export interface Move {
  code: string;
  person: string;
  slug: string;
  ticker: string;
  name: string;
  activity: Activity;
  change: number | null;
  dollars: number;
  value: number;
}

export interface ConsensusRow {
  ticker: string;
  name: string;
  count: number;
}

export interface IssueData {
  quarter: string;
  filed: number;
  total: number;
  moves: Move[];
  bought: ConsensusRow[];
  sold: ConsensusRow[];
  entrants: { code: string; person: string; ticker: string; name: string; value: number }[];
  exits: { code: string; person: string; ticker: string; name: string; value: number }[];
  aggregate: number;
  headline: string;
}

const dollarsMoved = (p: { value: number; change: number | null; activity: Activity }) => {
  if (p.activity === "new" || p.activity === "sold") return p.value;
  if (!p.change) return 0;
  return Math.abs(p.value - p.value / (1 + p.change / 100));
};

// Everything the issue says, derived from the same data the site draws.
export function deriveIssue(quarter: string, index: Index, investors: Record<string, InvestorData>): IssueData {
  const moves: Move[] = [];
  const bought = new Map<string, ConsensusRow>();
  const sold = new Map<string, ConsensusRow>();
  const entrants: IssueData["entrants"] = [];
  const exits: IssueData["exits"] = [];
  let filed = 0;
  let aggregate = 0;

  for (const meta of index.investors) {
    const d = investors[meta.code];
    const q = d?.quarters.find((x) => x.q === quarter);
    if (!q) continue;
    filed++;
    aggregate += q.total;
    for (const p of q.positions) {
      const activity = effectiveActivity(p.activity, p.change);
      if (activity === "hold") continue;
      const base = { code: meta.code, person: meta.person, slug: meta.slug, ticker: p.ticker, name: p.name };
      moves.push({ ...base, activity, change: p.change, dollars: dollarsMoved({ ...p, activity }), value: p.value });
      const bucket = activity === "new" || activity === "add" ? bought : sold;
      const row = bucket.get(p.ticker) ?? { ticker: p.ticker, name: p.name, count: 0 };
      row.count++;
      bucket.set(p.ticker, row);
      if (activity === "new" && p.value >= 1e8) entrants.push({ code: meta.code, person: meta.person, ticker: p.ticker, name: p.name, value: p.value });
      if (activity === "sold" && p.value >= 1e8) exits.push({ code: meta.code, person: meta.person, ticker: p.ticker, name: p.name, value: p.value });
    }
  }

  moves.sort((a, b) => b.dollars - a.dollars);
  entrants.sort((a, b) => b.value - a.value);
  exits.sort((a, b) => b.value - a.value);
  const top = (m: Map<string, ConsensusRow>) => [...m.values()].sort((a, b) => b.count - a.count || a.ticker.localeCompare(b.ticker)).slice(0, 8);
  const boughtTop = top(bought);
  const soldTop = top(sold);
  const lead = moves[0];
  const headline = lead
    ? `${lead.person} ${lead.activity === "new" ? "opened" : lead.activity === "sold" ? "closed" : lead.activity === "add" ? "added to" : "trimmed"} ${lead.ticker} (${formatMoney(lead.dollars)})`
    : `${filed} of ${index.investors.length} filed`;

  return {
    quarter,
    filed,
    total: index.investors.length,
    moves: moves.slice(0, 6),
    bought: boughtTop,
    sold: soldTop,
    entrants: entrants.slice(0, 6),
    exits: exits.slice(0, 6),
    aggregate,
    headline,
  };
}

// 13F deadline: 45 days after quarter end.
export function deadlineFor(quarter: string): Date {
  const [y, q] = quarter.split(" Q").map(Number);
  const end = new Date(Date.UTC(y, q * 3, 0));
  return new Date(end.getTime() + 45 * 86400000);
}

export function shouldSend(quarter: string, filed: number, total: number, now = new Date()): boolean {
  if (filed / total >= 0.8) return true;
  const grace = new Date(deadlineFor(quarter).getTime() + 3 * 86400000);
  return now > grace && filed >= Math.min(40, Math.floor(total / 2));
}
