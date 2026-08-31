import { effectiveActivity } from "@/components/ChangeBadge";
import { formatMoney } from "../format";
import { prevQ } from "../quarters";
import type { Activity, Index, InvestorData, Position, StockData } from "../types";

// Everything the issue says, derived from the data the site draws. Deterministic: no model in the loop.

export interface Move {
  code: string;
  person: string;
  slug: string;
  ticker: string;
  name: string;
  activity: Activity;
  change: number | null;
  dollars: number;
  impact: number; // points of the investor's prior book
  pct: number;
  value: number;
}

export interface Consensus {
  ticker: string;
  name: string;
  buyers: string[];
  sellers: string[];
  holdersNow: number;
  holdersBefore: number;
  priceMove: number | null;
}

export interface RollCallEntry {
  code: string;
  person: string;
  slug: string;
  sentences: string[];
  impact: number;
}

export interface Issue {
  quarter: string;
  filed: number;
  active: number;
  absentees: { person: string; last: string }[];
  guards: string[];
  aggregate: number;
  aggregateBefore: number;
  lead: { ticker: string; name: string; person: string; slug: string; code: string; dollars: number; pctNow: number; rank: number; buyers: string[]; sellers: string[]; holdersNow: number; holdersBefore: number; priceMove: number | null; sold: string[]; bought: string[] } | null;
  subject: string;
  preview: string;
  headline: string;
  standfirst: string[];
  rollCall: RollCallEntry[];
  bets: Move[];
  agreedBuys: Consensus[];
  agreedSells: Consensus[];
  contested: Consensus[];
  crowd: { ticker: string; before: number; now: number }[];
  quiet: string[];
  loud: string[];
  nextDeadline: string;
}

const ALWAYS = ["BRK", "psc", "AM", "BAUPOST", "HC", "PI", "ic", "tci", "FS", "vg"];

export const canonical = (t: string) => {
  const s = t.replace(/-OLD$/, "");
  if (s === "GOOG") return "GOOGL";
  if (s === "BRK.A") return "BRK.B";
  return s;
};

