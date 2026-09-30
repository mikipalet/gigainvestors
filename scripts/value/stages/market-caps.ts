import { loadCompanies } from "../../../lib/value/companies";
import { writeCorpusJson } from "../../../lib/value/corpus";
import {
  compareDownloads,
  enrichMissingCaps,
} from "../../../lib/value/download-order";

/** Free cap backfill can be run independently of paid fundamentals downloads. */
export default async function marketCaps(options: {
  only?: string[];
  limit?: number;
}): Promise<void> {
  const companies = loadCompanies(options);
  const before = companies.filter((c) => c.marketCapUsd !== null).length;
  await enrichMissingCaps(companies);
  companies.sort(compareDownloads);
  const known = companies.filter((c) => c.marketCapUsd !== null).length;
  const summary = {
    at: new Date().toISOString(),
    selected: companies.length,
    knownBefore: before,
    knownAfter: known,
    filled: known - before,
    order: companies.map((c) => ({
      id: c.id,
      marketCapUsd: c.marketCapUsd,
      venue: c.listingExchange ?? c.exchange,
    })),
  };
  writeCorpusJson("raw/market-caps/summary.json", summary);
  console.log(
    `market-caps: ${companies.length} companies, ${known - before} caps recovered, ${companies.length - known} unknown`,
  );
}
