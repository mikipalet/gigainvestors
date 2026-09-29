import { T } from "../config";
import { grossMargin, last, median, outcome, present, ratio, roe, roic, withZeroDefaults } from "../metrics";
import type { NumericInput } from "../types";

export function run({ years, kind }: NumericInput) {
  years = withZeroDefaults(years);
  const ys = last(years, 10), financial = kind !== "operating";
  const returns = ys.map(y => financial ? roe(y) : roic(y));
  const valid = returns.filter((value): value is number => value !== null), enough = valid.length >= 5;
  const typical = enough ? median(valid) : null;
  // Keep the existing Worst3 metric keys for consumers; the statistic is now the kth-lowest return.
  const k = T.moat.badYearsAllowed + 1;
  const worst = enough && valid.length >= k ? [...valid].sort((a, b) => a - b)[k - 1] : null;
  const gm2019 = years.find(y => y.fy === 2019), gm2020 = years.find(y => y.fy === 2020), gm2023 = years.find(y => y.fy === 2023);
  const margin2019 = gm2019 ? grossMargin(gm2019) : null, margin2020 = gm2020 ? grossMargin(gm2020) : null;
  const start = margin2019 === null || margin2020 === null ? null : (margin2019 + margin2020) / 2;
  const end = gm2023 ? grossMargin(gm2023) : null;
  const drop = start === null || end === null ? null : start - end;
  const name = financial ? "roe" : "roic";
  return outcome({ key: "moat", metrics: { [`${name}Median`]: typical, [`${name}Worst3`]: worst, grossMarginDrop: financial ? null : drop,
    capexToRevenue: median(present(ys.map(y => ratio(y.capex, y.revenue)))) },
    series: { [name]: ys.map((y, i) => [y.fy, returns[i]]), grossMargin: ys.map(y => [y.fy, grossMargin(y)]) },
    checks: [
      { pass: typical === null ? null : typical >= (financial ? T.moat.roeMedianFin : T.moat.roicMedian), data: `${name.toUpperCase()} median`, reason: `${name.toUpperCase()} median below threshold` },
      { pass: worst === null ? null : worst >= (financial ? T.moat.roeWorst3Fin : T.moat.roicWorst3), data: `${name.toUpperCase()} worst years`, reason: `${name.toUpperCase()} worst years below threshold (more than ${T.moat.badYearsAllowed} bad year allowed)` },
      ...(!financial ? [{ pass: drop === null ? null : drop <= T.moat.gmDropPp + Number.EPSILON, data: "FY2019, FY2020 and FY2023 gross margins", reason: `FY2023 gross margin fell ${((drop ?? 0) * 100).toFixed(1)}pp versus the FY2019/FY2020 mean (limit ${T.moat.gmDropPp * 100}pp)` }] : []),
    ], reasons: !financial && returns.includes(Infinity) ? ["tangible capital is negative: returns effectively unlimited"] : [],
  });
}
