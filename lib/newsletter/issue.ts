import { effectiveActivity } from "@/components/ChangeBadge";
import { formatMoney } from "../format";
import { prevQ } from "../quarters";
import type { Activity, Index, InvestorData, Position, StockData } from "../types";

// The facts an issue may talk about, derived from the data the site draws. The writer
// (write.ts) may only use what is here, and the verifier holds it to that.

export interface MoveFacts {
  ticker: string;
  name: string;
  activity: Activity;
  change: number | null;
  dollars: number;
  valueNow: number;
  impactPts: number;
  pctNow: number;
  rank: number | null;
  heldSince: string | null;
  othersBought: string[];
  othersSold: string[];
}

export interface InvestorFacts {
  code: string;
  slug: string;
  person: string;
  firm: string;
  total: number;
  totalBefore: number;
  positions: number;
  trades: number;
  turnoverPct: number;
  top5NowPct: number;
  top5BeforePct: number;
  top5LowestSince: string | null;
  top5HighestSince: string | null;
  moves: MoveFacts[];
}

export interface Consensus {
  ticker: string;
  name: string;
  buyers: string[];
  sellers: string[];
  holdersNow: number;
  holdersBefore: number;
  priceMovePct: number | null;
}

export interface Facts {
  quarter: string;
  filed: number;
  active: number;
  aggregate: number;
  aggregateBefore: number;
  nextDeadline: string;
  absentees: { person: string; lastFiled: string }[];
  guards: string[];
  lead: { code: string; slug: string; person: string; ticker: string; name: string; dollars: number; activity: Activity; book: { ticker: string; value: number; activity: Activity; change: number | null }[] } | null;
  investors: InvestorFacts[];
  agreed: Consensus[];
  contested: Consensus[];
  crowd: { ticker: string; name: string; before: number; now: number }[];
  quiet: { person: string; positions: number }[];
}

const FAMOUS = ["BRK", "psc", "AM", "BAUPOST", "HC", "PI", "ic", "tci", "FS", "vg"];

export const canonical = (t: string) => {
  const s = t.replace(/-OLD$/, "");
  if (s === "GOOG") return "GOOGL";
  if (s === "BRK.A") return "BRK.B";
  return s;
};

export const lastName = (p: string) => p.split(" ").pop() ?? p;

export function deadlineFor(quarter: string): Date {
  const [y, q] = quarter.split(" Q").map(Number);
  const end = new Date(Date.UTC(y, q * 3, 0));
  return new Date(end.getTime() + 45 * 86400e3);
}

export function shouldSend(quarter: string, filed: number, total: number, now = new Date()): boolean {
  if (filed >= Math.ceil(total * 0.8)) return true;
  const grace = new Date(deadlineFor(quarter).getTime() + 3 * 86400e3);
  return now > grace && filed >= Math.min(40, Math.floor(total / 2));
}

interface Book {
  code: string;
  person: string;
  firm: string;
  slug: string;
  now: Map<string, Position>;
  before: Map<string, Position>;
  total: number;
  totalBefore: number;
  history: { q: string; positions: Map<string, Position>; total: number }[];
}

function mergeClasses(positions: Position[]): Map<string, Position> {
  const m = new Map<string, Position>();
  for (const p of positions) {
    const k = canonical(p.ticker);
    if (p.activity === "sold" && p.shares === 0 && p.pct === 0) {
      if (!m.has(k)) m.set(k, { ...p, ticker: k });
      continue;
    }
    const cur = m.get(k);
    if (!cur || cur.activity === "sold") m.set(k, { ...p, ticker: k });
    else m.set(k, { ...cur, shares: cur.shares + p.shares, pct: cur.pct + p.pct, value: cur.value + p.value, activity: cur.activity === "hold" ? p.activity : cur.activity, change: cur.change ?? p.change });
  }
  return m;
}

