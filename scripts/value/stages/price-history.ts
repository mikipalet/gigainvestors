import { CompanyFailures } from "../company-failures";
import { budgetUsage } from "../../../lib/value/budget";
import { orderFundamentals } from "./fundamentals";
import type { PriceHistory } from "../../../lib/value/types";
import { T } from "../../../lib/value/config";
import { loadCompanies } from "../../../lib/value/companies";
import { readCorpusJson, writeCorpusJson } from "../../../lib/value/corpus";
import { callsUsedToday } from "../../../lib/value/eodhd";
import { fetchPriceHistory, type CachedPriceHistory } from "../../../lib/value/price-history";

export default async function priceHistory({ only, limit, force = false }: { only?: string[]; limit?: number; force?: boolean }): Promise<void> {
  const now = new Date();
  const from = new Date(now);
  from.setUTCFullYear(from.getUTCFullYear() - T.history.years);
  const fetchedAt = new Map<string, string>();
  const preparationErrors = new Map<string, unknown>();
  const eligible = loadCompanies({ only, onError: (company, error) => preparationErrors.set(company.id, error) }).filter(company => {
    if (preparationErrors.has(company.id)) return true;
    try {
      if (!readCorpusJson(`fundamentals/${company.id}.json`)) return false;
      const cached = readCorpusJson<CachedPriceHistory>(`prices-history/${company.id}.json`);
      if (cached?.fetchedAt) fetchedAt.set(company.id, cached.fetchedAt);
      const timestamp = readCorpusJson<{ fetchedAt: string }>(`prices-history/meta/${company.id}.json`)?.fetchedAt ?? cached?.fetchedAt;
      if (timestamp) fetchedAt.set(company.id, timestamp);
      const fetched = Date.parse(timestamp ?? "");
      return force || !Number.isFinite(fetched) || now.getTime() - fetched > T.history.refreshMs;
    } catch (error) {
      preparationErrors.set(company.id, error);
      return true;
    }
  });
  const companies = orderFundamentals(eligible, fetchedAt).slice(0, limit);
  let used: number | undefined;
  let eodRequests = 0;
  let written = 0;
  const failures = new CompanyFailures();
  let attempted = 0;
  for (const company of companies) {
    const isJapan = company.id.endsWith(".JP");
    if (!preparationErrors.has(company.id) && !isJapan && budgetUsage().history >= T.budget.priceHistoryCalls) {
      console.log("daily price-history budget reached, resume tomorrow");
      continue;
    }
    attempted++;
    try {
      if (preparationErrors.has(company.id)) throw preparationErrors.get(company.id);
      if (!isJapan) used ??= await callsUsedToday();
      const useYahoo = isJapan || Math.max(used!, budgetUsage().used) + T.budget.historyCost > T.budget.dailyCalls;
      let prices: PriceHistory;
      try {
        prices = await fetchPriceHistory({ company, from: from.toISOString().slice(0, 10), useYahoo });
      } finally {
        // Failed requests can still consume the shared provider budget.
        if (!useYahoo) {
          used!++;
          if (++eodRequests % T.fundamentals.usageSyncCompanies === 0) used = Math.max(used!, await callsUsedToday());
        }
      }
      writeCorpusJson(`prices-history/${company.id}.json`, prices);
      writeCorpusJson(`prices-history/meta/${company.id}.json`, { fetchedAt: now.toISOString(), failures: 0 });
      written++;
    } catch (error) {
      let previous: { failures?: number } | null = null;
      try { previous = readCorpusJson<{ failures?: number }>(`prices-history/meta/${company.id}.json`); } catch { /* Malformed metadata is already recorded as this attempt’s failure. */ }
      writeCorpusJson(`prices-history/meta/${company.id}.json`, { failures: (previous?.failures ?? 0) + 1, attemptedAt: now.toISOString() });
      failures.record(company.id, error);
    }
  }
  console.log(`price-history: ${written} written`);
  failures.finish("price-history", attempted);
}
