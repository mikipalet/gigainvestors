import { isDecided, shortHistory, missingInvestmentNav } from './publication-eligibility';
import { withAnalysisHistory } from './test-history';
import { publicAnalysis } from './public-analysis';
import { buyReturnInputs } from "./owner-return";
import { bestWesternListing } from "./western";
import { storyFromFunnel } from "./story";
import { valuationFlags } from "./data-quality";
import { assertIndexConsistency } from "./consistency";
import { dossierReturn } from "./presentation";
import { sameCurrency } from "./currency";
import { createUsdRate } from "./fx";
import { T } from "./config";
import { QUESTIONS } from "./jev/questions";
import { publishedBuyPrice } from "./buy-price";
import { shardOf } from "./shard";
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

function emptyFunnel(): FunnelCounts {
  return {
    asOf: null, analysed: 0,
    gates: ([
      { key: "understandable", label: "Understandable" },
      { key: "moat", label: "Moat" },
      { key: "economics", label: "Economics" },
      { key: "management", label: "Management" },
      { key: "accounting", label: "Accounting" },
      { key: "price", label: "Required margin of safety" },
    ] satisfies Array<Pick<FunnelCounts["gates"][number], "key" | "label">>).map(gate => ({ ...gate, passing: 0, pass: 0, fail: 0, checking: 0, unclear: 0, failsOnlyThis: 0 })),
  };
}