const pts = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);
const pctText = (p: number) => (p > 0 && p < 0.1 ? "<0.1%" : `${pts(p)}%`);
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(Math.round(n))}%`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const oxford = (xs: string[]) => (xs.length <= 1 ? xs.join("") : xs.length === 2 ? `${xs[0]} and ${xs[1]}` : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const lastName = (p: string) => p.split(" ").pop() ?? p;
const shortName = (name: string) => {
  let n = name.trim();
  for (let i = 0; i < 3; i++) n = n.replace(/[,.]?\s*(Inc\.?|Corp\.?|Corporation|Ltd\.?|plc|PLC|Co\.?|Company|Holdings?|Group|Class [A-C]|N\.?V\.?|S\.?A\.?|AG)$/i, "").replace(/[,.]+$/, "").trim();
  return n || name;
};

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

interface Book {
  code: string;
  person: string;
  slug: string;
  now: Map<string, Position>;
  before: Map<string, Position>;
  total: number;
  totalBefore: number;
}

function mergeClasses(positions: Position[]): Map<string, Position> {
  const m = new Map<string, Position>();
  for (const p of positions) {
    if (p.activity === "sold" && p.shares === 0 && p.pct === 0) {
      if (!m.has(canonical(p.ticker))) m.set(canonical(p.ticker), { ...p, ticker: canonical(p.ticker) });
      continue;
    }
    const k = canonical(p.ticker);
    const cur = m.get(k);
    if (!cur || cur.activity === "sold") m.set(k, { ...p, ticker: k });
    else m.set(k, { ...cur, shares: cur.shares + p.shares, pct: cur.pct + p.pct, value: cur.value + p.value, activity: cur.activity === "hold" ? p.activity : cur.activity, change: cur.change ?? p.change });
  }
  return m;
}

const reportingArtifact = (b: Book): "uniform" | "partial" | null => {
  if (b.totalBefore <= 0 || b.total / b.totalBefore > 0.2) return null;
  const all = [...b.now.values()];
  if (all.length >= 5 && all.filter((p) => p.activity === "sold").length / all.length >= 0.8) return "partial";
  const changes = [...b.now.values()].filter((p) => p.activity !== "sold").map((p) => p.change).filter((c): c is number => c !== null);
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

export function buildIssue(quarter: string, index: Index, investors: Record<string, InvestorData>, stocks: Record<string, StockData>): Issue {
  const q0 = prevQ(quarter);
  const books: Book[] = [];
  const absentees: Issue["absentees"] = [];
  for (const meta of index.investors) {
    const d = investors[meta.code];
    const qn = d?.quarters.find((x) => x.q === quarter);
    const qb = d?.quarters.find((x) => x.q === q0);
    if (!qn) {
      const last = d?.quarters[d.quarters.length - 1]?.q;
      if (last && last !== q0) absentees.push({ person: meta.person, last });
      continue;
    }
    books.push({ code: meta.code, person: meta.person, slug: meta.slug, now: mergeClasses(qn.positions), before: mergeClasses(qb?.positions ?? []), total: qn.total, totalBefore: qb?.total ?? 0 });
  }
  const filed = books.length;
  const active = filed + absentees.filter((a) => a.last === q0).length;
  const guards: string[] = [];
  const artifacts = new Set<string>();
  for (const b of books) {
    const kind = reportingArtifact(b);
    if (!kind) continue;
    artifacts.add(b.code);
    const sold = [...b.now.values()].filter((p) => p.activity === "sold").length;
    guards.push(
      kind === "partial"
        ? `${b.person}'s filing shows the book at ${formatMoney(b.total)} from ${formatMoney(b.totalBefore)} with ${sold} of ${b.now.size} positions marked sold; that reads as an incomplete filing, not trades, and it is excluded above.`
        : `${b.person}'s filing shows every position cut by the same amount and the book at ${formatMoney(b.total)} from ${formatMoney(b.totalBefore)}; that reads as a reporting change, not trades, and it is excluded above.`,
    );
  }
  const clean = books.filter((b) => !artifacts.has(b.code));

  // Spin-off guard: a first-seen ticker whose every new holder held a ticker that is a prefix of it.
  const seenBefore = new Set<string>();
  for (const b of clean) for (const t of b.before.keys()) seenBefore.add(t);
  const newHolders = new Map<string, Book[]>();
  for (const b of clean) for (const [t, p] of b.now) if (!seenBefore.has(t) && effectiveActivity(p.activity, p.change) === "new") (newHolders.get(t) ?? newHolders.set(t, []).get(t)!).push(b);
  const spinoffs = new Map<string, string>();
  for (const [t, hs] of newHolders) {
    if (hs.length < 2) continue;
    const parents = [...hs[0].before.keys()].filter((k) => k.length >= 2 && t.startsWith(k) && k !== t);
    const parent = parents.find((k) => hs.every((h) => h.before.has(k)));
    if (parent) spinoffs.set(t, parent);
  }
  for (const [t, parent] of spinoffs) guards.push(`${t}'s ${plural(newHolders.get(t)!.length, "new holder")} all held ${parent} last quarter; it is a spin-off, not a buy.`);

  // Moves with impact in points of the prior book.
  const moves: Move[] = [];
  for (const b of clean) {
    const tickers = new Set([...b.now.keys(), ...b.before.keys()]);
    for (const t of tickers) {
      if (spinoffs.has(t)) continue;
      const now = b.now.get(t);
      const before = b.before.get(t);
      if (!now && !before) continue;
      if (!now) continue;
      const m = moveDollars(now, before);
      if (m.activity === "hold" || m.dollars <= 0) continue;
      moves.push({ code: b.code, person: b.person, slug: b.slug, ticker: t, name: now.name, activity: m.activity, change: m.change, dollars: m.dollars, impact: b.totalBefore > 0 ? (m.dollars / b.totalBefore) * 100 : b.total > 0 ? (m.dollars / b.total) * 100 : 0, pct: now.pct || (b.total > 0 ? (now.value / b.total) * 100 : 0), value: now.value });
    }
  }
  const meaningful = moves.filter((m) => m.impact >= 1);

  // Consensus with direction, names, holder counts and the quarter's price move.
  const byTicker = new Map<string, { name: string; buyers: Move[]; sellers: Move[] }>();
  for (const m of meaningful) {
    const e = byTicker.get(m.ticker) ?? { name: m.name, buyers: [], sellers: [] };
    (m.activity === "new" || m.activity === "add" ? e.buyers : e.sellers).push(m);
    byTicker.set(m.ticker, e);
  }
  const holders = (t: string, which: "now" | "before") => clean.filter((b) => { const p = b[which].get(t); return p && p.activity !== "sold"; }).length;
  const priceMove = (t: string): number | null => {
    const s = stocks[t] ?? stocks[t === "GOOGL" ? "GOOG" : t];
    if (!s) return null;
    const a = s.quarters.find((x) => x.q === quarter)?.price;
    const b = s.quarters.find((x) => x.q === q0)?.price;
    return a && b ? ((a - b) / b) * 100 : null;
  };
  const cons: Consensus[] = [...byTicker.entries()].map(([t, e]) => ({
    ticker: t,
    name: e.name,
    buyers: e.buyers.sort((a, b) => b.impact - a.impact).map((m) => lastName(m.person)),
    sellers: e.sellers.sort((a, b) => b.impact - a.impact).map((m) => lastName(m.person)),
    holdersNow: holders(t, "now"),
    holdersBefore: holders(t, "before"),
    priceMove: priceMove(t),
  }));
  const agreedBuys = cons.filter((c) => c.buyers.length >= 3 && c.sellers.length === 0).sort((a, b) => b.buyers.length - a.buyers.length).slice(0, 5);
  const agreedSells = cons.filter((c) => c.sellers.length >= 3 && c.buyers.length === 0).sort((a, b) => b.sellers.length - a.sellers.length).slice(0, 5);
  const contested = cons.filter((c) => c.buyers.length >= 3 && c.sellers.length >= 3).sort((a, b) => b.buyers.length + b.sellers.length - a.buyers.length - a.sellers.length).slice(0, 3);

  // Crowd: holder-count deltas.
  const allTickers = new Set<string>();
  for (const b of clean) for (const t of b.now.keys()) allTickers.add(t);
  for (const b of clean) for (const t of b.before.keys()) allTickers.add(t);
  const crowd = [...allTickers].map((t) => ({ ticker: t, before: holders(t, "before"), now: holders(t, "now") })).filter((c) => Math.abs(c.now - c.before) >= 3).sort((a, b) => Math.abs(b.now - b.before) - Math.abs(a.now - a.before)).slice(0, 12);

  // Turnover.
  const turnover = clean.map((b) => {
    const moved = moves.filter((m) => m.code === b.code).reduce((s, m) => s + m.dollars, 0);
    const trades = [...b.now.values()].filter((p) => effectiveActivity(p.activity, p.change) !== "hold").length;
    return { b, turnover: Math.max(b.total, b.totalBefore) > 0 ? (moved / Math.max(b.total, b.totalBefore)) * 100 : 0, trades, positions: [...b.now.values()].filter((p) => p.activity !== "sold").length };
  });
  const quiet = turnover.filter((t) => t.trades <= 2 || t.turnover < 2).sort((a, b) => a.turnover - b.turnover).slice(0, 5).map((t) => (t.trades === 0 ? `${t.b.person} moved nothing across ${plural(t.positions, "position")}.` : `${t.b.person} touched ${t.trades} of ${t.positions} positions (${pctText(t.turnover)} turnover).`));
  const loud = turnover.filter((t) => t.turnover >= 30).sort((a, b) => b.turnover - a.turnover).slice(0, 5).map((t) => `${t.b.person} ${pctText(t.turnover)} turnover across ${plural(t.positions, "position")}.`);

  // Lead story: the largest single move in dollars, told against the crowd.
  const byDollars = [...moves].sort((a, b) => b.dollars - a.dollars);
  const top = byDollars[0];
  const lead = top
    ? (() => {
        const c = cons.find((x) => x.ticker === top.ticker);
        const b = clean.find((x) => x.code === top.code)!;
        const rank = [...b.now.values()].filter((p) => p.activity !== "sold").sort((x, y) => y.pct - x.pct).findIndex((p) => p.ticker === top.ticker) + 1;
        return { ticker: top.ticker, name: top.name, person: top.person, slug: top.slug, code: top.code, dollars: top.dollars, pctNow: top.pct, rank, buyers: c?.buyers.filter((n) => n !== lastName(top.person)) ?? [], sellers: c?.sellers ?? [], holdersNow: c?.holdersNow ?? holders(top.ticker, "now"), holdersBefore: c?.holdersBefore ?? holders(top.ticker, "before"), priceMove: c?.priceMove ?? priceMove(top.ticker), sold: c?.sellers ?? [], bought: c?.buyers ?? [] };
      })()
    : null;

  const verb = (a: Activity) => (a === "new" ? "opened" : a === "sold" ? "closed" : a === "add" ? "added to" : "trimmed");
  const headline = lead
    ? `${lastName(lead.person) === "Buffett" ? "Berkshire" : lead.person} ${lead.dollars >= 1e9 ? `put ${formatMoney(lead.dollars)} into` : verb(top!.activity)} ${shortName(lead.name)}.${lead.sellers.length >= 3 ? ` ${lead.sellers.length === 1 ? "One other" : oxford([String(lead.sellers.length)]) + " others"} sold it.` : lead.buyers.length >= 3 ? ` ${lead.buyers.length} others bought too.` : ""}`
    : `${filed} of ${active} filed for ${quarter}.`;
  const standfirst: string[] = [];
  if (lead) {
    standfirst.push(`${lead.person} ${verb(top!.activity)} ${lead.ticker}, ${formatMoney(lead.dollars)} at ${quarter.replace(" ", " ")} quarter-end prices${lead.rank ? `. It is now ${pctText(lead.pctNow)} of the book, position ${lead.rank}` : ""}.`);
    if (lead.sellers.length) standfirst.push(`${lead.sellers.length} ${lead.sellers.length === 1 ? "investor" : "investors"} sold a meaningful amount${lead.priceMove !== null ? ` into the same ${signed(lead.priceMove).replace("+", "")} ${lead.priceMove >= 0 ? "rally" : "drop"}` : ""}: ${lead.sellers.length > 5 ? `${lead.sellers.slice(0, 5).join(", ")} and ${lead.sellers.length - 5} more` : oxford(lead.sellers)}. Distinct holders went from ${lead.holdersBefore} to ${lead.holdersNow}.`);
    if (lead.buyers.length) standfirst.push(`${lead.buyers.length === 1 ? "One" : lead.buyers.length} bought alongside: ${oxford(lead.buyers.slice(0, 4))}.`);
  }

  // Roll call: always-show list plus the highest-impact investors, one paragraph each.
  const impactByCode = new Map<string, number>();
  for (const m of moves) impactByCode.set(m.code, (impactByCode.get(m.code) ?? 0) + m.impact);
  const order = [...clean].sort((a, b) => (impactByCode.get(b.code) ?? 0) - (impactByCode.get(a.code) ?? 0));
  const chosen = [...new Set([...ALWAYS.filter((c) => clean.some((b) => b.code === c)), ...order.map((b) => b.code)])].slice(0, 12);
  const rollCall: RollCallEntry[] = chosen.map((code) => {
    const b = clean.find((x) => x.code === code)!;
    const mine = moves.filter((m) => m.code === code).sort((x, y) => y.dollars - x.dollars);
    const news = mine.filter((m) => m.activity === "new");
    const adds = mine.filter((m) => m.activity === "add" && (m.change ?? 0) >= 20);
    const trims = mine.filter((m) => m.activity === "reduce" && (m.change ?? 0) <= -20);
    const exits = mine.filter((m) => m.activity === "sold");
    const s: string[] = [];
    const item = (m: Move) => `${m.ticker} (${formatMoney(m.activity === "sold" ? m.dollars : m.value)}${m.activity === "sold" ? "" : `, ${pctText(m.pct)}`})`;
    if (news.length) s.push(`Opened ${plural(news.length, "position")} for ${formatMoney(news.reduce((x, m) => x + m.dollars, 0))}: ${news.slice(0, 4).map(item).join(", ")}.`);
    if (adds.length) s.push(`Added ${adds.slice(0, 3).map((m) => `${signed(m.change ?? 0)} ${m.ticker}${m.pct >= 5 ? ` (now ${pctText(m.pct)})` : ""}`).join(", ")}.`);
    if (trims.length) s.push(`Trimmed ${trims.slice(0, 3).map((m) => `${m.ticker} ${signed(m.change ?? 0)}${m.pct >= 5 ? ` (still ${pctText(m.pct)})` : ""}`).join(", ")}.`);
    if (exits.length) s.push(`Sold ${exits.slice(0, 3).map(item).join(", ")}.`);
    const top5 = (map: Map<string, Position>) => [...map.values()].filter((p) => p.activity !== "sold").sort((x, y) => y.pct - x.pct).slice(0, 5).reduce((x, p) => x + p.pct, 0);
    const c0 = top5(b.before);
    const c1 = top5(b.now);
    if (c0 && Math.abs(c1 - c0) >= 10) s.push(`Top five went from ${pctText(c0)} of the book to ${pctText(c1)}.`);
    if (!s.length) {
      const t = turnover.find((x) => x.b.code === code)!;
      s.push(t.trades === 0 ? `Moved nothing across ${plural(t.positions, "position")}.` : `Small changes only: ${t.trades} of ${t.positions} positions, ${pctText(t.turnover)} turnover.`);
    }
    return { code, person: b.person, slug: b.slug, sentences: s, impact: impactByCode.get(code) ?? 0 };
  });

  // Bets: top impact, one per investor, floor $25M.
  const seen = new Set<string>();
  const bets = [...meaningful].sort((a, b) => b.impact - a.impact).filter((m) => m.dollars >= 25e6 && !seen.has(m.code) && seen.add(m.code)).slice(0, 8);

  const aggregate = clean.reduce((s, b) => s + b.total, 0);
  const aggregateBefore = clean.reduce((s, b) => s + b.totalBefore, 0);
  const nextQ = quarter.endsWith("Q4") ? `${Number(quarter.slice(0, 4)) + 1} Q1` : `${quarter.slice(0, 4)} Q${Number(quarter.slice(-1)) + 1}`;
  const nextDeadline = deadlineFor(nextQ).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
  const subject = `${quarter}: ${headline}`.slice(0, 78);
  const second = rollCall.filter((r) => r.code !== lead?.code).slice(0, 2);
  const preview = second.map((r) => `${lastName(r.person)}: ${r.sentences[0].replace(/\.$/, "")}`).join(". ").slice(0, 140);

  return { quarter, filed, active, absentees, guards, aggregate, aggregateBefore, lead, subject, preview, headline, standfirst, rollCall, bets, agreedBuys, agreedSells, contested, crowd, quiet, loud, nextDeadline };
}
