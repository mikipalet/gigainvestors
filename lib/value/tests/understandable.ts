import { T } from "../config";
import { last, mean, opMargin, outcome, present } from "../metrics";
import type { NumericInput } from "../types";

export function run({ years }: NumericInput) {
  const history = last(years, T.understandable.years + 1), ys = history.slice(-T.understandable.years);
  const revenueChanges = history.slice(1).map((y, i) => y.revenue === null || history[i].revenue === null || y.fy !== history[i].fy + 1 ? null : y.revenue - history[i].revenue!);
  const margins = present(ys.map(opMargin)), average = mean(margins);
  const cv = margins.length < 5 || average === null || average <= 0 ? null : Math.sqrt(mean(margins.map(x => (x - average) ** 2))!) / average;
  const declines = present(revenueChanges).length < 5 ? null : present(revenueChanges).filter(x => x < 0).length;
  const incomes = present(ys.map(y => y.netIncome));
  const losses = incomes.length < 5 ? null : incomes.filter(x => x < 0).length;
  return outcome({ key: "understandable", metrics: { historyYears: ys.length, revenueDeclines: declines, lossYears: losses, opMarginCv: cv },
    series: { revenue: ys.map(y => [y.fy, y.revenue]), operatingMargin: ys.map(y => [y.fy, opMargin(y)]), netIncome: ys.map(y => [y.fy, y.netIncome]) },
    checks: [
      { pass: ys.length < T.understandable.years ? null : true, reason: "ten years of history required" },
      { pass: declines === null ? null : declines <= T.understandable.maxRevenueDeclines, reason: "too many revenue declines" },
      { pass: losses === null ? null : losses <= T.understandable.maxLossYears, reason: "too many net loss years" },
      { pass: cv === null ? null : cv < T.understandable.maxOpMarginCv, reason: "operating margin variation too high" },
    ],
  });
}
