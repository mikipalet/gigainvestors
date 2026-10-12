import {withShareDenominator} from './share-check';
import {composePriceStory,retainStoryTimestamp} from './price-story/compose';
import {memoAtPrice} from './owner-memo';
import {consistentValuation} from './return-model';
import { METHOD_VERSION } from './method-version';
import {indiaDepositarySymbols} from './india/symbols';
import { isDecided, isFindable, shortHistory, missingInvestmentNav } from './publication-eligibility';
import { withAnalysisHistory } from './test-history';
import { publicAnalysis } from './public-analysis';
import { buyReturnInputs } from "./owner-return";
import { bestWesternListing } from "./western";
import { storyFromFunnel } from "./story";
import { valuationFlags } from "./data-quality";
import { reviewedInputError } from "./reviewed-input-errors";
import { assertIndexConsistency } from "./consistency";
import { dossierReturn } from "./presentation";
import { sameCurrency } from "./currency";
import { createUsdRate } from "./fx";
import { T } from "./config";
import { QUESTIONS } from "./jev/questions";
import { publishedBuyPrice } from "./buy-price";
import { gateCode, profitLetter, qualityPass } from "./fair-buy";
import { shardOf } from "./shard";
import { NAV_BUY } from "./investment-nav";
import { QUALITY_TESTS, type FunnelCounts, type PublishedFunnel, type Analysis, type Dossier, type IndexRow, type PriceMap, type PriceHistory, type Valuation } from "./types";

function tradingValuation(analysis: Analysis, usdRate: (currency: string) => number | null): Valuation | null {
  const valuation = analysis.status === "scored" ? analysis.valuation : null;
  if (!valuation) return null;
  const currency = analysis.company.currency;
  let range = valuation.perShareTrading && sameCurrency(valuation.perShareTrading.currency, currency) ? valuation.perShareTrading : null;
  if (!range) {
    const from = usdRate(valuation.currency);
    const to = usdRate(currency);
    const rate = sameCurrency(valuation.currency, currency) ? 1 : from !== null && to !== null ? from / to : null;
    if (rate === null) return null;
    range = { currency, fxRate: rate, low: valuation.perShare.low * rate, mid: valuation.perShare.mid * rate, high: valuation.perShare.high * rate };
  }
  if (![range.low, range.mid, range.high].every(Number.isFinite)) return null;
  return { ...valuation, currency, perShare: { low: range.low, mid: range.mid, high: range.high } };
}

const LEGACY_NAV_BUY = 'Buy requires price at or below 85% of both reported NAV and discounted NAV realization value';
/** Analyses written before 3.8.0 carry the old NAV buy assumption; the valuation is unchanged. */
function navBuyCopy(valuation: Valuation | null): Valuation | null {
  return valuation?.assumptions.includes(LEGACY_NAV_BUY) ? { ...valuation, assumptions: valuation.assumptions.map(a => a === LEGACY_NAV_BUY ? NAV_BUY : a) } : valuation;
}

function emptyFunnel(): FunnelCounts {
  return {
    asOf: null, analysed: 0,
    // 3.8.0 Buy gates. Earnings resilience is evidence, not a gate; the profit
    // record is best-1's loss and owner-earnings eligibility (fair-buy.ts).
    gates: ([
      { key: "moat", label: "Moat" },
      { key: "economics", label: "Economics" },
      { key: "management", label: "Management" },
      { key: "accounting", label: "Accounting" },
      { key: "record", label: "Profit record" },
      { key: "price", label: "At or below value" },
    ] satisfies Array<Pick<FunnelCounts["gates"][number], "key" | "label">>).map(gate => ({ ...gate, passing: 0, pass: 0, fail: 0, checking: 0, unclear: 0, failsOnlyThis: 0 })),
  };
}

