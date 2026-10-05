import {historyBasisConflict,retainReviewedPriceHistory} from './price-history-basis';
import {shardOf} from './shard';
import {alignHistoryShares} from './history-split-basis';
import {completeCachedSplits} from './completeness/cached-years';
import { T, YAHOO_SUFFIXES } from "./config";
import { readCorpusJson } from "./corpus";
import { eodhd } from "./eodhd";
import { createLimiter, fetchWithRetry } from "./http";
import type { Company, Fundamentals, PriceHistory } from "./types";

export interface CachedPriceHistory { fetchedAt: string; prices: PriceHistory }

/** Align original monthly closes with restated shares only when a declared
 * action, adjacent closes and consecutive annual share observations agree.
 * Already adjusted Yahoo closes and actual shareholder dilution stay intact. */
export function reconcilePriceSplits(prices:PriceHistory,fundamentals:Pick<Fundamentals,'years'|'splits'>):PriceHistory {
  let result=prices;
  const years=[...(fundamentals.years??[])].sort((a,b)=>a.end.localeCompare(b.end));
  const monthNumber=(month:string)=>Number(month.slice(0,4))*12+Number(month.slice(5,7));
  for(const split of [...(fundamentals.splits??[])].sort((a,b)=>b.date.localeCompare(a.date))){
    if(!Number.isFinite(split.factor)||split.factor<=0||Math.max(split.factor,1/split.factor)<1.5)continue;
    const before=years.filter(y=>y.end<split.date).at(-1),after=years.find(y=>y.end>=split.date);
    if(!before?.dilutedShares||!after?.dilutedShares||before.dilutedShares<=0||after.dilutedShares<=0)continue;
    const days=(Date.parse(after.end)-Date.parse(before.end))/86400000;
    if(days<300||days>400||Math.abs(after.dilutedShares/before.dilutedShares-1)>.25)continue;
    const month=split.date.slice(0,7);
    // Legal first-of-month effectiveness can follow the exchange ex-date in
    // the preceding month (Toyota: 1 October / 29 September 2021).
    const prior=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7))-2,1)).toISOString().slice(0,7);
    const candidates=split.date.endsWith('-01')?[month,prior]:[month];
    const matched=candidates.find(candidate=>{
      const i=result.findIndex(([m])=>m===candidate);
      return i>=1&&monthNumber(result[i][0])-monthNumber(result[i-1][0])===1
        &&Math.abs(result[i][1]/result[i-1][1]*split.factor-1)<=.2;
    });
    if(matched)result=result.map(([m,close])=>[m,m<matched?close/split.factor:close]);
  }
  return result;
}

function releasedPriceHistory(id:string):PriceHistory {
  return readCorpusJson<Record<string,{priceHistory?:PriceHistory}>>(`publish-repo/dossiers/${shardOf(id)}.json`)?.[id]?.priceHistory??[];
}

/** Read canonical monthly tuples, accepting the original Task 14 cache envelope. */
export function readPriceHistory(id: string): PriceHistory | null {
  const cached = readCorpusJson<PriceHistory | CachedPriceHistory>(`prices-history/${id}.json`);
  const prices = Array.isArray(cached) ? cached : cached?.prices;
  if(!prices)return null;
  const valid=prices.filter(row => Array.isArray(row) && typeof row[0] === "string"
    && /^\d{4}-\d{2}$/.test(row[0]) && typeof row[1] === "number" && Number.isFinite(row[1]) && row[1] > 0);
  const fundamentals=readCorpusJson<Fundamentals>(`fundamentals/${id}.json`);
  if(fundamentals)fundamentals.splits=completeCachedSplits(id,fundamentals.splits,readCorpusJson);
  const reconciled=fundamentals?reconcilePriceSplits(valid,alignHistoryShares(fundamentals,valid)):valid;
  return retainReviewedPriceHistory(reconciled,releasedPriceHistory(id));
}

function monthlyCloses(rows: Array<{ date: unknown; close: unknown }>): PriceHistory {
  const months = new Map<string, { date: string; close: number }>();
  for (const { date, close } of rows) {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))
      || new Date(date).toISOString().slice(0, 10) !== date || typeof close !== "number" || !Number.isFinite(close) || close <= 0) continue;
    const month = date.slice(0, 7);
    if (!months.has(month) || months.get(month)!.date <= date) months.set(month, { date, close });
  }
  return [...months].sort(([a], [b]) => a.localeCompare(b)).map(([month, { close }]) => [month, close]);
}

