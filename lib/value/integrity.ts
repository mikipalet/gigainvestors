import { sameCurrency } from "./currency";
import { T } from "./config";
import type { Fundamentals } from "./types";

/** Retains the stable suffix in f.years before validating it. */
export function checkIntegrity(f: Fundamentals): { ok: boolean; reasons: string[]; notes: string[] } {
  const reasons: string[] = [];
  let years = [...f.years].sort((a, b) => a.fy - b.fy);
  const notes = [...(f.integrity.notes ?? [])];
  let start = 0;
  let currency: string | null = null;
  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    if (year.dilutedShares === 0) year.dilutedShares = null;
    if (year.currency) {
      if (currency && !sameCurrency(currency, year.currency)) {
        start = i;
        notes.push(`reporting currency changed in ${year.fy}; history retained from ${year.fy}`);
      }
      currency = year.currency;
    }
  }
  for (let i = 1; i < years.length; i++) {
    const previous = years[i - 1];
    const current = years[i];
    if (current.fy > previous.fy + 1) {
      start = Math.max(start, i);
      const missing = Array.from({ length: current.fy - previous.fy - 1 }, (_, j) => previous.fy + j + 1);
      notes.push(`gap year${missing.length > 1 ? "s" : ""} ${missing.join(", ")}; history retained from ${current.fy}`);
    }
    if (previous.dilutedShares === null || current.dilutedShares === null || previous.dilutedShares <= 0) continue;
    const ratio = current.dilutedShares / previous.dilutedShares;
    const n = Math.round(ratio >= 1 ? ratio : 1 / ratio);
    const candidate = ratio >= 1 ? n : 1 / n;
    // Require observed financial evidence: missing values cannot establish a split.
    const financialsUnscaled = (["netIncome", "equity"] as const).every(key => {
      const before = previous[key];
      const after = current[key];
      return before !== null && after !== null && Number.isFinite(before) && Number.isFinite(after)
        && before !== 0 && Math.abs(after / before / candidate - 1) > T.integrity.splitTolerance;
    });
    if (current.fy === previous.fy + 1 && Number.isFinite(ratio) && ratio > 0 && n >= 2
      && Math.abs(ratio / candidate - 1) <= T.integrity.splitTolerance && financialsUnscaled
      && (!previous.currency || !current.currency || sameCurrency(previous.currency, current.currency))) {
      // Year stores totals only. Per-share series are derived after this adjustment.
      for (const earlier of years.slice(0, i)) {
        if (earlier.dilutedShares !== null) earlier.dilutedShares *= ratio;
      }
      notes.push(`split ${ratio >= 1 ? `${n}:1` : `1:${n}`} in ${current.fy} adjusted`);
      continue;
    }
    const splitFactor = (f.splits ?? []).filter((split) => split.date > previous.end && split.date <= current.end && Number.isFinite(split.factor) && split.factor > 0)
      .reduce((factor, split) => factor * split.factor, 1);
    const adjusted = ratio / splitFactor;
    if ((ratio >= T.integrity.maxShareRatio || ratio <= T.integrity.minShareRatio) && (adjusted >= T.integrity.maxShareRatio || adjusted <= T.integrity.minShareRatio)) {
      start = Math.max(start, i);
      notes.push(`share count jumped ${Number(ratio.toFixed(2))}x in ${current.fy}; history retained from ${current.fy}`);
    }
  }
  years = years.slice(start);
  f.years = years;
  if (currency) f.currency = currency;
  if (new Set(years.map(year => year.fy)).size < T.minYears) reasons.push(`fewer than ${T.minYears} annual periods`);
  const balanceReasons: string[] = [];
  for (const year of years.slice(-T.integrity.balanceYears)) {
    const { totalAssets: assets, totalLiabilities: liabilities, equity, minorityInterest: minority } = year;
    if (assets === null || assets <= 0) continue;
    const reported = year.liabilitiesAndStockholdersEquity;
    const total = reported ?? (liabilities !== null && equity !== null ? liabilities + equity + (minority ?? 0) : null);
    if (total === null) continue;
    const difference = Math.abs(assets - total) / assets;
    if (difference > T.integrity.balanceTolerance) balanceReasons.push(`balance sheet off by ${Number((difference * 100).toFixed(2))}% in ${year.fy}`);
  }
  if (balanceReasons.length >= T.integrity.balanceMinFailures) reasons.push(...balanceReasons);
  return { ok: reasons.length === 0, reasons, notes };
}
