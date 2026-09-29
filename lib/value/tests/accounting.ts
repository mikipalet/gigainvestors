import { T } from "../config";
import { accruals, last, outcome, present, ratio, withZeroDefaults } from "../metrics";
import type { NumericInput } from "../types";

export function run({ years, kind }: NumericInput) {
  years = withZeroDefaults(years);
  const ys = last(years, 10), five = last(ys, 5), end = ys.at(-1), financial = kind !== "operating";
  const accrued = !financial && present(ys.map(accruals)).length >= 5 && end ? accruals(end) : null;
  const base = end ? ys.find(y => y.fy === end.fy - 3) : undefined;
  const recvGrowth = end && base && present(ys.map(y => y.receivables)).length >= 5 ? ratio(end.receivables, base.receivables) : null;
  const salesGrowth = end && base && present(ys.map(y => y.revenue)).length >= 5 ? ratio(end.revenue, base.revenue) : null;
  // Subtracting the two growth factors cancels their minus-one terms.
  const gap = financial || recvGrowth === null || salesGrowth === null ? null : recvGrowth - salesGrowth;
  const recurring = present(five.map(y => y.nonRecurring)).length < 5 ? null : five.filter(y => y.nonRecurring !== 0).length;
  const compensation = present(ys.map(y => ratio(y.sbc, y.ocf))).length < 5 || !end ? null : ratio(end.sbc, end.ocf);
  const goodwill = !end || end.goodwill === null || end.intangibles === null ? null : ratio(end.goodwill + end.intangibles, end.equity);
  return outcome({ key: "accounting", metrics: { accruals: accrued, receivablesGrowthGap: gap, restructuringYears: recurring, sbcToOcf: compensation, goodwillIntangiblesToEquity: goodwill },
    series: { accruals: ys.map(y => [y.fy, financial ? null : accruals(y)]), sbcToOcf: ys.map(y => [y.fy, ratio(y.sbc, y.ocf)]), nonRecurring: ys.map(y => [y.fy, y.nonRecurring]) },
    reasons: financial ? ["accruals: na for banks and insurers", "receivables growth: na for banks and insurers"] : [],
    checks: [
      { pass: !(end && end.ocf !== null && end.ocf <= 0 && end.netIncome !== null && end.netIncome > 0), reason: "earnings not backed by cash" },
      ...(!financial ? [
        { pass: accrued === null ? null : accrued < T.accounting.maxAccruals, reason: "Sloan accruals above threshold" },
        { pass: gap === null ? null : gap < T.accounting.maxRecvGap, reason: "receivables growth exceeds revenue growth" },
      ] : []),
      { pass: recurring === null ? null : recurring <= T.accounting.maxRestructYears, reason: "restructuring or one-time charges in at least three of five years" },
      { pass: compensation === null ? null : compensation < T.accounting.maxSbcToOcf, reason: "stock compensation exceeds cash flow threshold" },
    ],
  });
}
