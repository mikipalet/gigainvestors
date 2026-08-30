import roster from "@/data/roster.json";
import { listKeys, readJson, writeJson } from "../blob";
import { fetchHtml, paths } from "../dataroma/client";
import { parseActivity, type ActivityQuarter } from "../dataroma/parse-activity";
import { parseHist, type HistRow } from "../dataroma/parse-hist";
import { parseHoldings, type HoldingsPage } from "../dataroma/parse-holdings";
import { parseManagers, type ManagerRow } from "../dataroma/parse-managers";
import { compareQ, nextQ } from "../quarters";
import type { Index, IndexInvestor, InvestorData, SearchIndex, StockShard } from "../types";
import { diffManagers, fingerprint, type SyncState } from "./fingerprint";
import { buildInvestorData } from "./reconstruct";
import { adjustedPriceSeries, type PriceRow } from "../stock-price";

interface RosterEntry {
  dataromaCode: string;
  person: string | null;
  firm: string;
  file: string | null;
}

const ROSTER = (roster as RosterEntry[]).reduce<Record<string, RosterEntry>>((a, r) => ((a[r.dataromaCode] = r), a), {});
const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const investorKey = (code: string) => `investors/${code}.json`;
const STATE_KEY = "sync/state.json";
const INDEX_KEY = "index.json";
const WORKERS = 4;

export interface SyncResult {
  changed: string[];
  skipped: string[];
  failed: string[];
  durationMs: number;
}

export interface SyncOptions {
  full?: boolean;
  only?: string[];
  log?: (msg: string) => void;
}

const latestOf = (d: InvestorData | null) => d?.quarters[d.quarters.length - 1] ?? null;

function samePositions(stored: InvestorData | null, h: HoldingsPage): boolean {
  const q = latestOf(stored);
  if (!q || q.q !== h.period) return false;
  const live = q.positions.filter((p) => p.activity !== "sold");
  if (live.length !== h.positions.length) return false;
  const map = new Map(live.map((p) => [p.ticker, p]));
  return h.positions.every((p) => {
    const s = map.get(p.ticker);
    return s && s.shares === p.shares && s.pct === p.pct;
  });
}

function tickersNeedingHist(stored: InvestorData | null, h: HoldingsPage, full: boolean): string[] {
  if (full || !stored) return h.positions.map((p) => p.ticker);
  const prev = latestOf(stored);
  const prevMap = new Map(prev?.positions.map((p) => [p.ticker, p]) ?? []);
  return h.positions.filter((p) => prevMap.get(p.ticker)?.shares !== p.shares).map((p) => p.ticker);
}

const activityString = (p: { activity: string; change: number | null }) => {
  if (p.activity === "new") return "Buy";
  if (p.activity === "add") return `Add ${p.change ?? 0}%`;
  if (p.activity === "reduce") return `Reduce ${Math.abs(p.change ?? 0)}%`;
  return "";
};

function carriedHists(stored: InvestorData | null): Record<string, HistRow[]> {
  const out: Record<string, HistRow[]> = {};
  for (const q of stored?.quarters ?? []) {
    for (const p of q.positions) {
      if (p.activity === "sold" || p.shares <= 0) {
        if (p.activity === "sold") (out[p.ticker] ??= []).push({ q: q.q, shares: 0, pct: 0, activity: "Sell 100.00%", price: 0 });
        continue;
      }
      (out[p.ticker] ??= []).push({ q: q.q, shares: p.shares, pct: p.pct, activity: activityString(p), price: p.value / p.shares });
    }
  }
  return out;
}