export function buildOutput({ analyses, holdersByTicker, investorNames, fx, prices = {}, priceHistories = {}, universe = analyses.length }: {
  analyses: Analysis[];
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
  const sorted = analyses.map(withAnalysisHistory).sort((a, b) => (b.company.marketCapUsd ?? -Infinity) - (a.company.marketCapUsd ?? -Infinity) || a.id.localeCompare(b.id));
  const rows: IndexRow[] = [];
  const westernFunnel: PublishedFunnel = { ...emptyFunnel(), byCountry: {} };
  const funnel: PublishedFunnel = { ...emptyFunnel(), byCountry: {} };
  for (const analysis of sorted) {
    if (!isDecided(analysis)) {
      if (shortHistory(analysis) && !missingInvestmentNav(analysis)) {
        const dossier: Dossier={...analysis,w:null,b:false,holders:[],series:analysis.series??{}};
        (shards[shardOf(analysis.id)]??={})[analysis.id]=publicAnalysis(dossier);
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
    const valuation = tradingValuation(analysis, usdRate);
    const requiredMos = analysis.requiredMos ?? T.price.requiredMos.stable;
    const t = analysis.status !== "scored" ? "UUUUU" : outcomes.map(test => test.result === "unclear" && test.pending ? "C" : test.result[0].toUpperCase()).join("");
    const dataQualityFlags = valuationFlags({price:prices[analysis.id]?.[0]??null, mid:valuation?.perShare.mid??null, assumptions:analysis.valuation?.assumptions??[], cap:company.marketCapUsd, shares:analysis.valuation?.shares, usdRate:usdRate(company.currency),corroborated:analysis.valuation?.shareSources===2});
    const returnInputs = buyReturnInputs(analysis.valuation, company.currency);
    const price = publishedBuyPrice({ businessChanged: analysis.thesis?.changed, st: analysis.status === 'scored' ? 's' : 'i', t, m: requiredMos, buyReturnInputs: returnInputs, shareSources:analysis.valuation?.shareSources,
      v: valuation ? [valuation.perShare.low, valuation.perShare.mid, valuation.perShare.high] : null, dataQualityFlags }, prices[analysis.id]);
    const passes = [...outcomes.map(test => analysis.status === "scored" && test.result === "pass"), price.b];
    // Price below its required MOS is a failed funnel gate even when priceTest
    // calls a positive but inadequate discount "unclear". Missing data is not a failure.
    const failures = [...outcomes.map(test => test.result === "fail"), analysis.thesis?.changed === true || price.result === "fail" || price.mos !== null && price.result !== "pass"];
    const countryFunnel = funnel.byCountry[company.country] ??= emptyFunnel();
    for (const population of [funnel, countryFunnel, ...(w ? [westernFunnel, westernFunnel.byCountry[company.country] ??= emptyFunnel()] : [])]) {
      population.analysed++;
      if (population.asOf === null || analysis.asOf > population.asOf) population.asOf = analysis.asOf;
      let cumulative = true;
      population.gates.forEach((gate, i) => {
        if (cumulative) {
          if (passes[i]) { gate.passing++; gate.pass!++; }
          else if (failures[i]) gate.fail!++;
          else if (outcomes[i]?.pending && outcomes[i]?.result === 'unclear') gate.checking!++;
          else gate.unclear!++;
        }
        cumulative = cumulative && passes[i];
        if (analysis.status === 'scored' && failures[i] && passes.slice(0, 5).every((pass, j) => j === i || pass)) gate.failsOnlyThis++;
      });
    }
    const dossier: Dossier = {
      ...analysis, w, b: price.b, dataQualityFlags: price.dataQualityFlags, requiredMos, holders,
      ...(priceHistories[analysis.id] ? { priceHistory: priceHistories[analysis.id] } : {}),
      series: Object.assign({}, ...outcomes.map((test) => test.series), analysis.series),
      tests: { ...analysis.tests, price: { key: "price", result: price.result, numeric: price.result, reasons: price.mos === null ? ["Valuation or price unavailable in trading currency"] : [], metrics: { mos: price.mos }, series: {}, jev: [] } },
    };
    const shard = shardOf(analysis.id);
    (shards[shard] ??= {})[analysis.id] = publicAnalysis(dossier);
    if (price.dataQualityFlags.length) unresolved.push({id:analysis.id,qualityPass:t==='PPPPP',reasons:price.dataQualityFlags});
    const roic = (analysis.tests.moat.series.totalRoic ?? []).slice(-T.history.years)
      .map(([, value]) => value === null || !Number.isFinite(value) ? null : Number(value.toPrecision(3)));
    const returns=dossierReturn(analysis);
    const row: IndexRow = {
      w, exchange: company.exchange, shareSources: analysis.valuation?.shareSources, buyReturnInputs: price.dataQualityFlags.length ? null : returnInputs,
      historyYears: analysis.historyCoverage?.years ?? analysis.tests.understandable.metrics.historyYears ?? undefined,
      b: price.b, businessChanged: analysis.thesis?.changed || undefined,
      returnInfo:{...returns,sort:Number.isFinite(returns.sort)?returns.sort:returns.sort>0?Number.MAX_VALUE:-Number.MAX_VALUE},
      fy: Math.max(0,...Object.values(analysis.tests).flatMap(t=>Object.values(t.series).flat().map(p=>p[0]))) || undefined,
      m: requiredMos, r: [...Array<number | null>(T.history.years - roic.length).fill(null), ...roic],
      id: analysis.id, n: company.nameEn ?? company.name, lg: company.logo ?? null, c: company.country, s: company.sector, k: company.kind,
      mc: company.marketCapUsd, v: valuation && !price.dataQualityFlags.length ? [valuation.perShare.low, valuation.perShare.mid, valuation.perShare.high] : null,
      cur: company.currency, t,
      g: [...g].sort(), h: holders.length, st: analysis.status === "scored" ? "s" : "i",
    };
    rows.push(row);
    (countries[company.country] ??= []).push(row);
  }
  const published = new Set(Object.values(shards).flatMap(shard=>Object.keys(shard)));
  const aliases:Record<string,string>={};
  const ambiguous=new Set<string>();
  for(const {id,company} of sorted)if(published.has(id))for(const listing of company.listings){
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
  files["index/default.json"] = rows.filter((row) => row.st === "s" && (row.t === "PPPPP" || /^P*FP*$/.test(row.t) || /^[PCU]+$/.test(row.t)));
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
    funnel,
    story: storyFromFunnel(funnel),
    western: { story: storyFromFunnel(westernFunnel), funnel: westernFunnel },
    counts: { universe, analysed: rows.length, scored: rows.filter((row) => row.st === "s").length, insufficient: rows.filter((row) => row.st === "i").length },
    versions: common ? { ...common.versions, other: analyses.length - common.count } : null, tags,
  };
  assertIndexConsistency({ meta: files["meta.json"] as import("./types").StoreMeta, rows: files["index/default.json"] as IndexRow[] });
  return { files, unresolved };
}
