import { createUsdRate } from "./fx";
import { T } from "./config";
import { QUESTIONS } from "./jev/questions";
import { priceTest } from "./price-test";
import { shardOf } from "./shard";
import { QUALITY_TESTS, type Analysis, type Dossier, type IndexRow, type PriceMap, type PriceHistory, type Valuation } from "./types";

function tradingValuation(analysis: Analysis, usdRate: (currency: string) => number | null): Valuation | null {
  const valuation = analysis.status === "scored" ? analysis.valuation : null;
  if (!valuation) return null;
  const currency = analysis.company.currency;
  let range = valuation.perShareTrading?.currency === currency ? valuation.perShareTrading : null;
  if (!range) {
    const from = usdRate(valuation.currency);
    const to = usdRate(currency);
    const rate = valuation.currency === currency ? 1 : from !== null && to !== null ? from / to : null;
    if (rate === null) return null;
    range = { currency, fxRate: rate, low: valuation.perShare.low * rate, mid: valuation.perShare.mid * rate, high: valuation.perShare.high * rate };
  }
  if (![range.low, range.mid, range.high].every(Number.isFinite)) return null;
  return { ...valuation, currency, perShare: { low: range.low, mid: range.mid, high: range.high } };
}

export function buildOutput({ analyses, holdersByTicker, investorNames, fx, prices = {}, priceHistories = {}, universe = analyses.length }: {
  analyses: Analysis[];
  holdersByTicker: Record<string, string[]>;
  investorNames: Record<string, string>;
  fx: Record<string, number>;
  prices?: PriceMap;
  priceHistories?: Record<string, PriceHistory>;
  universe?: number;
}): { files: Record<string, unknown> } {
  const usdRate = createUsdRate({ rates: fx });
  const files: Record<string, unknown> = {};
  const countries: Record<string, IndexRow[]> = {};
  const shards: Record<string, Record<string, Dossier>> = {};
  const tags: Record<string, string> = {};
  const sorted = [...analyses].sort((a, b) => (b.company.marketCapUsd ?? -Infinity) - (a.company.marketCapUsd ?? -Infinity) || a.id.localeCompare(b.id));
  const rows: IndexRow[] = [];
  for (const analysis of sorted) {
    const { company } = analysis;
    if (!/^[A-Z]{2}$/.test(company.country)) throw new Error(`Invalid country for ${analysis.id}`);
    const listings = analysis.id.endsWith(".US") ? [analysis.id] : company.listings.filter((id) => id.endsWith(".US"));
    const codes = [...new Set(listings.flatMap((id) => holdersByTicker[id.slice(0, -3).replaceAll("-", ".")] ?? []))].sort();
    const holders = codes.map((code) => ({ code, name: investorNames[code] ?? code }));
    const quality = QUALITY_TESTS.filter((key) => key !== "price");
    const outcomes = quality.map((key) => analysis.tests[key]);
    const g = new Set<string>();
    for (const answer of outcomes.flatMap((test) => test.jev)) {
      const question = QUESTIONS.find((q) => q.id === answer.q);
      if (!question?.tag || !answer.trusted || answer.value === null || answer.probability === null || answer.probability < T.jev.contradict) continue;
      const applies = answer.kind === "noul" && typeof answer.value === "number" && answer.value >= T.jev.contradict
        || answer.kind === "choice" && question.id === "revenue_model" && answer.value === "recurring";
      if (applies) { g.add(question.tag); tags[question.tag] = question.id === "revenue_model" ? "Recurring revenue" : question.label; }
    }
    const valuation = tradingValuation(analysis, usdRate);
    const requiredMos = analysis.requiredMos ?? T.price.requiredMos.stable;
    const price = priceTest({ valuation, price: prices[analysis.id]?.[0] ?? null, requiredMos });
    const dossier: Dossier = {
      ...analysis, requiredMos, holders,
      ...(priceHistories[analysis.id] ? { priceHistory: priceHistories[analysis.id] } : {}),
      series: Object.assign({}, ...outcomes.map((test) => test.series), analysis.series),
      tests: { ...analysis.tests, price: { key: "price", result: price.result, numeric: price.result, reasons: price.mos === null ? ["Valuation or price unavailable in trading currency"] : [], metrics: { mos: price.mos }, series: {}, jev: [] } },
    };
    const shard = shardOf(analysis.id);
    (shards[shard] ??= {})[analysis.id] = dossier;
    const roic = (analysis.tests.moat.series.roic ?? []).slice(-T.history.years)
      .map(([, value]) => value === null || !Number.isFinite(value) ? null : Number(value.toPrecision(3)));
    const row: IndexRow = {
      m: requiredMos, r: [...Array<number | null>(T.history.years - roic.length).fill(null), ...roic],
      id: analysis.id, n: company.name, c: company.country, s: company.sector, k: company.kind,
      mc: company.marketCapUsd, v: valuation ? [valuation.perShare.low, valuation.perShare.mid, valuation.perShare.high] : null,
      cur: company.currency, t: outcomes.map((test) => test.result[0].toUpperCase()).join(""),
      g: [...g].sort(), h: holders.length, st: analysis.status === "scored" ? "s" : "i",
    };
    rows.push(row);
    (countries[company.country] ??= []).push(row);
  }
  for (const [country, countryRows] of Object.entries(countries)) {
    files[`index/${country}.json`] = countryRows;
    files[`prices/${country}.json`] = Object.fromEntries(countryRows.filter((row) => prices[row.id]).map((row) => [row.id, prices[row.id]]));
  }
  for (const [shard, dossiers] of Object.entries(shards)) files[`dossiers/${shard}.json`] = dossiers;
  files["index/default.json"] = rows.filter((row) => row.st === "s" && (row.t === "PPPPP" || /^P*FP*$/.test(row.t)));
  files["top.json"] = rows.slice(0, 2000).map((row) => row.id);
  const versionCounts = new Map<string, { versions: Analysis["versions"]; count: number }>();
  for (const { versions } of analyses) {
    const key = JSON.stringify([versions.pipeline, versions.questions]);
    const entry = versionCounts.get(key) ?? { versions, count: 0 };
    entry.count++;
    versionCounts.set(key, entry);
  }
  // Stable tie-breaking makes identical corpora independent of input order.
  const common = [...versionCounts.entries()].sort(([a, av], [b, bv]) => bv.count - av.count || a.localeCompare(b))[0]?.[1];
  files["meta.json"] = {
    asOf: analyses.map((analysis) => analysis.asOf).sort().at(-1) ?? null,
    counts: { universe, analysed: rows.length, scored: rows.filter((row) => row.st === "s").length, insufficient: rows.filter((row) => row.st === "i").length },
    versions: common ? { ...common.versions, other: analyses.length - common.count } : null, tags,
  };
  return { files };
}