// Full mode crawls every activity page so positions exited years ago (not in current
// holdings) still get their history fetched; dataroma keeps hist.php for exited tickers.
async function fetchAllActivity(code: string, full: boolean): Promise<ActivityQuarter[]> {
  const out: ActivityQuarter[] = [];
  for (let page = 1; page <= (full ? 20 : 1); page++) {
    const qs = parseActivity(await fetchHtml(paths.activity(code, page)));
    if (!qs.length || qs.every((aq) => out.some((o) => o.q === aq.q && o.items.length >= aq.items.length))) break;
    out.push(...qs.filter((aq) => !out.some((o) => o.q === aq.q)));
    for (const aq of qs) {
      const seen = out.find((o) => o.q === aq.q)!;
      for (const it of aq.items) if (!seen.items.some((x) => x.ticker === it.ticker && x.kind === it.kind)) seen.items.push(it);
    }
  }
  return out;
}

async function syncManager(m: ManagerRow, full: boolean, log: (s: string) => void): Promise<"changed" | "skipped"> {
  const entry = ROSTER[m.code];
  const stored = await readJson<InvestorData>(investorKey(m.code));
  const holdings = parseHoldings(await fetchHtml(paths.holdings(m.code)));
  if (!holdings.period || holdings.positions.length === 0) throw new Error(`empty holdings for ${m.code}`);
  if (!full && samePositions(stored, holdings)) return "skipped";

  const hists = carriedHists(stored);
  const activity = await fetchAllActivity(m.code, full);
  const need = new Set(tickersNeedingHist(stored, holdings, full));
  if (full) {
    for (const aq of activity) for (const it of aq.items) need.add(it.ticker);
  }
  log(`${m.code}: ${holdings.period}, ${holdings.positions.length} positions, ${need.size} hist fetches, ${activity.length} activity quarters`);
  for (const t of need) hists[t] = parseHist(await fetchHtml(paths.hist(m.code, t)));
  const names = Object.fromEntries(holdings.positions.map((p) => [p.ticker, p.name]));
  for (const q of stored?.quarters ?? []) for (const p of q.positions) names[p.ticker] ??= p.name;
  for (const aq of activity) for (const it of aq.items) names[it.ticker] ??= it.name;

  const data = buildInvestorData({
    code: m.code,
    person: entry?.person ?? m.label,
    firm: entry?.firm ?? m.label,
    holdings,
    hists,
    names,
    activity,
  });
  await writeJson(investorKey(m.code), data);
  return "changed";
}

async function rebuildIndex(managers: ManagerRow[]): Promise<Index> {
  const keys = await listKeys("investors/");
  const investors: IndexInvestor[] = [];
  const quarterSet = new Set<string>();
  const all: InvestorData[] = [];
  for (const key of keys) {
    const d = await readJson<InvestorData>(key);
    if (!d || !managers.some((m) => m.code === d.code)) continue;
    all.push(d);
    const entry = ROSTER[d.code];
    const person = entry?.person ?? d.person;
    d.quarters.forEach((q) => quarterSet.add(q.q));
    investors.push({
      code: d.code,
      slug: slugOf(person),
      person,
      firm: d.firm,
      sketch: Boolean(entry?.file),
      series: d.quarters.map((q) => ({ q: q.q, total: q.total, positions: q.positions.filter((p) => p.activity !== "sold").length })),
    });
  }
  investors.sort((a, b) => a.person.localeCompare(b.person));
  await writeStocks(all);
  const index: Index = { generatedAt: new Date().toISOString(), quarters: [...quarterSet].sort(compareQ), investors };
  await writeJson(INDEX_KEY, index);
  return index;
}

// One filer's 13F "value" can be options notional rather than share value; the
// median price across all holders rejects those outliers.
function medianRow(rows: PriceRow[] | undefined): PriceRow | null {
  if (!rows?.length) return null;
  const sorted = [...rows].sort((a, b) => a.value / a.shares - b.value / b.shares);
  return sorted[Math.floor(sorted.length / 2)];
}

const shardOf = (ticker: string) => {
  const c = ticker[0]?.toUpperCase() ?? "0";
  return /[A-Z]/.test(c) ? c : "0";
};

