import { companyEvents, earningsVolatility, perShareSeries, valueHistory } from "./history";
import { createUsdRate } from "./fx";
import { kindFor } from "./universe";
import { T } from "./config";
import { bondYield as fetchBondYield, tradingRate } from "./bond-yields";
import { askCompany } from "./jev/run";
import { combine } from "./jev/combine";
import { QUESTIONS, QUESTIONS_VERSION } from "./jev/questions";
import { runNumericTests } from "./tests";
import { valueCompany } from "./valuation";
import type { Analysis, Company, Fundamentals, JevAnswer, ReportMeta, SectionKey, PriceHistory } from "./types";

export const PIPELINE_VERSION = "7";
export type Sections = Partial<Record<SectionKey | "description", string>>;
export type Ask = (input: { id: string; sections: Sections }) => Promise<JevAnswer[]>;

export async function analyzeCompany({ company, fundamentals, sections, report, bondYield, priceHistory = null, priceHistoryPending = priceHistory === null, currentShares = null, reportedShares = true, shareAssumptions = [], ask = askCompany, getBondYield = fetchBondYield, usdRate = createUsdRate() }: {
  company: Company; fundamentals: Fundamentals; sections: Sections; report: ReportMeta;
  bondYield: number | null; currentShares?: number | null; reportedShares?: boolean; shareAssumptions?: string[]; priceHistory?: PriceHistory | null; priceHistoryPending?: boolean; ask?: Ask; getBondYield?: typeof fetchBondYield; usdRate?: ReturnType<typeof createUsdRate>;
}): Promise<Analysis> {
  // Reclassify old corpus enrichment, including payment networks previously marked as banks.
  if (company.industry) company = { ...company, kind: kindFor({ ...company, lending: fundamentals.years.at(-1) }) };
  // One reporting-to-trading FX rate serves both valuation and historical caps.
  const rate = fundamentals.integrity.ok
    ? await tradingRate({ reporting: fundamentals.currency, trading: company.currency, usdRate }) : null;
  const monthly = new Map(priceHistory?.map(([month, close]) => [month.slice(0, 7), close]));
  const years = fundamentals.years.map(year => {
    const close = monthly.get(year.end.slice(0, 7));
    const marketCap = rate !== null && rate > 0 && close !== undefined && Number.isFinite(close) && close > 0
      && year.dilutedShares !== null && year.dilutedShares > 0 ? close * year.dilutedShares / rate : null;
    return { ...year, marketCap };
  });
  const numeric = runNumericTests({ years, kind: company.kind, priceHistoryPending: priceHistoryPending && rate !== null });
  const tests = {} as Analysis["tests"];
  const answers = fundamentals.integrity.ok ? await ask({ id: company.id, sections }) : [];
  for (const key of Object.keys(numeric) as Array<keyof typeof numeric>) {
    const jev = answers.filter(answer => QUESTIONS.find(q => q.id === answer.q)?.test === key);
    tests[key] = fundamentals.integrity.ok
      ? { ...numeric[key], result: combine({ numeric: numeric[key].numeric, jev }), jev }
      : { key, numeric: "unclear", result: "unclear", metrics: {}, series: {}, jev: [], reasons: [...fundamentals.integrity.reasons] };
  }
  // askCompany returns one aggregated answer per question (commodity uses a weighted mean).
  const commodity = answers.find(answer => answer.q === "commodity")?.value;
  const isCommodity = typeof commodity === "number" && commodity >= T.jev.commodityCyclical;
  const volatility = earningsVolatility({ opMarginCv: numeric.understandable.metrics.opMarginCv, commodity: isCommodity });
  const requiredMos = T.price.requiredMos[volatility];
  const cyclical = isCommodity || numeric.understandable.metrics.opMarginCv !== null && volatility === "volatile";
  const resolvedBondYield = fundamentals.integrity.ok && bondYield === null ? await getBondYield("US") : bondYield;
  const { valuation, reason } = !fundamentals.integrity.ok
    ? { valuation: null, reason: fundamentals.integrity.reasons.join("; ") }
    : resolvedBondYield === null
      ? { valuation: null, reason: "Local government and US10Y bond yields unavailable" }
      : valueCompany({ years, kind: company.kind, currency: fundamentals.currency, bondYield: resolvedBondYield, cyclical, currentShares, reportedShares, shareAssumptions, priceHistory, ttm: fundamentals.ttm });
  if (valuation) {
    if (bondYield === null) valuation.assumptions.push("Local government bond yield unavailable; using US10Y yield");
    if (rate !== null) valuation.perShareTrading = {
      currency: company.currency, fxRate: rate,
      low: valuation.perShare.low * rate, mid: valuation.perShare.mid * rate, high: valuation.perShare.high * rate,
    };
    else valuation.assumptions.push("Trading currency conversion unavailable");
  }
  return { requiredMos, volatility, historyCoverage: {years: fundamentals.years.length, first: fundamentals.years[0]?.fy ?? null, last: fundamentals.years.at(-1)?.fy ?? null, source: company.source},
    valueHistory: valueHistory({ fundamentals, kind: company.kind, bondYield: resolvedBondYield, fxRate: rate, commodity: isCommodity }),
    historyAssumptions: ["Historical values use today's bond yield for every fiscal year", "Historical values use today's FX rate into trading currency for every fiscal year", "Historical values use current restated fundamentals and current commodity classification; they are not point-in-time estimates"],
    events: companyEvents(fundamentals), series: perShareSeries(fundamentals),
    id: company.id, company, asOf: new Date().toISOString(),
    status: fundamentals.integrity.ok ? "scored" : "insufficient_data", report, tests,
    valuation, valuationReason: reason, versions: { pipeline: PIPELINE_VERSION, questions: QUESTIONS_VERSION } };
}
