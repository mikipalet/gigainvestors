import { readCorpusJson, writeCorpusJson } from "../corpus";
import { T } from "../config";
import { createLimiter, fetchWithRetry } from "../http";
import {
  parseYahooHistory,
  PriceHistoryUnavailableError,
} from "../price-history";
import { parseYahooPrice } from "../prices-yahoo";
import type { Company, PriceHistory } from "../types";

const limit = createLimiter({ perSecond: T.yahoo.perSecond });
/** Corpus-only quote and history ingestion. Never opens or pushes the publication repository. */
export async function italianPrices({
  company,
  force = false,
}: {
  company: Company;
  force?: boolean;
}): Promise<{ prices: PriceHistory; quote: [number, string] | null }> {
  const key = `raw/esef/yahoo/${company.id}.json`;
  const date = new Date().toISOString().slice(0, 10);
  let chart = readCorpusJson<{ date: string; data: unknown }>(key);
  if (force || chart?.date !== date) {
    const data = await limit(async () => {
      const response = await fetchWithRetry(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(company.id)}?range=10y&interval=1mo`,
        {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(60_000),
          retries: 1,
        },
      );
      if (response.status === 404)
        throw new PriceHistoryUnavailableError(
          "Yahoo has no Milan history for this symbol",
        );
      if (!response.ok) throw new Error(`Yahoo HTTP ${response.status}`);
      return response.json();
    });
    chart = { date, data };
    // A suspended/delisted symbol can retain history without a current quote.
    parseYahooHistory(data);
    writeCorpusJson(key, chart);
  }
  const prices = parseYahooHistory(chart.data);
  let quote: [number, string] | null = null;
  try {
    quote = parseYahooPrice(chart.data);
  } catch {
    /* Retain valid history. */
  }
  writeCorpusJson(`prices-history/${company.id}.json`, prices);
  writeCorpusJson(`prices-history/meta/${company.id}.json`, {
    fetchedAt: new Date().toISOString(),
    failures: 0,
  });
  if (quote)
    writeCorpusJson(`raw/prices/yahoo-${company.id}.json`, {
      date,
      data: quote,
    });
  return { prices, quote };
}
