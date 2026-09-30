import { T, WESTERN_VENUES } from "./config";
import { currencyCode, marketCapCurrency } from "./currency";
import { readCorpusJson, writeCorpusJson } from "./corpus";
import { createUsdRate } from "./fx";
import { createLimiter, fetchWithRetry, pool } from "./http";
import { yahooSymbol } from "./price-history";
import type { Company } from "./types";

// Listing venues, not domicile: a US ADR is accessible even when its home is not.
const western = new Set<string>(WESTERN_VENUES);
export function westernListing(c: Company): boolean {
  return [c.id, ...(c.listings ?? [])].some((id) =>
    western.has(id.split(".").at(-1)!),
  );
}
export function venueImportance(c: Company): number {
  const venue = c.listingExchange ?? "";
  if (/OTC|PINK|GREY/i.test(venue)) return 3;
  if (c.exchange === "V" || /AIM|Venture|Growth/i.test(venue)) return 2;
  return western.has(c.exchange) ? 0 : 1;
}
export function compareDownloads(a: Company, b: Company): number {
  return (
    Number(westernListing(b)) - Number(westernListing(a)) ||
    (b.marketCapUsd ?? -Infinity) - (a.marketCapUsd ?? -Infinity) ||
    venueImportance(a) - venueImportance(b)
  );
}
const positive = (n: unknown): number | null =>
  typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
