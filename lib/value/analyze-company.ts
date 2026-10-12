import {latestBalanceAt} from './latest-balance';
import {alignHistoryShares} from './history-split-basis';
import {fiscalPriceMonth} from './fiscal-price-month';
import {qualityLtmAt,qualityLtmHistoryAt} from './quality-ltm';
import {reconcilePriceSplits} from './price-history';
import {netCashSeries} from './net-cash';
import { applyAdjustments, attachJudgements } from "./judgement/apply";
import judgementTrust from "./judgement/trust.json";
import type { JudgementRecord } from "./judgement/types";
import { withCapitalReturns } from './capital-returns';
import { isInvestmentHolding, navPerShare } from './investment-nav';
import { deriveYears } from './derive';
import { companyEvents, earningsVolatility, perShareSeries, valueHistory } from "./history";
import { createUsdRate } from "./fx";
import { kindFor } from "./universe";
import { T } from "./config";
import { bondYield as fetchBondYield, tradingRate } from "./bond-yields";
import { askCompany } from "./jev/run";
import { combine, trustedContradictions } from "./jev/combine";
import { QUESTIONS, QUESTIONS_VERSION } from "./jev/questions";
import { runNumericTests } from "./tests";
import { profitRecord } from "./fair-buy";
import { valueCompany, valuationMargin } from "./valuation";
import { measuredYears, measureNote } from "./hyperinflation";
import type { Analysis, Company, Fundamentals, JevAnswer, ReportMeta, SectionKey, PriceHistory, Year } from "./types";

export const PIPELINE_VERSION = "29";
export type Sections = Partial<Record<SectionKey | "description", string>>;
export type Ask = (input: { id: string; sections: Sections }) => Promise<JevAnswer[]>;

