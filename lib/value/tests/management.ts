import { T } from "../config";
import { cagr, last, mean, outcome, present, ratio, retainedTest, roic, slope, sum, withZeroDefaults } from "../metrics";
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
  const buybacks = present(ys.map(y => y.buybacks));
  const spending = buybacks.length < 5 ? null : sum(buybacks);
  const paired = ys.flatMap(y => {
    const earningsYield = ratio(y.netIncome, y.marketCap);
    return y.buybacks === null || earningsYield === null ? [] : [{ amount: y.buybacks, earningsYield }];
  });
  const meanSpend = mean(paired.map(p => p.amount)), meanYield = mean(paired.map(p => p.earningsYield));
  const discipline = paired.length < 5 ? null : spending === 0 ? 0
    : mean(paired.map(p => (p.amount - meanSpend!) * (p.earningsYield - meanYield!)));
  const debtFlags = history.slice(1).map((y, i) => {
    const prev = history[i];
    if (y.buybacks === 0) return false;
    if (y.buybacks === null || y.totalDebt === null || prev.totalDebt === null || y.ocf === null || y.dividendsPaid === null) return null;
    return y.buybacks > 0 && y.totalDebt > prev.totalDebt && y.buybacks + y.dividendsPaid > y.ocf;
  });
  const debtFunded = debtFlags.includes(true) ? true : debtFlags.filter(x => x !== null).length < 5 ? null : false;
  const acquisitions = present(ys.map(y => y.acquisitions));
  const acquisitionSpend = acquisitions.length < 5 ? null : sum(acquisitions);
  const roicSeries: Series = ys.map(y => [y.fy, roic(y)]);
  const trend = slope(roicSeries);
  return outcome({ key: "management", metrics: { marketCapGain: retained.gain, retainedEarnings: retained.retained, shareCagr, shareCagr5,
    buybackYieldCovariance: discipline, debtFundedBuybacks: debtFunded === null ? null : Number(debtFunded), acquisitionSpend, roicTrend: trend },
    series: { shares: ys.map(y => [y.fy, y.dilutedShares]), buybacks: ys.map(y => [y.fy, y.buybacks]), acquisitions: ys.map(y => [y.fy, y.acquisitions]), roic: roicSeries,
      marketCap: history.map(y => [y.fy, y.marketCap]), retainedEarnings: ys.map(y => [y.fy, y.netIncome === null || y.dividendsPaid === null ? null : y.netIncome - y.dividendsPaid]) },
    reasons: debtFunded ? ["potential debt-funded buybacks (informational)"] : [],
    checks: [
      { pass: retained.gain === null || retained.retained === null ? null : retained.gain >= retained.retained, data: "the $1 retained earnings test", reason: "market cap gain below cumulative retained earnings" },
      { pass: dilutionPass, data: "diluted share growth over five and ten years", reason: "five-year and ten-year diluted share growth both above threshold" },
      { pass: discipline === null ? null : discipline >= 0, data: "buyback timing", reason: "buybacks concentrated at lower earnings yields" },
      { pass: acquisitionSpend === null ? null : acquisitionSpend === 0 ? true : trend === null ? null : trend >= 0, data: `${ys.some(y => y.acquisitionsProxy) ? "acquired goodwill and intangibles (proxy)" : "acquisition spending"} and ROIC stability`, reason: `${ys.some(y => y.acquisitionsProxy) ? "acquired goodwill and intangibles (proxy)" : "acquisition spending"} alongside declining ROIC` },
    ],
  });
}
