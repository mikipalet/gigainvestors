import type { ActivityQuarter } from "../dataroma/parse-activity";
import type { HistRow } from "../dataroma/parse-hist";
import { mapActivity, type HoldingsPage } from "../dataroma/parse-holdings";
import { compareQ, prevQ } from "../quarters";
import type { InvestorData, Position, Quarter } from "../types";

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
      });
    }
  }

  for (const aq of activity) {
    for (const it of aq.items) {
      if (it.kind !== "Sell") continue;
      const before = byQ.get(prevQ(aq.q))?.get(it.ticker);
      if (!before || byQ.get(aq.q)?.has(it.ticker)) continue;
      put(aq.q, { ticker: it.ticker, name: it.name || before.name, shares: 0, pct: 0, value: before.value, activity: "sold" });
    }
  }

  const quarters: Quarter[] = [];
  for (const [q, map] of byQ) {
    const positions = [...map.values()].sort((a, b) => b.value - a.value);
    const live = positions.filter((p) => p.activity !== "sold");
    const sumPct = live.reduce((s, p) => s + p.pct, 0);
    if (sumPct <= 0) continue;
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
