import { buyReturnInputs } from "./owner-return";
import { T } from './config';
import { checkIntegrity } from './integrity';
import { runNumericTests } from './tests';
import { valueCompany } from './valuation';
import { earningsVolatility } from './history';
import { publishedBuyPrice } from './buy-price';
import { valuationFlags } from './data-quality';
import { QUALITY_TESTS, type Company, type Fundamentals, type PriceHistory, type SnapshotRow, type HistorySummary } from './types';

export const HISTORY_CAVEATS = [
  'numbers-only checklist (no report reading)',
  'buy requires both the margin of safety and expected return at least the required return',
  'restated financials',
  'survivorship: delisted companies missing',
  'price returns without dividends',
];
export const HISTORY_ASSUMPTIONS = [
  'Code-only numeric quality tests and valuation; Jev-based readings are not part of history.',
  'Each fiscal snapshot uses only annual fiscal years up to that year; no current TTM or current share-count override.',
  'Uses current restated fundamentals and current issuer classification, bond yields and FX, not a point-in-time backtest.',
  'Price is the cached close for the annual filing month, or fiscal end plus three months when the filing date is unknown. Missing months are not interpolated.',
  'Returns are cumulative price changes to the latest real quote, not annualized and excluding dividends. Cached close series may have differing split adjustments.',
  'Hit rates are the share of finite cohort returns strictly above the unrounded median return of all analysed companies for that fiscal year; ties are not hits. Empty return cohorts have null statistics.',
  'The population is the surviving current universe; missing and delisted companies are not reconstructed. Cohort medians, means and hit rates exclude missing or nonfinite returns; returnCount fields give their denominators.',
];
const validDate = (date: string | undefined): date is string => !!date && /^\d{4}-\d{2}-\d{2}$/.test(date)
  && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date;
export function filingMonth(end: string, filed?: string): string {
  if (validDate(filed) && filed >= end) return filed.slice(0,7);
  // Construct the first of the target month, avoiding Jan 31 -> May overflow.
  return new Date(Date.UTC(Number(end.slice(0,4)), Number(end.slice(5,7)) - 1 + 3, 1)).toISOString().slice(0,7);
}
const positive = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;
const compact = (n: number | null) => n === null || !Number.isFinite(n) ? null : Number(n.toFixed(4));

