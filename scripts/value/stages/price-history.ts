import { T } from "../../../lib/value/config";
import { loadCompanies } from "../../../lib/value/companies";
import { readCorpusJson, writeCorpusJson } from "../../../lib/value/corpus";
import { callsUsedToday } from "../../../lib/value/eodhd";
import { fetchPriceHistory, type CachedPriceHistory } from "../../../lib/value/price-history";

export default async function priceHistory({ only, limit, force = false }: { only?: string[]; limit?: number; force?: boolean }): Promise<void> {
  const now = new Date();
  const from = new Date(now);
  from.setUTCFullYear(from.getUTCFullYear() - T.history.years);
  const companies = loadCompanies({ only }).map(company => {
    const cached = readCorpusJson<CachedPriceHistory>(`prices-history/${company.id}.json`);
    return { company, fetched: Date.parse(cached?.fetchedAt ?? "") };
  }).filter(({ fetched }) => force || !Number.isFinite(fetched) || now.getTime() - fetched > T.history.refreshMs)
    .sort((a, b) => (Number.isFinite(a.fetched) ? a.fetched : -Infinity) - (Number.isFinite(b.fetched) ? b.fetched : -Infinity))
    .slice(0, limit);
  let used: number | undefined;
  let eodRequests = 0;
  let written = 0;
  for (const { company } of companies) {
    const isJapan = company.id.endsWith(".JP");
    if (!isJapan) {
      used ??= await callsUsedToday();
      if (used >= T.fundamentals.dailyBudgetStop) {
        console.log("daily EODHD budget reached, resume tomorrow");
        break;
      }
    }
    const prices = await fetchPriceHistory({ company, from: from.toISOString().slice(0, 10) });
    writeCorpusJson(`prices-history/${company.id}.json`, { fetchedAt: now.toISOString(), prices } satisfies CachedPriceHistory);
    written++;
    if (!isJapan) {
      used!++;
      if (++eodRequests % T.fundamentals.usageSyncCompanies === 0) used = await callsUsedToday();
    }
  }
  console.log(`price-history: ${written} written`);
}
