import { T } from "./config";
import { tradingRate } from "./bond-yields";
import { askCompany } from "./jev/run";
import { combine } from "./jev/combine";
import { QUESTIONS, QUESTIONS_VERSION } from "./jev/questions";
import { runNumericTests } from "./tests";
import { valueCompany } from "./valuation";
import type { Analysis, Company, Fundamentals, JevAnswer, ReportMeta, SectionKey } from "./types";

export const PIPELINE_VERSION = "1";
export type Sections = Partial<Record<SectionKey | "description", string>>;
export type Ask = (input: { id: string; sections: Sections }) => Promise<JevAnswer[]>;

export async function analyzeCompany({ company, fundamentals, sections, report, bondYield, ask = askCompany }: {
  company: Company; fundamentals: Fundamentals; sections: Sections; report: ReportMeta;
  bondYield: number | null; ask?: Ask;
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
  const cyclical = (numeric.understandable.metrics.opMarginCv ?? 0) > T.understandable.maxOpMarginCv
    || answers.some(answer => answer.q === "commodity" && typeof answer.value === "number" && answer.value >= T.jev.evidence);
  const { valuation, reason } = fundamentals.integrity.ok
    ? valueCompany({ years: fundamentals.years, kind: company.kind, currency: fundamentals.currency, bondYield, cyclical })
    : { valuation: null, reason: fundamentals.integrity.reasons.join("; ") };
  if (valuation) {
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