// A book that collapsed with every position cut by the same amount, or mostly marked sold,
// is a reporting change (a fund restructuring, a partial filing), not a quarter of trades.
const reportingArtifact = (b: Book): "uniform" | "partial" | null => {
  if (b.totalBefore <= 0 || b.total / b.totalBefore > 0.2) return null;
  const all = [...b.now.values()];
  if (all.length >= 5 && all.filter((p) => p.activity === "sold").length / all.length >= 0.8) return "partial";
  const changes = all.filter((p) => p.activity !== "sold").map((p) => p.change).filter((c): c is number => c !== null);
  if (changes.length < 5) return null;
  const mode = Math.round(changes[0]);
  return changes.filter((c) => Math.abs(c - mode) <= 3).length / changes.length >= 0.85 ? "uniform" : null;
};

function moveDollars(now: Position | undefined, before: Position | undefined): { dollars: number; activity: Activity; change: number | null } {
  if (!now || now.activity === "sold") return { dollars: before?.value ?? now?.value ?? 0, activity: "sold", change: null };
  const activity = effectiveActivity(now.activity, now.change);
  if (activity === "new" || !before) return { dollars: now.value, activity: "new", change: null };
  if (activity === "hold") return { dollars: 0, activity: "hold", change: now.change };
  const price = now.shares > 0 ? now.value / now.shares : 0;
  const shareDelta = before.shares > 0 && now.shares > 0 ? Math.abs(now.shares - before.shares) : 0;
  const dollars = shareDelta > 0 ? shareDelta * price : now.change ? Math.abs(now.value - now.value / (1 + now.change / 100)) : 0;
  return { dollars, activity, change: now.change };
}

const live = (p: Position | undefined) => !!p && p.activity !== "sold";

const top5 = (map: Map<string, Position>) =>
  [...map.values()]
    .filter(live)
    .sort((x, y) => y.pct - x.pct)
    .slice(0, 5)
    .reduce((x, p) => x + p.pct, 0);

