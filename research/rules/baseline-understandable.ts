import { T } from "../../lib/value/config";
import { last, mean, opMargin, outcome, present, withZeroDefaults } from "../../lib/value/metrics";
import type { NumericInput } from "../../lib/value/types";

export function run({ years }: NumericInput) {
  years = withZeroDefaults(years).map(y=>({...y,operatingIncome:y.marginOperatingIncomeJudgement??y.operatingIncome}));
  const history = last(years, T.understandable.years + 1), ys = last(history, T.understandable.years);
  const revenueChanges = history.slice(1).map((y, i) => y.revenue === null || history[i].revenue === null || y.fy !== history[i].fy + 1 ? null : y.revenue - history[i].revenue!);
  const margins = present(ys.map(opMargin)), average = mean(margins);
  const cv = margins.length < 5 || average === null || average === 0 ? null : Math.sqrt(mean(margins.map(x => (x - average) ** 2))!) / Math.abs(average);
  const declines = present(revenueChanges).length < 5 ? null : present(revenueChanges).filter(x => x < 0).length;
  const incomes = present(ys.map(y => y.netIncome));
  const losses = incomes.length < 5 ? null : incomes.filter(x => x < 0).length;
  // Fit chronological annual observations; never compress missing years into a trend.
  const fit = (values: number[]) => {
    const center = (values.length - 1) / 2, level = mean(values)!;
    const xx = values.reduce((sum, _, i) => sum + (i - center) ** 2, 0);
    const slope = xx ? values.reduce((sum, x, i) => sum + (i - center) * (x - level), 0) / xx : 0;
    const variance = mean(values.map(x => (x - level) ** 2))!;
    const residual = mean(values.map((x, i) => (x - level - slope * (i - center)) ** 2))!;
    return { slope, r2: variance > 0 ? Math.max(0, 1 - residual / variance) : 0,
      residualCv: level > 0 ? Math.sqrt(residual) / level : Infinity };
  };
  const complete = ys.length >= T.minYears && margins.length === ys.length
    && incomes.length === ys.length && incomes.every(x => x >= 0)
    && margins.every(x => x > 0)
    && ys.every((y, i) => i === 0 || y.fy === ys[i - 1].fy + 1);
  const trend = complete ? fit(margins) : null;
  const monotone = complete && margins.every((x, i) => i === 0 || x >= margins[i - 1])
    && margins[margins.length - 1] > margins[0];
  const half = Math.floor(margins.length / 2);
  const trendConsistent = complete && trend!.slope > 0 && trend!.r2 >= T.understandable.minImprovementR2
    && trend!.residualCv <= T.understandable.maxOpMarginCv
    && fit(margins.slice(0, half)).slope > 0 && fit(margins.slice(half)).slope > 0
    && margins[margins.length - 1] >= margins[margins.length - 2];
  const improving = monotone || trendConsistent;
  const exception = cv !== null && cv > T.understandable.maxOpMarginCv && improving;
  return outcome({ key: "understandable", metrics: { historyYears: ys.length, revenueDeclines: declines, lossYears: losses, opMarginCv: cv, ...(exception ? { opMarginImproving: 1, opMarginTrendR2: trend!.r2, opMarginResidualCv: trend!.residualCv } : {}) },
    series: { revenue: ys.map(y => [y.fy, y.revenue]), operatingMargin: ys.map(y => [y.fy, opMargin(y)]), netIncome: ys.map(y => [y.fy, y.netIncome]) },
    reasons: [...(exception ? [monotone ? "Positive, nondecreasing operating margins with no net loss years; sustained improvement passes the margin-variation check" : "Positive operating margins follow a sustained upward trend (at least 90% explained, low residual variation), with no net losses or latest decline; improvement passes the margin-variation check"] : []), ...(declines === null ? [] : [`${declines} revenue decline${declines === 1 ? '' : 's'} in the last ${T.understandable.years} years${declines <= T.understandable.maxRevenueDeclines ? " (informational)" : ""}`])],
    checks: [
      { pass: ys.length >= T.minYears, data: "history length", reason: `only ${ys.length} years of history` },
      { pass: declines === null ? null : declines <= T.understandable.maxRevenueDeclines, data: "revenue declines", reason: `more than ${T.understandable.maxRevenueDeclines} revenue declines in ten years` },
      { core: true, pass: losses === null ? null : losses <= T.understandable.maxLossYears, data: "net loss years", reason: `more than ${T.understandable.maxLossYears} net loss years` },
      { core: true, pass: margins.length < 5 || average === null ? null : average >= 0, data: "average operating margin", reason: "negative average operating margin" },
      { core: average !== null && average > 0, pass: cv === null ? null : cv <= T.understandable.maxOpMarginCv || improving, data: "operating margin variation", reason: `operating margin variation exceeds ${T.understandable.maxOpMarginCv}` },
    ],
  });
}
