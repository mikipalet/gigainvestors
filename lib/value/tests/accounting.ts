import { T } from "../config";
import { accruals, last, outcome, present, ratio, withZeroDefaults, type Check } from "../metrics";
import type { NumericInput } from "../types";

export function run({ years, kind }: NumericInput) {
  years = withZeroDefaults(years);
  const ys = last(years, 10), five = last(ys, 5), end = ys.at(-1), financial = kind !== "operating";
  const accrued = !financial && end ? accruals(end) : null;
  const prior = end ? ys.find(y => y.fy === end.fy - 1) : undefined;
  const dsri = financial || !end || !prior ? null
    : ratio(ratio(end.receivables, end.revenue), ratio(prior.receivables, prior.revenue));
  const recurring = present(five.map(y => y.nonRecurring)).length < 5 ? null : five.filter(y => y.nonRecurring !== 0).length;
  const compensation = end ? ratio(end.sbc, end.ocf) : null;
  const goodwill = !end || end.goodwill === null || end.intangibles === null ? null : ratio(end.goodwill + end.intangibles, end.equity);
  const flags: Check[] = [
    ...(!financial ? [
      { core: true, pass: accrued === null ? null : accrued <= T.accounting.maxAccruals, data: "Sloan accruals", reason: `Sloan accruals exceed ${T.accounting.maxAccruals * 100}%` },
      { pass: dsri === null ? null : dsri <= T.accounting.maxDsri, data: "latest-year receivables to sales index (DSRI)", reason: `latest-year receivables to sales index (DSRI) exceeds ${T.accounting.maxDsri}` },
    ] : []),
    { pass: recurring === null ? null : recurring <= T.accounting.maxRestructYears, data: "five years of restructuring charges", reason: "restructuring or one-time charges in at least three of five years" },
    { pass: compensation === null ? null : compensation <= T.accounting.maxSbcToOcf, data: "stock compensation to operating cash flow", reason: `stock compensation exceeds ${T.accounting.maxSbcToOcf * 100}% of operating cash flow` },
  ];
  const cashBacked = !end || end.ocf === null || end.netIncome === null ? null : !(end.ocf <= 0 && end.netIncome > 0);
  return outcome({ key: "accounting", metrics: { accruals: accrued, dsri, restructuringYears: recurring, sbcToOcf: compensation,
    cashBacked: cashBacked === null ? null : Number(cashBacked), ocfToNi: !end || end.netIncome === null || end.ocf === null ? null : end.netIncome > 0 ? end.ocf/end.netIncome : null, redFlags: flags.filter(flag => flag.pass === false).length, goodwillIntangiblesToEquity: goodwill },
    series: { ocfToNi: ys.map(y=>[y.fy,ratio(y.ocf,y.netIncome)]), accruals: ys.map(y => [y.fy, financial ? null : accruals(y)]), sbcToOcf: ys.map(y => [y.fy, ratio(y.sbc, y.ocf)]), nonRecurring: ys.map(y => [y.fy, y.nonRecurring]) },
    reasons: [],
    minFailures: T.accounting.minRedFlags,
    checks: [...flags, { core: true, pass: cashBacked, decisive: true, data: "operating cash flow backing earnings", reason: "earnings not backed by cash" }],
  });
}