export function buildOutput({ analyses, holdersByTicker, investorNames, fx, prices = {}, priceHistories = {}, previousDossiers = {}, issuerContradictions = {}, capShares = {}, universe = analyses.length }: {
  analyses: Analysis[];
  previousDossiers?: Record<string,Dossier>;
  issuerContradictions?: Record<string,import('./share-check').ShareObservation[]>;
  capShares?: Record<string,number>;
  holdersByTicker: Record<string, string[]>;
  investorNames: Record<string, string>;
  fx: Record<string, number>;
  prices?: PriceMap;
  priceHistories?: Record<string, PriceHistory>;
  universe?: number;
}): { files: Record<string, unknown>; unresolved: Array<{id:string;qualityPass:boolean;reasons:string[]}> } {
  const usdRate = createUsdRate({ rates: fx });
  const files: Record<string, unknown> = {};
  const unresolved: Array<{id:string;qualityPass:boolean;reasons:string[]}> = [];
  const countries: Record<string, IndexRow[]> = {};
  const shards: Record<string, Record<string, Dossier>> = {};
  const tags: Record<string, string> = {};
  const sorted = analyses.map(a=>({...a,valuation:consistentValuation(a.valuation)})).map(withAnalysisHistory).sort((a, b) => (b.company.marketCapUsd ?? -Infinity) - (a.company.marketCapUsd ?? -Infinity) || a.id.localeCompare(b.id));
  const rows: IndexRow[] = [];
  const westernFunnel: PublishedFunnel = { ...emptyFunnel(), byCountry: {} };
  const funnel: PublishedFunnel = { ...emptyFunnel(), byCountry: {} };
  for (const original of sorted) {
    let analysis = isFindable(original) && shortHistory(original) ? {...original,status:"insufficient_data" as const,valuation:null} : original;
    if (!isFindable(analysis)) {
      if (shortHistory(analysis) && !missingInvestmentNav(analysis)) {
        const dossier: Dossier={...analysis,methodVersion:METHOD_VERSION,w:null,b:false,holders:[],series:analysis.series??{}};
        const visible=publicAnalysis(dossier);visible.ownerMemo=memoAtPrice(visible,prices[analysis.id]);
    visible.priceStory=composePriceStory(visible,prices[analysis.id]??null,analysis.priceStory?.selected??null,analysis.priceStory?.events??[],analysis.priceStory?.asOf??new Date().toISOString());
        visible.priceStory=retainStoryTimestamp(visible.priceStory,previousDossiers[analysis.id]?.priceStory);
        (shards[shardOf(analysis.id)]??={})[analysis.id]=visible;
      }
      continue;
    }
    const { company } = analysis;
    const w = bestWesternListing(company);
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
    let valuation = tradingValuation(analysis, usdRate);
    // 3.8.0: Buy at or below central value; no margin-of-safety discount.
    const requiredMos = T.price.buyMos;
    const t = analysis.status !== "scored" ? "UUUUU" : outcomes.map(test => test.result === "unclear" && test.pending ? "C" : test.result[0].toUpperCase()).join("");
    const pr = analysis.status !== "scored" ? "U" : profitLetter(analysis.profitRecord);
    let dataQualityFlags = valuationFlags({price:prices[analysis.id]?.[0]??null, mid:valuation?.perShare.mid??null, assumptions:analysis.valuation?.assumptions??[], cap:company.marketCapUsd, shares:capShares[analysis.id]??analysis.valuation?.shares, usdRate:usdRate(company.currency),corroborated:analysis.valuation?.shareSources===2});
    const contradiction=dataQualityFlags.length?(issuerContradictions[analysis.id]??[]):[];
    if(contradiction.length)dataQualityFlags.push(...contradiction.map(o=>`Issuer filing contradicts valuation shares by more than 2%: ${o.url} (${o.date}: ${o.shares})`));
    const retained=!!(previousDossiers[analysis.id]?.valuation&&analysis.valuation&&dataQualityFlags.length&&!contradiction.length);
    if(retained){
      // A split after the annual report moves every earlier share count to the new basis.
      const prior=previousDossiers[analysis.id].valuation!,split=analysis.valuation!.splitAfterReport;
      const retainedShares=split&&!prior.splitAfterReport?prior.shares*split:prior.shares;
      analysis={...analysis,valuation:{...withShareDenominator(analysis.valuation!,retainedShares),publishedShareReview:true,shareReviewReasons:dataQualityFlags,
        assumptions:[...analysis.valuation!.assumptions,'Previously published share basis retained; independent share observations differ and await reconciliation.']}};
      valuation=tradingValuation(analysis,usdRate);
      dataQualityFlags=[];
    }
    const returnInputs = buyReturnInputs(analysis.valuation, company.currency);
    let price = publishedBuyPrice({ id: analysis.id, businessChanged: analysis.thesis?.changed, st: analysis.status === 'scored' ? 's' : 'i', t, pr, shareSources:analysis.valuation?.shareSources, publishedShareReview:analysis.valuation?.publishedShareReview,
      v: valuation ? [valuation.perShare.low, valuation.perShare.mid, valuation.perShare.high] : null, dataQualityFlags }, prices[analysis.id]);
    const prior=previousDossiers[analysis.id];
    const priceTestFreeze=price.result==='unclear'&&!reviewedInputError(analysis.id)&&prior?.tests.price&&['pass','fail'].includes(prior.tests.price.result)
      ? prior.priceTestFreeze??{asOf:prior.asOf,test:prior.tests.price} : undefined;
    if(priceTestFreeze)price={...price,...publishedBuyPrice({st:analysis.status==='scored'?'s':'i',t,pr,v:null,priceTestFreeze,businessChanged:analysis.thesis?.changed},prices[analysis.id]),dataQualityFlags:price.dataQualityFlags};
    // Funnel order: moat, economics, management, accounting, profit record, price.
    const gated = outcomes.slice(1);
    const passes = [...gated.map(test => analysis.status === "scored" && test.result === "pass"), pr === "P", price.b];
    // Price above central value is a failed funnel gate. Missing data is not a failure.
    const failures = [...gated.map(test => test.result === "fail"), pr === "F", analysis.thesis?.changed === true || price.result === "fail" || price.mos !== null && price.result !== "pass"];
    const countryFunnel = funnel.byCountry[company.country] ??= emptyFunnel();
    for (const population of [funnel, countryFunnel, ...(w ? [westernFunnel, westernFunnel.byCountry[company.country] ??= emptyFunnel()] : [])]) {
      population.analysed++;
      if (population.asOf === null || analysis.asOf > population.asOf) population.asOf = analysis.asOf;
      let cumulative = true;
      population.gates.forEach((gate, i) => {
        if (cumulative) {
          if (passes[i]) { gate.passing++; gate.pass!++; }
          else if (failures[i]) gate.fail!++;
          else if (gated[i]?.pending && gated[i]?.result === 'unclear') gate.checking!++;
          else gate.unclear!++;
        }
        cumulative = cumulative && passes[i];
        if (analysis.status === 'scored' && failures[i] && passes.slice(0, 5).every((pass, j) => j === i || pass)) gate.failsOnlyThis++;
      });
    }
    const dossier: Dossier = {
      ...analysis, valuation: navBuyCopy(analysis.valuation), priceTestFreeze, methodVersion: METHOD_VERSION, w, b: price.b, dataQualityFlags: price.dataQualityFlags, requiredMos, holders,
      ...(priceHistories[analysis.id] ? { priceHistory: priceHistories[analysis.id] } : {}),
      series: Object.assign({}, ...outcomes.map((test) => test.series), analysis.series),
      tests: { ...analysis.tests, price: priceTestFreeze?.test ?? { key: "price", result: price.result, numeric: price.result, reasons: price.mos === null ? ["Valuation or price unavailable in trading currency"] : [], metrics: { mos: price.mos }, series: {}, jev: [] } },
    };
    const shard = shardOf(analysis.id);
    const visible=publicAnalysis(dossier);visible.ownerMemo=memoAtPrice(visible,prices[analysis.id]);
    visible.priceStory=composePriceStory(visible,prices[analysis.id]??null,analysis.priceStory?.selected??null,analysis.priceStory?.events??[],analysis.priceStory?.asOf??new Date().toISOString());
    visible.priceStory=retainStoryTimestamp(visible.priceStory,previousDossiers[analysis.id]?.priceStory);
    (shards[shard] ??= {})[analysis.id] = visible;
    if (price.dataQualityFlags.length) unresolved.push({id:analysis.id,qualityPass:qualityPass({t,pr}),reasons:price.dataQualityFlags});
    const roic = (analysis.tests.moat.series.totalRoic ?? []).slice(-T.history.years)
      .map(([, value]) => value === null || !Number.isFinite(value) ? null : Number(value.toPrecision(3)));
    const returns=dossierReturn(analysis);
    const row: IndexRow = {
      methodVersion: METHOD_VERSION, priceTestFreeze,
      w, exchange: company.exchange, publishedShareReview:analysis.valuation?.publishedShareReview, shareSources: analysis.valuation?.shareSources, buyReturnInputs: price.dataQualityFlags.length ? null : returnInputs,
      historyYears: analysis.historyCoverage?.years ?? analysis.tests.understandable.metrics.historyYears ?? undefined,
      b: price.b, businessChanged: analysis.thesis?.changed || undefined,
      thesisReason: analysis.thesis?.changed ? analysis.thesis.reason : undefined,
      returnInfo:{...returns,sort:Number.isFinite(returns.sort)?returns.sort:returns.sort>0?Number.MAX_VALUE:-Number.MAX_VALUE},
      fy: Math.max(0,...Object.values(analysis.tests).flatMap(t=>Object.values(t.series).flat().map(p=>p[0]))) || undefined,
      m: requiredMos, r: [...Array<number | null>(T.history.years - roic.length).fill(null), ...roic],
      id: analysis.id, n: company.nameEn ?? company.name, lg: company.logo ?? null, c: company.country, s: company.sector, k: company.kind,
      mc: company.marketCapUsd, v: valuation && !price.dataQualityFlags.length ? [valuation.perShare.low, valuation.perShare.mid, valuation.perShare.high] : null,
      cur: company.currency, t, pr,
      g: [...g].sort(), h: holders.length, st: analysis.status === "scored" ? "s" : "i",
    };
    rows.push(row);
    (countries[company.country] ??= []).push(row);
  }
  const published = new Set(Object.values(shards).flatMap(shard=>Object.keys(shard)));
  const aliases:Record<string,string>={};
  const ambiguous=new Set<string>();
  for(const {id,company} of sorted)if(published.has(id))for(const listing of [...company.listings,...(indiaDepositarySymbols[id]?[`${indiaDepositarySymbols[id]}.NSE`]:[])]){
    const alias=listing.toUpperCase();
    if(published.has(alias)||ambiguous.has(alias))continue;
    if(aliases[alias]&&aliases[alias]!==id){delete aliases[alias];ambiguous.add(alias);}
    else aliases[alias]=id;
  }
  files['aliases.json']=aliases;
  for (const [country, countryRows] of Object.entries(countries)) {
    files[`index/${country}.json`] = countryRows;
    files[`prices/${country}.json`] = Object.fromEntries(countryRows.filter((row) => prices[row.id]).map((row) => [row.id, prices[row.id]]));
  }
  for (const [shard, dossiers] of Object.entries(shards)) files[`dossiers/${shard}.json`] = dossiers;
  files["index/default.json"] = rows.filter((row) => row.st === "s" && (qualityPass(row) || /^P*FP*$/.test(gateCode(row)) || /^[PCU]+$/.test(gateCode(row))));
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
    methodVersion: METHOD_VERSION,
    asOf: analyses.map((analysis) => analysis.asOf).sort().at(-1) ?? null,
    funnel,
    story: storyFromFunnel(funnel),
    western: { story: storyFromFunnel(westernFunnel), funnel: westernFunnel },
    counts: { universe, analysed: rows.length, scored: rows.filter((row) => row.st === "s").length, insufficient: rows.filter((row) => row.st === "i").length },
    versions: common ? { ...common.versions, other: analyses.length - common.count } : null, tags,
  };
  assertIndexConsistency({ meta: files["meta.json"] as import("./types").StoreMeta, rows: files["index/default.json"] as IndexRow[] });
  return { files, unresolved };
}
