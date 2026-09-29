import { T } from "../config";
import { cagr, last, mean, median, outcome, present, ratio, retainedTest, roic, spearman, sum, withZeroDefaults } from "../metrics";
import type { NumericInput, Series } from "../types";

export function run({ years }: NumericInput) {
  years = withZeroDefaults(years);
  const history = last(years, 11), ys = last(history, 10), first = history[0], end = history.at(-1);
  const retained = retainedTest(years);
  const shareCagr = history.length !== 11 || !first || !end || end.fy - first.fy !== 10 || present(history.map(y => y.dilutedShares)).length < 5 ? null
    : cagr({ first: first.dilutedShares, last: end.dilutedShares, years: 10 });
  const fiveStart = end ? history.find(y => y.fy === end.fy - 5) : undefined;
  const shareCagr5 = !fiveStart || !end ? null
    : cagr({ first: fiveStart.dilutedShares, last: end.dilutedShares, years: 5 });
  const dilutionPass = [shareCagr, shareCagr5].some(value => value !== null && value <= T.management.maxShareCagr + Number.EPSILON)
    ? true : shareCagr === null || shareCagr5 === null ? null : false;
  const paired = ys.flatMap(y => {
    const earningsYield = ratio(y.netIncome, y.marketCap);
    const buybackYield = ratio(y.buybacks, y.marketCap);
    return buybackYield === null || buybackYield <= 0 || earningsYield === null ? [] : [{ buybackYield, earningsYield }];
  });
  const averageBuybackYield = mean(paired.map(p => p.buybackYield));
  const discipline = spearman(paired.map(p => [p.buybackYield, p.earningsYield]));
  const priceBlind = paired.length >= T.management.buybackMinYears && discipline !== null
    && discipline < T.management.buybackFailRho && averageBuybackYield! > T.management.buybackMinYield;
  const timingAvailable = paired.length > 0 || ys.some(y => y.buybacks === 0 && ratio(y.netIncome, y.marketCap) !== null);
  const debtFlags = history.slice(1).map((y, i) => {
    const prev = history[i];
    if (y.buybacks === 0) return false;
    if (y.buybacks === null || y.totalDebt === null || prev.totalDebt === null || y.ocf === null || y.dividendsPaid === null) return null;
    return y.buybacks > 0 && y.totalDebt > prev.totalDebt && y.buybacks + y.dividendsPaid > y.ocf;
  });
  const debtFunded = debtFlags.includes(true) ? true : debtFlags.filter(x => x !== null).length < 5 ? null : false;
  const acquisitions = present(ys.map(y => y.acquisitions));
  const acquisitionSpend = acquisitions.length !== T.management.acquisitionYears ? null : sum(acquisitions);
  const income = present(ys.map(y => y.netIncome));
  const cumulativeNetIncome = income.length !== T.management.acquisitionYears ? null : sum(income);
  const roicSeries: Series = ys.map(y => [y.fy, roic(y)]);
  const endpointMedian = (points: Series) => points.length !== T.management.roicEndpointYears || points.some(([, value]) => value === null)
    ? null : median(points.map(([, value]) => value!));
  const roicFirst3Median = endpointMedian(roicSeries.slice(0, T.management.roicEndpointYears));
  const roicLast3Median = endpointMedian(roicSeries.slice(-T.management.roicEndpointYears));
  const acquisitionPass = acquisitionSpend === null || cumulativeNetIncome === null ? null
    : acquisitionSpend <= T.management.acquisitionToNetIncome * cumulativeNetIncome ? true
    : roicFirst3Median === null || roicLast3Median === null ? null
    : !(roicLast3Median < T.moat.roicMedian && roicLast3Median < T.management.roicRetention * roicFirst3Median);
  const acquisitionLabel = ys.some(y => y.acquisitionsProxy) ? "acquired goodwill and intangibles (proxy)" : "acquisition spending";
  const displayReturn = (value: number | null) => value === null ? "unavailable" : value === Infinity ? "unlimited" : `${(value * 100).toFixed(1)}%`;
  return outcome({ key: "management", metrics: { marketCapGain: retained.gain, retainedEarnings: retained.retained, shareCagr, shareCagr5,
    retainedStartFy: retained.startFy, retainedEndFy: retained.endFy,
    buybackYieldSpearman: discipline, averageBuybackYield, buybackYears: paired.length,
    debtFundedBuybacks: debtFunded === null ? null : Number(debtFunded), acquisitionSpend, cumulativeNetIncome, roicFirst3Median, roicLast3Median },
    series: { shares: ys.map(y => [y.fy, y.dilutedShares]), buybacks: ys.map(y => [y.fy, y.buybacks]), acquisitions: ys.map(y => [y.fy, y.acquisitions]), roic: roicSeries,
      marketCap: history.map(y => [y.fy, y.marketCap]), retainedEarnings: ys.map(y => [y.fy, y.netIncome === null || y.dividendsPaid === null ? null : y.netIncome - y.dividendsPaid]) },
    reasons: [
      ...(retained.startFy !== null && retained.endFy !== null ? [`$1 retained earnings test: ${retained.startFy} to ${retained.endFy} (${retained.endFy - retained.startFy} years)`] : []),
      ...(debtFunded ? ["potential debt-funded buybacks (informational)"] : []),
      ...(timingAvailable && !priceBlind ? [discipline !== null && discipline > 0
        ? "buybacks leaned toward cheaper years (informational)" : "buybacks unrelated to price (informational)"] : []),
      `ROIC first 3 years vs last 3 years: ${displayReturn(roicFirst3Median)} vs ${displayReturn(roicLast3Median)}`,
    ],
    checks: [
      { pass: retained.gain === null || retained.retained === null ? null : retained.gain >= retained.retained, data: "the $1 retained earnings test", reason: "market cap gain below cumulative retained earnings" },
      { pass: dilutionPass, data: "diluted share growth over five and ten years", reason: "five-year and ten-year diluted share growth both above threshold" },
      { pass: timingAvailable ? !priceBlind : null, data: "buyback timing", reason: "material buybacks concentrated at lower earnings yields (Spearman rho below threshold)" },
      { pass: acquisitionPass, data: `${acquisitionLabel} and ROIC stability`, reason: `${acquisitionLabel} exceeds half of ten-year net income with low and deteriorating ROIC` },
    ],
  });
}
