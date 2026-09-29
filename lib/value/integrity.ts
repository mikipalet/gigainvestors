import { T } from "./config";
import type { Fundamentals } from "./types";

export function checkIntegrity(f: Fundamentals): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const years = [...f.years].sort((a, b) => a.fy - b.fy);
  if (new Set(years.map((year) => year.fy)).size < T.minYears) reasons.push(`fewer than ${T.minYears} annual periods`);
  for (let i = 1; i < years.length; i++) {
    const previous = years[i - 1];
    const current = years[i];
    for (let fy = previous.fy + 1; fy < current.fy; fy++) reasons.push(`gap year ${fy}`);
    if (previous.dilutedShares === null || current.dilutedShares === null || previous.dilutedShares <= 0) continue;
    const ratio = current.dilutedShares / previous.dilutedShares;
    const splitFactor = (f.splits ?? []).filter((split) => split.date > previous.end && split.date <= current.end && Number.isFinite(split.factor) && split.factor > 0)
      .reduce((factor, split) => factor * split.factor, 1);
    const adjusted = ratio / splitFactor;
    if ((ratio > T.integrity.maxShareRatio || ratio < T.integrity.minShareRatio) && (adjusted > T.integrity.maxShareRatio || adjusted < T.integrity.minShareRatio)) {
      reasons.push(`share count jumped ${Number(ratio.toFixed(2))}x in ${current.fy}`);
    }
  }
  const currencies = new Set(years.map((year) => year.currency).filter(Boolean));
  if (currencies.size > 1) reasons.push("reporting currency changed");
  for (const year of years.slice(-T.integrity.balanceYears)) {
    const { totalAssets: assets, totalLiabilities: liabilities, equity, minorityInterest: minority } = year;
    if (assets === null || liabilities === null || equity === null || assets <= 0) continue;
    const difference = Math.abs(assets - liabilities - equity - (minority ?? 0)) / assets;
    if (difference > T.integrity.balanceTolerance) reasons.push(`balance sheet off by ${Number((difference * 100).toFixed(2))}% in ${year.fy}`);
  }
  return { ok: reasons.length === 0, reasons };
}