export function snapshotForYear({ company, fundamentals, fy, prices, latestPrice, filedByPeriod = {}, bondYield, fxRate, asOf }: {
  company: Company; fundamentals: Fundamentals; fy: number; prices: PriceHistory;
  latestPrice: [number, string] | null; filedByPeriod?: Record<string,string>;
  bondYield: number | null; fxRate: number | null; asOf: string;
}): SnapshotRow | null {
  const target = fundamentals.years.find(y => y.fy === fy);
  if (!target || target.end > asOf || !validDate(target.end)) return null;
  const filed = filedByPeriod[target.end];
  if (validDate(filed) && filed >= target.end && filed > asOf) return null;
  const month = filingMonth(target.end, filed);
  if (month > asOf.slice(0,7)) return null;
  if (new Set(fundamentals.years.filter(y=>y.fy<=fy).map(y=>y.fy)).size < 10) return null;
  const pastPrices = prices.filter(([m,p]) => m <= month && positive(p));
  const monthly = new Map(pastPrices);
  // A current incomplete month is not a month-end observation yet.
  const price = month < asOf.slice(0,7) ? monthly.get(month) ?? null : null;
  if (!positive(price)) return null;
  const prefix: Fundamentals = { id: fundamentals.id, currency: target.currency ?? fundamentals.currency,
    years: fundamentals.years.filter(y => y.fy <= fy).map(y => ({ ...y })),
    splits: fundamentals.splits?.filter(s => s.date <= target.end), integrity: {ok:true,reasons:[]}, fetchedAt: fundamentals.fetchedAt };
  prefix.integrity = checkIntegrity(prefix, { source: company.source, priceHistory: pastPrices });
  // Rebuild caps from the prefix's own share counts, never retain current/seed caps.
  prefix.years = prefix.years.map(y => ({ ...y, marketCap: positive(fxRate) && positive(y.dilutedShares) && positive(monthly.get(y.end.slice(0,7)))
    ? monthly.get(y.end.slice(0,7))! * y.dilutedShares / fxRate : null }));
  const numeric = runNumericTests({ years: prefix.years, kind: company.kind, priceHistoryPending: false });
  const t5 = prefix.integrity.ok ? QUALITY_TESTS.map(key => numeric[key as keyof typeof numeric].numeric[0].toUpperCase()).join('') : 'UUUUU';
  const volatility = earningsVolatility({ opMarginCv: numeric.understandable.metrics.opMarginCv });
  const valuation = prefix.integrity.ok && bondYield !== null && Number.isFinite(bondYield) && positive(fxRate)
    ? valueCompany({ years: prefix.years, kind:company.kind, currency:prefix.currency, bondYield,
      cyclical:numeric.understandable.metrics.opMarginCv !== null && volatility === 'volatile', priceHistory:pastPrices }).valuation : null;
  const v: [number,number,number] | null = valuation ? [valuation.perShare.low*fxRate!, valuation.perShare.mid*fxRate!, valuation.perShare.high*fxRate!] : null;
  const flags = valuationFlags({ price, mid:v?.[1]??null, assumptions:valuation?.assumptions??[] });
  if (valuation && fxRate) valuation.perShareTrading = {currency:company.currency,fxRate,low:v![0],mid:v![1],high:v![2]};
  const buy = publishedBuyPrice({buyReturnInputs:buyReturnInputs(valuation,company.currency),st:prefix.integrity.ok?'s':'i', t:t5, v, m:T.price.requiredMos[volatility], dataQualityFlags:flags}, positive(price) ? [price,`${month}-01`] : undefined);
  const pm = positive(price) && v && positive(v[1]) ? compact(price/v[1]) : null;
  const r = positive(price) && latestPrice && positive(latestPrice[0]) && latestPrice[1].slice(0,7) >= month && latestPrice[1] <= asOf
    ? compact(latestPrice[0]/price-1) : null;
  return [company.id,t5,pm,buy.b,r];
}

export function summarizeSnapshots(rows: SnapshotRow[]): HistorySummary {
  const quality = rows.filter(r => r[1] === 'PPPPP'), buy = rows.filter(r => r[3]);
  const returns = (items: SnapshotRow[]) => items.map(r => r[4])
    .filter((r): r is number => r !== null && Number.isFinite(r)).sort((a,b) => a-b);
  const median = (values: number[]): number | null => {
    if (!values.length) return null;
    const middle = Math.floor(values.length/2);
    return values.length % 2 ? values[middle] : (values[middle-1]+values[middle])/2;
  };
  const allReturns = returns(rows), qualityReturns = returns(quality), buyReturns = returns(buy);
  const benchmark = median(allReturns);
  const hitRate = (values: number[]) => values.length && benchmark !== null
    ? compact(values.filter(value => value > benchmark).length/values.length) : null;
  const average = (values: number[]) => values.length ? compact(values.reduce((a,b)=>a+b,0)/values.length) : null;
  return { analysed:rows.length, qualityPasses:quality.length, atBuy:buy.length,
    returnCountAtBuy:buyReturns.length, returnCountQuality:qualityReturns.length, returnCountAll:allReturns.length,
    medianReturnAtBuy:compact(median(buyReturns)), medianReturnQuality:compact(median(qualityReturns)), medianReturnAll:compact(benchmark),
    hitRateAtBuy:hitRate(buyReturns), hitRateQuality:hitRate(qualityReturns), hitRateAll:hitRate(allReturns),
    avgReturnAtBuy:average(buyReturns), avgReturnQuality:average(qualityReturns), avgReturnAll:average(allReturns) };
}