// First quarter of the unbroken run of holding that ends at the current quarter.
function heldSince(b: Book, ticker: string): string | null {
  let since: string | null = null;
  for (let i = b.history.length - 1; i >= 0; i--) {
    if (!live(b.history[i].positions.get(ticker))) break;
    since = b.history[i].q;
  }
  return since;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function buildFacts(quarter: string, index: Index, investors: Record<string, InvestorData>, stocks: Record<string, StockData>): Facts {
  const q0 = prevQ(quarter);
  const books: Book[] = [];
  const absentees: Facts["absentees"] = [];
  for (const meta of index.investors) {
    const d = investors[meta.code];
    const upto = d?.quarters.filter((x) => x.q <= quarter) ?? [];
    const qn = upto.find((x) => x.q === quarter);
    if (!qn) {
      const last = upto[upto.length - 1]?.q;
      if (last && last !== q0) absentees.push({ person: meta.person, lastFiled: last });
      continue;
    }
    const history = upto.map((x) => ({ q: x.q, positions: mergeClasses(x.positions), total: x.total }));
    const qb = history.find((x) => x.q === q0);
    books.push({ code: meta.code, person: meta.person, firm: meta.firm, slug: meta.slug, now: history[history.length - 1].positions, before: qb?.positions ?? new Map(), total: qn.total, totalBefore: qb?.total ?? 0, history });
  }
  const filed = books.length;
  const active = index.investors.length;

  const guards: string[] = [];
  const artifacts = new Set<string>();
  for (const b of books) {
    const kind = reportingArtifact(b);
    if (!kind) continue;
    artifacts.add(b.code);
    const sold = [...b.now.values()].filter((p) => p.activity === "sold").length;
    guards.push(
      kind === "partial"
        ? `${b.person}'s filing marks ${sold} of ${b.now.size} positions sold and the book at ${formatMoney(b.total)} from ${formatMoney(b.totalBefore)}, which reads as an incomplete filing; left out.`
        : `${b.person}'s filing cuts every position by the same amount (${formatMoney(b.totalBefore)} to ${formatMoney(b.total)}), which reads as a reporting change; left out.`,
    );
  }
  const clean = books.filter((b) => !artifacts.has(b.code));

  const seenBefore = new Set<string>();
  for (const b of clean) for (const t of b.before.keys()) seenBefore.add(t);
  const newHolders = new Map<string, Book[]>();
  for (const b of clean) for (const [t, p] of b.now) if (!seenBefore.has(t) && effectiveActivity(p.activity, p.change) === "new") (newHolders.get(t) ?? newHolders.set(t, []).get(t)!).push(b);
  const spinoffs = new Set<string>();
  for (const [t, hs] of newHolders) {
    if (hs.length < 2) continue;
    const parent = [...seenBefore].find((p) => p !== t && t.startsWith(p) && hs.every((b) => b.before.has(p)));
    if (parent) spinoffs.add(t);
  }

  interface Move extends MoveFacts {
    code: string;
    person: string;
  }
  const moves: Move[] = [];
  for (const b of clean) {
    const ranked = [...b.now.values()].filter(live).sort((x, y) => y.pct - x.pct).map((p) => p.ticker);
    for (const [t, now] of b.now) {
      if (spinoffs.has(t)) continue;
      const before = b.before.get(t);
      const m = moveDollars(now, before);
      if (m.activity === "hold" || m.dollars <= 0) continue;
      const denom = b.totalBefore > 0 ? b.totalBefore : b.total;
      const rank = ranked.indexOf(t) + 1;
      const since = m.activity === "new" ? null : heldSince(b, t);
      moves.push({
        code: b.code,
        person: b.person,
        ticker: t,
        name: now.name,
        activity: m.activity,
        change: m.change === null ? null : Math.round(m.change),
        dollars: Math.round(m.dollars),
        valueNow: m.activity === "sold" ? 0 : Math.round(now.value),
        impactPts: denom > 0 ? r1((m.dollars / denom) * 100) : 0,
        pctNow: r1(now.pct || (b.total > 0 ? (now.value / b.total) * 100 : 0)),
        rank: rank > 0 ? rank : null,
        heldSince: since === quarter ? null : since,
        othersBought: [],
        othersSold: [],
      });
    }
  }
  const meaningful = moves.filter((m) => m.impactPts >= 1);
  for (const m of meaningful) {
    m.othersBought = meaningful.filter((o) => o.ticker === m.ticker && o.code !== m.code && (o.activity === "new" || o.activity === "add")).map((o) => lastName(o.person));
    m.othersSold = meaningful.filter((o) => o.ticker === m.ticker && o.code !== m.code && (o.activity === "reduce" || o.activity === "sold")).map((o) => lastName(o.person));
  }

  const holders = (t: string, which: "now" | "before") => clean.filter((b) => live(b[which].get(t))).length;
  const priceMove = (t: string): number | null => {
    const s = stocks[t] ?? stocks[t === "GOOGL" ? "GOOG" : t];
    if (!s) return null;
    const a = s.quarters.find((x) => x.q === quarter)?.price;
    const b = s.quarters.find((x) => x.q === q0)?.price;
    return a && b ? Math.round(((a - b) / b) * 100) : null;
  };
  const byTicker = new Map<string, { name: string; buyers: Move[]; sellers: Move[] }>();
  for (const m of meaningful) {
    const e = byTicker.get(m.ticker) ?? { name: m.name, buyers: [], sellers: [] };
    (m.activity === "new" || m.activity === "add" ? e.buyers : e.sellers).push(m);
    byTicker.set(m.ticker, e);
  }
  const cons: Consensus[] = [...byTicker.entries()].map(([t, e]) => ({
    ticker: t,
    name: e.name,
    buyers: e.buyers.sort((a, b) => b.impactPts - a.impactPts).map((m) => lastName(m.person)),
    sellers: e.sellers.sort((a, b) => b.impactPts - a.impactPts).map((m) => lastName(m.person)),
    holdersNow: holders(t, "now"),
    holdersBefore: holders(t, "before"),
    priceMovePct: priceMove(t),
  }));
  const byCount = (a: Consensus, b: Consensus) => b.buyers.length + b.sellers.length - a.buyers.length - a.sellers.length;
  const agreed = cons.filter((c) => (c.buyers.length >= 3 && c.sellers.length === 0) || (c.sellers.length >= 3 && c.buyers.length === 0)).sort(byCount).slice(0, 5);
  const contested = cons.filter((c) => c.buyers.length >= 3 && c.sellers.length >= 3).sort(byCount).slice(0, 3);

  const allTickers = new Set<string>();
  for (const b of clean) for (const t of [...b.now.keys(), ...b.before.keys()]) allTickers.add(t);
  const nameOf = (t: string) => clean.map((b) => b.now.get(t)?.name ?? b.before.get(t)?.name).find(Boolean) ?? t;
  const crowd = [...allTickers]
    .filter((t) => !spinoffs.has(t))
    .map((t) => ({ ticker: t, name: nameOf(t), before: holders(t, "before"), now: holders(t, "now") }))
    .filter((c) => Math.abs(c.now - c.before) >= 3)
    .sort((a, b) => Math.abs(b.now - b.before) - Math.abs(a.now - a.before))
    .slice(0, 8);

  const investorFacts = (b: Book): InvestorFacts => {
    const mine = moves.filter((m) => m.code === b.code).sort((x, y) => y.dollars - x.dollars);
    const trades = [...b.now.values()].filter((p) => effectiveActivity(p.activity, p.change) !== "hold").length;
    const denom = Math.max(b.total, b.totalBefore);
    const nowTop = top5(b.now);
    const series = b.history.slice(0, -1).map((h) => ({ q: h.q, c: top5(h.positions) })).filter((x) => x.c > 0);
    let low: string | null = null;
    let high: string | null = null;
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].c < nowTop) break;
      low = series[i].q;
    }
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].c > nowTop) break;
      high = series[i].q;
    }
    const last = series[series.length - 1]?.q;
    return {
      code: b.code,
      slug: b.slug,
      person: b.person,
      firm: b.firm,
      total: b.total,
      totalBefore: b.totalBefore,
      positions: [...b.now.values()].filter(live).length,
      trades,
      turnoverPct: denom > 0 ? Math.round((mine.reduce((s, m) => s + m.dollars, 0) / denom) * 100) : 0,
      top5NowPct: Math.round(nowTop),
      top5BeforePct: Math.round(top5(b.before)),
      top5LowestSince: low && low !== last ? low : null,
      top5HighestSince: high && high !== last ? high : null,
      moves: mine.slice(0, 6).map(({ code: _c, person: _p, ...m }) => m),
    };
  };
  const impactByCode = new Map<string, number>();
  for (const m of meaningful) impactByCode.set(m.code, (impactByCode.get(m.code) ?? 0) + m.impactPts);
  const byImpact = [...clean].sort((a, b) => (impactByCode.get(b.code) ?? 0) - (impactByCode.get(a.code) ?? 0));
  const top = [...meaningful].sort((a, b) => b.dollars - a.dollars)[0];
  const chosen = [...new Set([...(top ? [top.code] : []), ...FAMOUS.filter((c) => clean.some((b) => b.code === c)), ...byImpact.map((b) => b.code)])].slice(0, 14);

  const quiet = clean
    .filter((b) => [...b.now.values()].every((p) => effectiveActivity(p.activity, p.change) === "hold"))
    .map((b) => ({ person: b.person, positions: [...b.now.values()].filter(live).length }))
    .slice(0, 5);

  const leadBook = top ? clean.find((b) => b.code === top.code) : undefined;
  const lead =
    top && leadBook
      ? {
          code: top.code,
          slug: leadBook.slug,
          person: top.person,
          ticker: top.ticker,
          name: top.name,
          dollars: top.dollars,
          activity: top.activity,
          book: [...leadBook.now.values()]
            .filter(live)
            .sort((x, y) => y.value - x.value)
            .slice(0, 60)
            .map((p) => ({ ticker: p.ticker, value: p.value, activity: effectiveActivity(p.activity, p.change), change: p.change })),
        }
      : null;

  const nextQ = quarter.endsWith("Q4") ? `${Number(quarter.slice(0, 4)) + 1} Q1` : `${quarter.slice(0, 4)} Q${Number(quarter.slice(-1)) + 1}`;
  return {
    quarter,
    filed,
    active,
    aggregate: clean.reduce((s, b) => s + b.total, 0),
    aggregateBefore: clean.reduce((s, b) => s + b.totalBefore, 0),
    nextDeadline: deadlineFor(nextQ).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" }),
    absentees,
    guards,
    lead,
    investors: chosen.map((code) => investorFacts(clean.find((b) => b.code === code)!)),
    agreed,
    contested,
    crowd,
    quiet,
  };
}