export async function analyzeCompany({ company, fundamentals, sections, report, bondYield, judgement, priceHistory = null, priceHistoryPending = priceHistory === null, currentShares = null, reportedShares = true, shareAssumptions = [], shareSource, ask = askCompany, getBondYield = fetchBondYield, usdRate = createUsdRate(), onDerivedYears, onMemoYears }: {
  judgement?: JudgementRecord | null;
  company: Company; fundamentals: Fundamentals; sections: Sections; report: ReportMeta;
  bondYield: number | null; currentShares?: number | null; reportedShares?: boolean; shareAssumptions?: string[]; shareSource?: "yahoo-shares"; priceHistory?: PriceHistory | null; priceHistoryPending?: boolean; ask?: Ask; getBondYield?: typeof fetchBondYield; usdRate?: ReturnType<typeof createUsdRate>;
  onDerivedYears?: (years:readonly Year[])=>void;
  onMemoYears?: (years:readonly Year[])=>void;
}): Promise<Analysis> {
  fundamentals=alignHistoryShares(fundamentals,priceHistory??[]);
  if(priceHistory)priceHistory=reconcilePriceSplits(priceHistory,fundamentals);
  // Reclassify old corpus enrichment, including payment networks previously marked as banks.
  if (company.industry) company = { ...company, kind: kindFor({ ...company, lending: fundamentals.years.at(-1) }) };
  // One reporting-to-trading FX rate serves both valuation and historical caps.
  const rate = fundamentals.integrity.ok
    ? await tradingRate({ reporting: fundamentals.currency, trading: company.currency, usdRate }) : null;
  // A hyperinflationary reporter is analysed in US dollars, each statement at the
  // rate of the year-end currency it is stated in; nominal amounts are not comparable.
  const measure = fundamentals.integrity.ok ? fundamentals.measure ?? null : null;
  const measuredRate = measure ? await tradingRate({ reporting: measure.currency, trading: company.currency, usdRate }) : null;
  const monthly = new Map(priceHistory?.map(([month, close]) => [month.slice(0, 7), close]));
  let years = deriveYears(fundamentals.years.map(year => {
    const priceMonth = fiscalPriceMonth(year.end);
    const close = monthly.get(priceMonth);
    // Vendor balance templates can repeat the EPS denominator in this field.
    // Prefer outstanding shares only when an exact fiscal-instant source exists.
    const capitalizationShares = year.sharesOutstanding != null && year.sharesOutstanding > 0
      && year.provenance?.sharesOutstanding?.inputs?.includes('Fiscal-end common shares outstanding')
      ? year.sharesOutstanding : year.dilutedShares;
    const marketCap = rate !== null && rate > 0 && close !== undefined && Number.isFinite(close) && close > 0
      && capitalizationShares !== null && capitalizationShares > 0 ? close * capitalizationShares / rate : null;
    const prices=(priceHistory??[]).filter(([month])=>month > `${Number(priceMonth.slice(0,4))-1}${priceMonth.slice(4)}` && month <= priceMonth).map(([,close])=>close);
    const averageSharePrice=rate!==null&&rate>0&&prices.length>=6 ? prices.reduce((s,n)=>s+n,0)/prices.length/rate : null;
    return {...year,marketCap,averageSharePrice,provenance:{...year.provenance,
      ...(averageSharePrice!==null?{averageSharePrice:{source:`prices-history/${company.id}`,field:'mean monthly close converted to reporting currency',method:'estimate' as const,inputs:[`fiscal end: ${year.end}`,`monthly observations: ${prices.length}`,`reporting-to-trading FX: ${rate}`]}}:{}),
      ...(marketCap!==null?{marketCap:{source:`prices-history/${company.id}`,field:'fiscal-end close × capitalization shares / reporting-to-trading FX',method:'derived' as const,inputs:[`fiscal end: ${year.end}`,`price month: ${priceMonth}`,`close: ${close}`,`capitalization shares: ${capitalizationShares}`,capitalizationShares===year.sharesOutstanding&&year.provenance?.sharesOutstanding?.inputs?.includes('Fiscal-end common shares outstanding')?'Reported fiscal-end shares':'Weighted diluted share proxy',`FX: ${rate}`]}}:{}),
    }};
  }));
  company = { ...company, investmentHolding: isInvestmentHolding(company, years) };
  onDerivedYears?.(years);
  const cutoff=new Date().toISOString().slice(0,10);
  const qualityLtm=qualityLtmAt(fundamentals.qualityQuarters??[],years,cutoff,fundamentals.splits);
  const qualityLtmHistory=qualityLtmHistoryAt(fundamentals.qualityQuarters??[],years,cutoff,fundamentals.splits,qualityLtm);
  for(const ltm of qualityLtmHistory)if(rate&&ltm.dilutedShares&&monthly.get(fiscalPriceMonth(ltm.end)))ltm.marketCap=monthly.get(fiscalPriceMonth(ltm.end))!*ltm.dilutedShares/rate;
  // Trailing quarters are stated in a later, unidentified currency unit.
  const testInput = (ys: Year[]) => measure ? { years: measuredYears(ys, measure, rate), qualityLtm: null, qualityLtmHistory: [] } : { years: ys, qualityLtm, qualityLtmHistory };
  const rawNumeric = runNumericTests({ ...testInput(years), kind: company.kind, industry: company.industry, priceHistoryPending: priceHistoryPending && rate !== null });
  const adjusted = applyAdjustments(years, fundamentals.integrity.ok && company.kind==='operating' ? judgement : null, judgementTrust, fundamentals.currency);
  years = adjusted.years;
  // Persist precisely the split-normalized, price-derived and judgement-adjusted
  // rows used by the tests. Publication must not rebuild a different statement.
  onMemoYears?.(years);
  const numeric = runNumericTests({ ...testInput(years), kind: company.kind, industry: company.industry, priceHistoryPending: priceHistoryPending && rate !== null });
  const measuredNote = measure ? measureNote(measure) : null;
  let tests = {} as Analysis["tests"];
  const answers = fundamentals.integrity.ok ? await ask({ id: company.id, sections }) : [];
  for (const key of Object.keys(numeric) as Array<keyof typeof numeric>) {
    const jev = answers.filter(answer => QUESTIONS.find(q => q.id === answer.q)?.test === key);
    tests[key] = fundamentals.integrity.ok
      ? { ...numeric[key], result: combine({ numeric: numeric[key].numeric, jev, kind: company.kind }), jev,
          reasons: [...(measuredNote ? [`In US dollars (${measure!.reporting}, IAS 29)`] : []), ...(numeric[key].numeric === 'pass' ? trustedContradictions(jev, company.kind).map(a => `${a.label}: ${a.probability! >= .5 ? 'yes' : 'no'} (filing evidence)`) : []), ...numeric[key].reasons] }
      : { key, numeric: "unclear", result: "unclear", metrics: {}, series: {}, jev: [], reasons: [...fundamentals.integrity.reasons] };
  }
  const human = attachJudgements({tests} as Analysis, fundamentals.integrity.ok ? judgement : null, judgementTrust, adjusted.adjustments, rawNumeric as Analysis["tests"]);
  tests = human.tests;
  // askCompany returns one aggregated answer per question (commodity uses a weighted mean).
  const commodity = answers.find(answer => answer.q === "commodity")?.value;
  const isCommodity = typeof commodity === "number" && commodity >= T.jev.commodityCyclical;
  const volatility = earningsVolatility({ opMarginCv: (numeric.understandable.metrics.roeCv ?? numeric.understandable.metrics.opMarginCv ?? null), commodity: isCommodity });
  const cyclical = isCommodity || (numeric.understandable.metrics.roeCv ?? numeric.understandable.metrics.opMarginCv ?? null) !== null && volatility === "volatile";
  const resolvedBondYield = bondYield;
  const { valuation, reason } = !fundamentals.integrity.ok
    ? { valuation: null, reason: fundamentals.integrity.reasons.join("; ") }
    : resolvedBondYield === null && !company.investmentHolding
      ? { valuation: null, reason: "Local government bond yield unavailable" }
      : measure
        // US-dollar valuation from the measured annual statements; trailing and interim statements are in unidentified units.
        ? measuredRate === null ? { valuation: null, reason: "US-dollar trading conversion unavailable for a hyperinflationary reporter" }
          : valueCompany({ cutoff, investmentHolding: company.investmentHolding, years: measuredYears(years, measure, rate), kind: company.kind, industry:company.industry, currency: measure.currency, bondYield: resolvedBondYield, cyclical, currentShares, reportedShares, shareAssumptions: [...shareAssumptions, measuredNote!], shareSource, priceHistory, ttm: null, balance: null, qualityPass: Object.values(tests).every(test => test.result === "pass") })
        : valueCompany({ currentCommonBalance:fundamentals.currentCommonBalance, cutoff, investmentHolding: company.investmentHolding, years, kind: company.kind, industry:company.industry, currency: fundamentals.currency, bondYield: resolvedBondYield, cyclical, currentShares, reportedShares, shareAssumptions, shareSource, priceHistory, ttm: fundamentals.ttm, balance: years.length ? latestBalanceAt(fundamentals.balanceSheets??[],cutoff,fundamentals.currency,years.at(-1)!,company.kind) : null, qualityPass: Object.values(tests).every(test => test.result === "pass") });
  const valuationRate = measure ? measuredRate : rate;
  const requiredMos = valuationMargin(valuation, volatility);
  if (valuation) {
    if(adjusted.adjustments.length) valuation.assumptions.push(...adjusted.adjustments.map(a=>a.reason));
    if (company.source === "edinet" && !years.at(-1)?.edinetShares) valuation.assumptions.push("Unverified JP share count unreconciled: EDINET share facts unavailable");
    if (valuationRate !== null) valuation.perShareTrading = {
      currency: company.currency, fxRate: valuationRate,
      low: valuation.perShare.low * valuationRate, mid: valuation.perShare.mid * valuationRate, high: valuation.perShare.high * valuationRate,
    };
    else valuation.assumptions.push("Trading currency conversion unavailable");
  }
  // Charts, value history and capital returns use the same measured statements as the tests.
  const shown = (f: Fundamentals): Fundamentals => measure ? { ...f, currency: measure.currency, years: measuredYears(f.years, measure, rate), ttm: null, balanceSheets: [] } : f;
  return withCapitalReturns({ ...(measure ? { measure: { currency: measure.currency, reporting: measure.reporting, note: measuredNote! } } : {}), profitRecord: profitRecord({ years: measure ? measuredYears(years, measure, rate) : years, kind: company.kind }), predecessorHistory: fundamentals.years.flatMap(y=>y.predecessor?[{fy:y.fy,...y.predecessor}]:[]), judgement: human.judgement, reportingCurrency: fundamentals.currency, ...(shareSource && currentShares ? { shareCount: {value:currentShares,source:shareSource} } : {}), requiredMos, volatility, historyCoverage: {years: fundamentals.years.length, first: fundamentals.years[0]?.fy ?? null, last: fundamentals.years.at(-1)?.fy ?? null, source: company.source},
    valueHistory: valueHistory({ investmentHolding: company.investmentHolding, fundamentals: shown(fundamentals), kind: company.kind, industry: company.industry, bondYield: resolvedBondYield, fxRate: measure ? measuredRate : rate, commodity: isCommodity }),
    historyAssumptions: ["Historical values use today's bond yield for every fiscal year", "Historical values use today's FX rate into trading currency for every fiscal year", "Historical values use current restated fundamentals and current commodity classification; they are not point-in-time estimates", ...(adjusted.adjustments.length?["Historical value ranges retain the original capex calculation; the current filing judgement is not backfilled into historical valuations"]:[])],
    events: companyEvents(fundamentals), series: company.investmentHolding ? { netCash: netCashSeries(years), navPerShare: years.map(y => [y.fy, navPerShare(y)]) } : perShareSeries(shown(adjusted.adjustments.length ? {...fundamentals,years} : fundamentals)),
    id: company.id, company, asOf: new Date().toISOString(),
    status: fundamentals.integrity.ok ? "scored" : "insufficient_data", report, tests,
    valuation, valuationReason: reason, versions: { pipeline: PIPELINE_VERSION, questions: QUESTIONS_VERSION } }, measure ? measuredYears(years, measure, rate) : years);
}
