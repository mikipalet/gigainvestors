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
  // The exception proves direction from the complete window; missing years cannot
  // be compressed into an apparently smooth trend. Keep raw CV for price rules.
  const improving = ys.length >= T.minYears && margins.length === ys.length
    && incomes.length === ys.length && incomes.every(x => x >= 0)
    && margins.every((x, i) => x > 0 && (i === 0 || x >= margins[i - 1]))
    && ys.every((y, i) => i === 0 || y.fy === ys[i - 1].fy + 1)
    && margins[margins.length - 1] > margins[0];
  const exception = cv !== null && cv > T.understandable.maxOpMarginCv && improving;
  return outcome({ key: "understandable", metrics: { historyYears: ys.length, revenueDeclines: declines, lossYears: losses, opMarginCv: cv, ...(exception ? { opMarginImproving: 1 } : {}) },
    series: { revenue: ys.map(y => [y.fy, y.revenue]), operatingMargin: ys.map(y => [y.fy, opMargin(y)]), netIncome: ys.map(y => [y.fy, y.netIncome]) },
    reasons: [...(exception ? ["Positive, nondecreasing operating margins with no net loss years; sustained improvement passes the margin-variation check"] : []), ...(declines === null ? [] : [`${declines} revenue decline${declines === 1 ? '' : 's'} in the last ${T.understandable.years} years${declines <= T.understandable.maxRevenueDeclines ? " (informational)" : ""}`])],
    checks: [
      { pass: ys.length >= T.minYears, data: "history length", reason: `only ${ys.length} years of history` },
      { pass: declines === null ? null : declines <= T.understandable.maxRevenueDeclines, data: "revenue declines", reason: `more than ${T.understandable.maxRevenueDeclines} revenue declines in ten years` },
      { core: true, pass: losses === null ? null : losses <= T.understandable.maxLossYears, data: "net loss years", reason: `more than ${T.understandable.maxLossYears} net loss years` },
      { core: true, pass: margins.length < 5 || average === null ? null : average >= 0, data: "average operating margin", reason: "negative average operating margin" },
      { core: average !== null && average > 0, pass: cv === null ? null : cv <= T.understandable.maxOpMarginCv || improving, data: "operating margin variation", reason: `operating margin variation exceeds ${T.understandable.maxOpMarginCv}` },
    ],
  });
}
