import { T } from "./config";
import { QUESTIONS } from "./jev/questions";
import { priceTest } from "./price-test";
import { shardOf } from "./shard";
import { QUALITY_TESTS, type Analysis, type Dossier, type IndexRow, type PriceMap, type Valuation } from "./types";

function usdRate(currency: string, fx: Record<string, number>): number | null {
  const major = currency === "GBX" || currency === "GBp" ? "GBP" : currency === "ZAc" ? "ZAR" : currency;
  const rate = major === "USD" ? 1 : fx[major];
  return Number.isFinite(rate) && rate > 0 ? rate / (major === currency ? 1 : 100) : null;
}

function tradingValuation(analysis: Analysis, fx: Record<string, number>): Valuation | null {
  const valuation = analysis.status === "scored" ? analysis.valuation : null;
  if (!valuation) return null;
  const currency = analysis.company.currency;
  let range = valuation.perShareTrading?.currency === currency ? valuation.perShareTrading : null;
  if (!range) {
    const from = usdRate(valuation.currency, fx);
    const to = usdRate(currency, fx);
    const rate = valuation.currency === currency ? 1 : from !== null && to !== null ? from / to : null;
    if (rate === null) return null;
    range = { currency, fxRate: rate, low: valuation.perShare.low * rate, mid: valuation.perShare.mid * rate, high: valuation.perShare.high * rate };
  }
  if (![range.low, range.mid, range.high].every(Number.isFinite)) return null;
  return { ...valuation, currency, perShare: { low: range.low, mid: range.mid, high: range.high } };
}

export function buildOutput({ analyses, holdersByTicker, investorNames, fx, prices = {} }: {
  analyses: Analysis[];
  holdersByTicker: Record<string, string[]>;
  investorNames: Record<string, string>;
  fx: Record<string, number>;
  prices?: PriceMap;
}): { files: Record<string, unknown> } {
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
    const valuation = tradingValuation(analysis, fx);
    const price = priceTest(valuation, prices[analysis.id]?.[0] ?? null);
    const dossier: Dossier = {
      ...analysis, holders, series: Object.assign({}, ...outcomes.map((test) => test.series)),
      tests: { ...analysis.tests, price: { key: "price", result: price.result, numeric: price.result, reasons: price.mos === null ? ["Valuation or price unavailable in trading currency"] : [], metrics: { mos: price.mos }, series: {}, jev: [] } },
    };
    const shard = shardOf(analysis.id);
    (shards[shard] ??= {})[analysis.id] = dossier;
    const row: IndexRow = {
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
  files["meta.json"] = {
    asOf: analyses.map((analysis) => analysis.asOf).sort().at(-1) ?? null,
    counts: { universe: rows.length, scored: rows.filter((row) => row.st === "s").length, insufficient: rows.filter((row) => row.st === "i").length },
    versions: analyses[0]?.versions ?? null, tags,
  };
  return { files };
}
