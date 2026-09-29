import { readCorpusJson, readJsonl, writeCorpusJson } from "../../../lib/value/corpus";
import { T } from "../../../lib/value/config";
import { callsUsedToday, getFundamentals } from "../../../lib/value/eodhd";
import { createUsdRate } from "../../../lib/value/fx";
import { normalizeEodhd } from "../../../lib/value/normalize-eodhd";
import type { Company, Fundamentals } from "../../../lib/value/types";

interface Options { only?: string[]; limit?: number; force?: boolean }

/** Stable sort preserves universe (market cap) order for new companies and ties. */
export function orderFundamentals(companies: Company[], fetchedAt: ReadonlyMap<string, string>): Company[] {
  const fetchedTime = (id: string) => {
    const timestamp = Date.parse(fetchedAt.get(id) ?? "");
    return Number.isFinite(timestamp) ? timestamp : -Infinity;
  };
  return [...companies].sort((a, b) => fetchedTime(a.id) - fetchedTime(b.id));
}

export default async function fundamentals(options: Options): Promise<void> {
  const universe = readJsonl<Company>("universe.jsonl");
  if (!universe.length) throw new Error("Run the universe stage before fundamentals");
  const eligible = universe.filter((company) => (!options.only || options.only.includes(company.id)) && company.source !== "edinet");
  const fetchedAt = new Map<string, string>();
  for (const company of eligible) {
    const existing = readCorpusJson<Fundamentals>(`fundamentals/${company.id}.json`);
    if (existing?.fetchedAt) fetchedAt.set(company.id, existing.fetchedAt);
  }
  // Rolling refresh always refetches selected companies, including with --force.
  const selected = orderFundamentals(eligible, fetchedAt).slice(0, options.limit);
  const usdRate = createUsdRate(options);
  let used = await callsUsedToday();
  let written = 0;
  for (const company of selected) {
    if (used >= T.fundamentals.dailyBudgetStop) {
      console.log("daily EODHD budget reached, resume tomorrow");
      break;
    }
    const raw = await getFundamentals(company.id);
    used += T.fundamentals.requestCost;
    const { fundamentals: normalized, patch, marketCap } = normalizeEodhd(raw, company.id);
    const existing = readCorpusJson<Partial<Company>>(`companies/${company.id}.json`);
    const currency = marketCap.currency ?? existing?.currency ?? company.currency;
    const rate = marketCap.value !== null && currency ? await usdRate(currency) : null;
    patch.marketCapUsd = marketCap.value !== null && rate !== null ? marketCap.value * rate : null;
    const knownPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value != null));
    writeCorpusJson(`raw/eodhd/${company.id}.json`, raw);
    writeCorpusJson(`companies/${company.id}.json`, { ...company, ...existing, ...knownPatch });
    writeCorpusJson(`fundamentals/${company.id}.json`, normalized);
    written++;
    console.log(`${company.id}: ${normalized.years.length} annual periods, integrity ${normalized.integrity.ok ? "ok" : normalized.integrity.reasons.join("; ")}`);
    if (written % T.fundamentals.usageSyncCompanies === 0) used = await callsUsedToday();
  }
  console.log(`fundamentals: ${written} written`);
}