export function parseEodHistory(raw: unknown): PriceHistory {
  if (!Array.isArray(raw)) throw new Error("Invalid EODHD price history");
  return monthlyCloses(raw.filter((row): row is { date: unknown; close: unknown } => row !== null && typeof row === "object"));
}

export function parseYahooHistory(raw: unknown): PriceHistory {
  const chart = (raw as { chart?: { error?: unknown; result?: Array<{
    meta?: { exchangeTimezoneName?: string; gmtoffset?: number };
    timestamp?: number[]; indicators?: { quote?: Array<{ close?: Array<number | null> }> };
  }> } } | null)?.chart;
  const result = chart?.result?.[0];
  const closes = result?.indicators?.quote?.[0]?.close;
  if (chart?.error || !Array.isArray(result?.timestamp) || !Array.isArray(closes)) throw new Error("Invalid Yahoo price history");
  const zone = result.meta?.exchangeTimezoneName;
  const formatter = zone ? new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }) : null;
  return monthlyCloses(result.timestamp.map((time, i) => {
    const date = typeof time === "number" && Number.isFinite(time) ? new Date(time * 1000) : null;
    let local: string | null = null;
    if (date && Number.isFinite(date.getTime())) {
      if (formatter) {
        const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
        local = `${parts.year}-${parts.month}-${parts.day}`;
      } else {
        local = new Date(date.getTime() + (result.meta?.gmtoffset ?? 0) * 1000).toISOString().slice(0, 10);
      }
    }
    return { date: local, close: closes[i] };
  }));
}

export function yahooSymbol(company: Pick<Company, "code" | "exchange">): string {
  const suffix = YAHOO_SUFFIXES[company.exchange];
  if (suffix === undefined) throw new Error(`Unsupported Yahoo exchange: ${company.exchange}`);
  const code = company.exchange === "HK" ? company.code.padStart(4, "0")
    : company.exchange === "US" ? company.code.replace(/\./g, "-") : company.code;
  return `${code}${suffix}`;
}

export class PriceHistoryUnavailableError extends Error {}

/** Compatibility venues have Yahoo symbols but no matching EODHD exchange.
 * Keep stage budgeting and direct fetches on the same provider policy. */
export function usesYahooHistory(company: Pick<Company, "id" | "exchange" | "source">): boolean {
  return process.env.VALUE_NO_EODHD === "1" || company.id.endsWith(".JP") || company.source === "esef"
    || ["NSE", "MI", "NZ"].includes(company.exchange);
}

const yahooLimit = createLimiter({ perSecond: T.yahoo.perSecond });
export async function fetchPriceHistory({ company, from, useYahoo = false }: { company: Company; from: string; useYahoo?: boolean }): Promise<PriceHistory> {
  const cached=readCorpusJson<PriceHistory|CachedPriceHistory>(`prices-history/${company.id}.json`);
  const released=releasedPriceHistory(company.id);
  const previous=cached?retainReviewedPriceHistory(Array.isArray(cached)?cached:cached.prices,released):released;
  if (!useYahoo && !usesYahooHistory(company)) {
    const prices=parseEodHistory(await eodhd(`eod/${encodeURIComponent(company.id)}`, { period: "m", from }));
    if(!historyBasisConflict(prices,previous))return prices;
    // EOD close is raw; adjusted_close includes dividends and is not a substitute.
    // Recover a compatible split-adjusted source before overwriting the cache.
  }
  return yahooLimit(async () => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol(company))}?range=10y&interval=1mo`;
    const response = await fetchWithRetry(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(60_000), retries: 0 });
    if (response.status === 404) throw new PriceHistoryUnavailableError("Yahoo has no history for this symbol");
    if (!response.ok) throw new Error(`Yahoo price history HTTP ${response.status}`);
    const prices=parseYahooHistory(await response.json());
    if(historyBasisConflict(prices,previous))throw new Error('Refreshed price history conflicts with the released share basis');
    return prices;
  });
}