export function capFromQuote({
  price,
  shares,
  currency,
  usdRate,
}: {
  price: number | null;
  shares: number | null;
  currency: string;
  usdRate: number | null;
}): number | null {
  if (!positive(price) || !positive(shares) || !positive(usdRate)) return null;
  const divisor = ["GBX", "ZAC", "ILA"].includes(currencyCode(currency))
    ? 100
    : 1;
  return positive((price! * shares! * usdRate!) / divisor);
}
export function parseYahooShares(raw: unknown): number | null {
  const data = raw as {
    timeseries?: { result?: Array<Record<string, unknown>> };
  };
  const values = (data?.timeseries?.result ?? []).flatMap((row) =>
    Object.entries(row)
      .filter(([k]) => /^(annual|quarterly)OrdinarySharesNumber$/.test(k))
      .flatMap(([, v]) => (Array.isArray(v) ? v : [])),
  ) as Array<{ asOfDate: string; reportedValue?: { raw: number } }>;
  return positive(
    values
      .filter((v) => positive(v.reportedValue?.raw))
      .sort((a, b) => b.asOfDate.localeCompare(a.asOfDate))[0]?.reportedValue
      ?.raw,
  );
}
const limit = createLimiter({ perSecond: T.yahoo.perSecond });
async function yahooJson(url: string): Promise<unknown> {
  return limit(async () => {
    const r = await fetchWithRetry(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      retries: 0,
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) throw new Error(`Yahoo HTTP ${r.status}`);
    return r.json();
  });
}
export interface FreeCapData {
  price: number | null;
  shares: number | null;
  currency: string;
  source: string;
  marketCap?: number;
  asOf?: string;
}
interface YahooMeasure {
  asOfDate: string;
  currencyCode?: string;
  reportedValue?: { raw: number };
}
function latestMeasure(
  raw: unknown,
  pattern: RegExp,
): YahooMeasure | undefined {
  const rows =
    (raw as { timeseries?: { result?: Array<Record<string, unknown>> } })
      ?.timeseries?.result ?? [];
  const today = new Date().toISOString().slice(0, 10);
  return rows
    .flatMap((row) =>
      Object.entries(row)
        .filter(([key]) => pattern.test(key))
        .flatMap(([, v]) => (Array.isArray(v) ? v : [])),
    )
    .filter(
      (v: YahooMeasure) =>
        v.asOfDate <= today && positive(v.reportedValue?.raw),
    )
    .sort((a: YahooMeasure, b: YahooMeasure) =>
      b.asOfDate.localeCompare(a.asOfDate),
    )[0];
}
export async function freeCapData(
  company: Company,
  knownShares: number | null,
): Promise<FreeCapData> {
  const symbol = encodeURIComponent(yahooSymbol(company));
  const cachedChart =
    company.source === "esef"
      ? readCorpusJson<{ date: string; data: unknown }>(
          `raw/esef/yahoo/${company.id}.json`,
        )
      : null;
  const raw = (
    cachedChart?.date === new Date().toISOString().slice(0, 10)
      ? cachedChart.data
      : await yahooJson(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1d`,
        )
  ) as {
    chart?: {
      result?: Array<{
        meta?: {
          regularMarketPrice?: number;
          currency?: string;
          sharesOutstanding?: number;
        };
      }>;
    };
  };
  const meta = raw.chart?.result?.[0]?.meta;
  let shares = knownShares ?? positive(meta?.sharesOutstanding);
  if (shares === null) {
    const now = Math.floor(Date.now() / 1000);
    const from = now - 2 * 366 * 86400;
    const series = await yahooJson(
      `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${symbol}?type=trailingMarketCap,annualOrdinarySharesNumber,quarterlyOrdinarySharesNumber,quarterlyBasicAverageShares&period1=${from}&period2=${now}`,
    );
    const cap = latestMeasure(series, /^trailingMarketCap$/);
    if (
      cap?.currencyCode &&
      Date.now() - Date.parse(cap.asOfDate) <= T.marketCaps.maxReportedAgeMs
    ) {
      return {
        price: null,
        shares: null,
        marketCap: cap.reportedValue!.raw,
        currency: cap.currencyCode,
        asOf: cap.asOfDate,
        source: "Yahoo reported market cap",
      };
    }
    const ordinary = parseYahooShares(series);
    const basic = latestMeasure(series, /^quarterlyBasicAverageShares$/)
      ?.reportedValue?.raw;
    // An ADR price can be for 10 or 35 ordinary shares. Never multiply unless the
    // ordinary count agrees with the EPS-denominator count in the same source.
    if (
      ordinary &&
      basic &&
      Math.abs(ordinary / basic - 1) <= T.marketCaps.shareBasisTolerance
    )
      shares = ordinary;
  }
  return {
    price: positive(meta?.regularMarketPrice),
    shares,
    currency: meta?.currency ?? company.currency,
    source: "Yahoo chart × verified shares",
  };
}
/** Enrich before --limit is applied. Cache misses too, so scarce provider budgets do not re-probe every run. */
export async function enrichMissingCaps(
  companies: Company[],
  options: {
    fetchCap?: typeof freeCapData;
    usdRate?: (currency: string) => Promise<number | null>;
  } = {},
): Promise<Company[]> {
  const usd = options.usdRate ?? createUsdRate();
  const fetchCap = options.fetchCap ?? freeCapData;
  const symbols = new Map<
    string,
    Array<{
      Code: string;
      Exchange?: string;
      SharesOutstanding?: number;
      shares_outstanding?: number;
    }>
  >();
  for (const c of companies) {
    if (!c.exchange || symbols.has(c.exchange)) continue;
    symbols.set(
      c.exchange,
      readCorpusJson<{
        data: Array<{
          Code: string;
          Exchange?: string;
          SharesOutstanding?: number;
          shares_outstanding?: number;
        }>;
      }>(`raw/eodhd/universe/symbols-${c.exchange}.json`)?.data ?? [],
    );
  }
  let attempted = 0,
    filled = 0;
  await pool({
    items: companies,
    concurrency: 4,
    run: async (c) => {
      const sym = symbols.get(c.exchange)?.find((s) => s.Code === c.code);
      c.listingExchange ??= sym?.Exchange;
      const key = `raw/market-caps/${c.id}.json`;
      const cached = readCorpusJson<{
        at: string;
        cap: number | null;
        source?: string;
        version?: number;
      }>(key);
      const obsolete =
        cached?.source === "Yahoo chart × ordinary shares" &&
        cached.version !== 2;
      const patch = readCorpusJson<Partial<Company>>(`companies/${c.id}.json`);
      if (obsolete && c.marketCapUsd === cached.cap) c.marketCapUsd = null;
      c.marketCapUsd =
        positive(c.marketCapUsd) ??
        (obsolete && patch?.marketCapUsd === cached.cap
          ? null
          : positive(patch?.marketCapUsd));
      if (c.marketCapUsd !== null || !c.code || !c.exchange) return;
      if (
        !obsolete &&
        cached &&
        Date.now() - Date.parse(cached.at) < T.marketCaps.refreshMs
      ) {
        c.marketCapUsd = positive(cached.cap);
        if (c.marketCapUsd !== null)
          writeCorpusJson(`companies/${c.id}.json`, {
            ...c,
            ...patch,
            marketCapUsd: c.marketCapUsd,
            listingExchange: c.listingExchange,
          });
        return;
      }
      const raw = readCorpusJson<{
        SharesStats?: { SharesOutstanding?: number };
        General?: { CurrencyCode?: string };
        Highlights?: { MarketCapitalization?: number };
      }>(`raw/eodhd/${c.id}.json`);
      let source = "cached EODHD cap";
      let cap: number | null = null;
      let inputs: FreeCapData | undefined;
      try {
        if (positive(raw?.Highlights?.MarketCapitalization)) {
          const rate = await usd(
            marketCapCurrency(raw?.General?.CurrencyCode ?? c.currency),
          );
          cap =
            rate === null
              ? null
              : raw!.Highlights!.MarketCapitalization! * rate;
        }
        if (cap === null) {
          const shares =
            positive(raw?.SharesStats?.SharesOutstanding) ??
            positive(sym?.SharesOutstanding) ??
            positive(sym?.shares_outstanding);
          let data: Awaited<ReturnType<typeof freeCapData>>;
          try {
            data = await fetchCap(c, shares);
          } catch (error) {
            // Cached bulk data is free to reuse; never buy a bulk request for each missing cap.
            const bulk = readCorpusJson<{
              data: Array<{ code: string; close: number }>;
            }>(`raw/prices/eodhd-${c.exchange}.json`);
            const price = bulk?.data?.find((r) => r.code === c.code)?.close;
            if (!shares || !positive(price)) throw error;
            data = {
              price: price!,
              shares,
              currency: c.currency,
              source: "cached EODHD bulk × shares",
            };
          }
          const major = currencyCode(data.currency);
          const rate = await usd(
            major === "GBX"
              ? "GBP"
              : major === "ZAC"
                ? "ZAR"
                : major === "ILA"
                  ? "ILS"
                  : major,
          );
          cap =
            data.marketCap !== undefined && rate !== null
              ? positive(data.marketCap * rate)
              : capFromQuote({ ...data, usdRate: rate });
          source = data.source;
          inputs = data;
        }
        writeCorpusJson(key, {
          at: new Date().toISOString(),
          cap,
          source,
          inputs,
          version: 2,
        });
      } catch (error) {
        writeCorpusJson(key, {
          at: new Date().toISOString(),
          cap: null,
          error: error instanceof Error ? error.message : "Cap unavailable",
        });
      }
      c.marketCapUsd = cap;
      if (cap !== null || obsolete) {
        if (cap !== null) filled++;
        writeCorpusJson(`companies/${c.id}.json`, {
          ...c,
          ...patch,
          marketCapUsd: cap,
          listingExchange: c.listingExchange,
        });
      }
      if (++attempted % 100 === 0)
        console.log(`market-caps: ${attempted} checked, ${filled} filled`);
    },
  });
  return companies;
}
