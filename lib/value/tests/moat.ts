import { T } from "../config";
import { grossMargin, last, median, outcome, present, ratio, roe, roic, withZeroDefaults } from "../metrics";
import type { NumericInput } from "../types";

export function run({ years, kind }: NumericInput) {
  years = withZeroDefaults(years);
  const ys = last(years, 10), financial = kind !== "operating";
  const returns = ys.map(y => financial ? roe(y) : roic(y));
  const valid = present(returns), enough = valid.length >= 5;
  const typical = enough ? median(valid) : null;
  // Keep the existing Worst3 metric keys for consumers; the statistic is now the kth-lowest return.
  const k = T.moat.badYearsAllowed + 1;
  const worst = enough && valid.length >= k ? [...valid].sort((a, b) => a - b)[k - 1] : null;
  const gm2020 = years.find(y => y.fy === 2020), gm2023 = years.find(y => y.fy === 2023);
  const start = gm2020 ? grossMargin(gm2020) : null, end = gm2023 ? grossMargin(gm2023) : null;
  const drop = start === null || end === null ? null : start - end;
  const name = financial ? "roe" : "roic";
  return outcome({ key: "moat", metrics: { [`${name}Median`]: typical, [`${name}Worst3`]: worst, grossMarginDrop: financial ? null : drop,
    capexToRevenue: median(present(ys.map(y => ratio(y.capex, y.revenue)))) },
    series: { [name]: ys.map((y, i) => [y.fy, returns[i]]), grossMargin: ys.map(y => [y.fy, grossMargin(y)]) },
    checks: [
      { pass: typical === null ? null : typical >= (financial ? T.moat.roeMedianFin : T.moat.roicMedian), reason: `${name.toUpperCase()} median below threshold` },
      { pass: worst === null ? null : worst >= (financial ? T.moat.roeWorst3Fin : T.moat.roicWorst3), reason: `${name.toUpperCase()} worst years below threshold (more than ${T.moat.badYearsAllowed} bad year allowed)` },
      ...(!financial && drop !== null ? [{ pass: drop <= T.moat.gmDropPp, reason: `gross margin fell ${(drop * 100).toFixed(1)}pp through 2021-2023` }] : []),
    ], reasons: !financial && drop === null ? ["inflation gross margin check skipped: gross margin unavailable"] : [],
  });
}
