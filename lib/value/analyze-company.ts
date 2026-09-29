import { T } from "./config";
import { bondYield as fetchBondYield, tradingRate } from "./bond-yields";
import { askCompany } from "./jev/run";
import { combine } from "./jev/combine";
import { QUESTIONS, QUESTIONS_VERSION } from "./jev/questions";
import { runNumericTests } from "./tests";
import { valueCompany } from "./valuation";
import type { Analysis, Company, Fundamentals, JevAnswer, ReportMeta, SectionKey } from "./types";

export const PIPELINE_VERSION = "1";
export type Sections = Partial<Record<SectionKey | "description", string>>;
export type Ask = (input: { id: string; sections: Sections }) => Promise<JevAnswer[]>;

export async function analyzeCompany({ company, fundamentals, sections, report, bondYield, ask = askCompany, getBondYield = fetchBondYield }: {
  company: Company; fundamentals: Fundamentals; sections: Sections; report: ReportMeta;
  bondYield: number | null; ask?: Ask; getBondYield?: typeof fetchBondYield;
}): Promise<Analysis> {
  const numeric = runNumericTests({ years: fundamentals.years, kind: company.kind });
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
  const cyclical = (numeric.understandable.metrics.opMarginCv ?? 0) > T.understandable.maxOpMarginCv
    || typeof commodity === "number" && commodity >= T.jev.commodityCyclical;
  const resolvedBondYield = fundamentals.integrity.ok && bondYield === null ? await getBondYield("US") : bondYield;
  const { valuation, reason } = !fundamentals.integrity.ok
    ? { valuation: null, reason: fundamentals.integrity.reasons.join("; ") }
    : resolvedBondYield === null
      ? { valuation: null, reason: "Local government and US10Y bond yields unavailable" }
      : valueCompany({ years: fundamentals.years, kind: company.kind, currency: fundamentals.currency, bondYield: resolvedBondYield, cyclical });
  if (valuation) {
    if (bondYield === null) valuation.assumptions.push("Local government bond yield unavailable; using US10Y yield");
    const rate = await tradingRate({ reporting: fundamentals.currency, trading: company.currency });
    if (rate !== null) valuation.perShareTrading = {
      currency: company.currency, fxRate: rate,
      low: valuation.perShare.low * rate, mid: valuation.perShare.mid * rate, high: valuation.perShare.high * rate,
    };
    else valuation.assumptions.push("Trading currency conversion unavailable");
  }
  return { id: company.id, company, asOf: new Date().toISOString(),
    status: fundamentals.integrity.ok ? "scored" : "insufficient_data", report, tests,
    valuation, valuationReason: reason, versions: { pipeline: PIPELINE_VERSION, questions: QUESTIONS_VERSION } };
}
