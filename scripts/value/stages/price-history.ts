import { budgetUsage } from "../../../lib/value/budget";
import { orderFundamentals } from "./fundamentals";
import type { PriceHistory } from "../../../lib/value/types";
import { T } from "../../../lib/value/config";
import { loadCompanies } from "../../../lib/value/companies";
import { readCorpusJson, writeCorpusJson } from "../../../lib/value/corpus";
import { callsUsedToday } from "../../../lib/value/eodhd";
import { PriceHistoryUnavailableError, fetchPriceHistory, type CachedPriceHistory } from "../../../lib/value/price-history";

export default async function priceHistory({ only, limit, force = false }: { only?: string[]; limit?: number; force?: boolean }): Promise<void> {
  const now = new Date();
  const from = new Date(now);
  from.setUTCFullYear(from.getUTCFullYear() - T.history.years);
  const fetchedAt = new Map<string, string>();
  const eligible = loadCompanies({ only }).filter(company => {
    if (!readCorpusJson(`fundamentals/${company.id}.json`)) return false;
    const cached = readCorpusJson<CachedPriceHistory>(`prices-history/${company.id}.json`);
    if (cached?.fetchedAt) fetchedAt.set(company.id, cached.fetchedAt);
    const timestamp = readCorpusJson<{ fetchedAt: string }>(`prices-history/meta/${company.id}.json`)?.fetchedAt ?? cached?.fetchedAt;
    if (timestamp) fetchedAt.set(company.id, timestamp);
    const fetched = Date.parse(timestamp ?? "");
    return force || !Number.isFinite(fetched) || now.getTime() - fetched > T.history.refreshMs;
  });
  const companies = orderFundamentals(eligible, fetchedAt).slice(0, limit);
  let used: number | undefined;
  let eodRequests = 0;
  let written = 0;
  let consecutiveFailures = 0;
  for (const company of companies) {
    const isJapan = company.id.endsWith(".JP");
    if (!isJapan) {
      used ??= await callsUsedToday();
    }
    if (!isJapan && budgetUsage().history >= T.budget.priceHistoryCalls) {
      console.log("daily price-history budget reached, resume tomorrow");
      continue;
    }
    const useYahoo = isJapan || Math.max(used!, budgetUsage().used) + T.budget.historyCost > T.budget.dailyCalls;
    let prices: PriceHistory | undefined;
    try {
      prices = await fetchPriceHistory({ company, from: from.toISOString().slice(0, 10), useYahoo });
      consecutiveFailures = 0;
    } catch (error) {
      if (error instanceof PriceHistoryUnavailableError) {
        // Delisted/local-exchange symbols are not a provider outage. Preserve any
        // older prices, cache the miss, and allow later Tokyo symbols to proceed.
        writeCorpusJson(`prices-history/meta/${company.id}.json`, { fetchedAt: now.toISOString(), status: "unavailable" });
        consecutiveFailures = 0;
        console.warn(`${company.id}: Yahoo history unavailable`);
        continue;
      }
      consecutiveFailures++;
      console.error(`${company.id}: price-history request failed, skipping`, error);
    }
    // Failed requests can still consume the shared provider budget.
    if (!useYahoo) {
      used!++;
      if (++eodRequests % T.fundamentals.usageSyncCompanies === 0) used = Math.max(used!, await callsUsedToday());
    }
    if (consecutiveFailures >= 20) {
      console.error("price-history: stopping after 20 consecutive provider failures");
      break;
    }
    if (prices === undefined) continue;
    writeCorpusJson(`prices-history/${company.id}.json`, prices);
    writeCorpusJson(`prices-history/meta/${company.id}.json`, { fetchedAt: now.toISOString() });
    written++;
  }
  console.log(`price-history: ${written} written`);
}