async function writeStocks(all: InvestorData[]) {
  const stocks = new Map<string, { name: string; quarters: Map<string, StockShard[string]["quarters"][number]["holders"]>; rows: Map<string, PriceRow[]> }>();
  for (const inv of all) {
    for (const q of inv.quarters) {
      for (const p of q.positions) {
        if (!stocks.has(p.ticker)) stocks.set(p.ticker, { name: p.name, quarters: new Map(), rows: new Map() });
        const st = stocks.get(p.ticker)!;
        if (p.name.length > st.name.length) st.name = p.name;
        if (!st.quarters.has(q.q)) st.quarters.set(q.q, []);
        st.quarters.get(q.q)!.push({ code: inv.code, value: p.value, pct: p.pct, activity: p.activity, change: p.change });
        if (p.shares > 0 && p.activity !== "sold") (st.rows.get(q.q) ?? st.rows.set(q.q, []).get(q.q)!).push({ shares: p.shares, value: p.value });
      }
    }
  }
  const shards: Record<string, StockShard> = {};
  const search: SearchIndex["stocks"] = [];
  for (const [ticker, st] of stocks) {
    const sparse = [...st.quarters.entries()].sort((a, b) => compareQ(a[0], b[0]));
    const sorted: typeof sparse = [];
    for (let i = 0; i < sparse.length; i++) {
      sorted.push(sparse[i]);
      if (i < sparse.length - 1) {
        for (let q = nextQ(sparse[i][0]); compareQ(q, sparse[i + 1][0]) < 0; q = nextQ(q)) sorted.push([q, []]);
      }
    }
    const prices = adjustedPriceSeries(sorted.map(([q]) => medianRow(st.rows.get(q))));
    const quarters = sorted.map(([q, holders], i) => ({ q, holders: holders.sort((a, b) => b.value - a.value), price: prices[i] }));
    (shards[shardOf(ticker)] ??= {})[ticker] = { ticker, name: st.name, quarters };
    const latest = quarters[quarters.length - 1];
    search.push({ t: ticker, n: st.name, h: latest.holders.filter((h) => h.activity !== "sold").length });
  }
  for (const [shard, data] of Object.entries(shards)) await writeJson(`stocks/${shard}.json`, data);
  const searchIndex: SearchIndex = {
    investors: all.map((d) => ({ code: d.code, person: ROSTER[d.code]?.person ?? d.person, firm: d.firm })).sort((a, b) => a.person.localeCompare(b.person)),
    stocks: search.sort((a, b) => b.h - a.h),
  };
  await writeJson("search.json", searchIndex);
}

export async function runReindex(): Promise<{ investors: number }> {
  const managers = parseManagers(await fetchHtml(paths.managers));
  const index = await rebuildIndex(managers);
  return { investors: index.investors.length };
}

export async function runSync(opts: SyncOptions = {}): Promise<SyncResult> {
  const t0 = Date.now();
  const log = opts.log ?? console.log;
  const managers = parseManagers(await fetchHtml(paths.managers));
  if (managers.length < 50) throw new Error(`managers parse suspicious: ${managers.length}`);
  const state = (await readJson<SyncState>(STATE_KEY)) ?? {};
  let codes = opts.full ? managers.map((m) => m.code) : diffManagers(managers, state);
  if (opts.only?.length) codes = codes.filter((c) => opts.only!.includes(c));
  log(`managers ${managers.length}, to check ${codes.length}`);

  const changed: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];
  const queue = [...codes];
  await Promise.all(
    Array.from({ length: WORKERS }, async () => {
      while (queue.length) {
        const code = queue.shift()!;
        const m = managers.find((x) => x.code === code)!;
        try {
          const r = await syncManager(m, Boolean(opts.full), log);
          (r === "changed" ? changed : skipped).push(code);
          state[code] = fingerprint(m);
          await writeJson(STATE_KEY, state);
        } catch (e) {
          failed.push(code);
          log(`FAIL ${code}: ${(e as Error).message}`);
        }
      }
    }),
  );

  if (changed.length || opts.full) await rebuildIndex(managers);
  return { changed, skipped, failed, durationMs: Date.now() - t0 };
}
