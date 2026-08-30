import type { ActivityQuarter } from "../dataroma/parse-activity";
import type { HistRow } from "../dataroma/parse-hist";
import { mapActivity, type HoldingsPage } from "../dataroma/parse-holdings";
import { compareQ, prevQ } from "../quarters";
import type { InvestorData, Position, Quarter } from "../types";

export const parseChange = (raw: string): number | null => {
  const m = /^(Add|Reduce)\s+([\d.]+)%/i.exec(raw.trim());
  if (!m) return null;
  const n = Number(m[2]);
  return m[1].toLowerCase() === "add" ? n : -n;
};

export interface ReconstructInput {
  code: string;
  person: string;
  firm: string;
  holdings: HoldingsPage;
  hists: Record<string, HistRow[]>;
  names: Record<string, string>;
  activity: ActivityQuarter[];
}

export function buildInvestorData(input: ReconstructInput): InvestorData {
  const { holdings, hists, names, activity } = input;
  const byQ = new Map<string, Map<string, Position>>();
  const put = (q: string, p: Position) => {
    if (!byQ.has(q)) byQ.set(q, new Map());
    byQ.get(q)!.set(p.ticker, p);
  };

  for (const [ticker, rows] of Object.entries(hists)) {
    const sorted = [...rows].sort((a, b) => compareQ(a.q, b.q));
    sorted.forEach((r, i) => {
      if (r.shares <= 0) return;
      const activity = r.activity ? mapActivity(r.activity) : i === 0 ? "new" : "hold";
      put(r.q, {
        ticker,
        name: names[ticker] ?? ticker,
        shares: r.shares,
        pct: r.pct,
        value: Math.round(r.shares * r.price),
        activity,
        change: parseChange(r.activity),
      });
    });
  }

  if (holdings.period) {
    for (const h of holdings.positions) {
      const prev = byQ.get(holdings.period)?.get(h.ticker);
      put(holdings.period, {
        ticker: h.ticker,
        name: h.name,
        shares: h.shares,
        pct: h.pct,
        value: h.value,
        activity: h.activity ? mapActivity(h.activity) : prev?.activity ?? "hold",
        change: h.activity ? parseChange(h.activity) : prev?.change ?? null,
      });
    }
  }

  const ghost = (q: string, ticker: string, name: string) => {
    const before = byQ.get(prevQ(q))?.get(ticker);
    if (!before || byQ.get(q)?.has(ticker)) return;
    put(q, { ticker, name: name || before.name, shares: 0, pct: 0, value: before.value, activity: "sold", change: null });
  };

  // Exits come from hist sell rows first (activity pages cap at 10 for high-churn funds).
  for (const [ticker, rows] of Object.entries(hists)) {
    for (const r of rows) if (r.shares === 0 && /^sell/i.test(r.activity)) ghost(r.q, ticker, names[ticker] ?? ticker);
  }
  for (const aq of activity) {
    for (const it of aq.items) if (it.kind === "Sell") ghost(aq.q, it.ticker, it.name);
  }

  const quarters: Quarter[] = [];
  for (const [q, map] of byQ) {
    const positions = [...map.values()].sort((a, b) => b.value - a.value);
    const live = positions.filter((p) => p.activity !== "sold");
    const sumPct = live.reduce((s, p) => s + p.pct, 0);
    if (sumPct <= 0) {
      if (positions.length) quarters.push({ q, total: 0, positions });
      continue;
    }
    const sumVal = live.reduce((s, p) => s + p.value, 0);
    const total =
      q === holdings.period && holdings.portfolioValue > 0
        ? holdings.portfolioValue
        : Math.round(sumVal / (sumPct / 100));
    quarters.push({ q, total, positions });
  }
  quarters.sort((a, b) => compareQ(a.q, b.q));
  return { code: input.code, person: input.person, firm: input.firm, quarters };
}
