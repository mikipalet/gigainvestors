import { last, ratio } from './metrics';
import type { Company, Valuation, Year } from './types';

/** Named investment holdings remain identifiable when vendors omit gain breakdowns.
 * Other managers/brokers need five complete years of predominantly fair-value income. */
export function isInvestmentHolding(company: Pick<Company, 'name' | 'industry'>, years: Year[]): boolean {
  const name = company.name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/\bberkshire\b/.test(name)) return false;
  if (/\b(?:3i(?: group)?|investor ab|industrivarden|kinnevik|exor|sofina|groupe bruxelles lambert|gbl|hal trust|wendel|eurazeo)\b/.test(name)) return true;
  if (!/^(asset management|capital markets)$/i.test(company.industry ?? '')) return false;
  const history = last(years, 5);
  if (history.length !== 5 || history.some((y, i) => !Number.isFinite(y.fairValueGains) || !Number.isFinite(y.totalIncome) || i > 0 && y.fy !== history[i - 1].fy + 1)) return false;
  const income = history.reduce((sum, y) => sum + y.totalIncome!, 0);
  return income > 0 && history.reduce((sum, y) => sum + y.fairValueGains!, 0) / income > .5;
}

/** Explicit investment NAV only: consolidated operating equity is not investment NAV. */
export function navPerShare(y: Year): number | null {
  const nav = y.navPerShare ?? ratio(y.investmentNav ?? null, y.sharesOutstanding ?? y.dilutedShares);
  return nav !== null && Number.isFinite(nav) && nav > 0 ? nav : null;
}
export function navHistory(years: Year[]): { nav: number; cagr: number; uncappedCagr: number; series: Array<[number, number]> } | null {
  const history = last(years, 11);
  if (history.length !== 11 || history.some((y, i) => i > 0 && y.fy !== history[i - 1].fy + 1)) return null;
  if (new Set(history.map(y => y.currency).filter(Boolean)).size > 1) return null;
  const nav = history.map(navPerShare);
  if (nav.some(n => n === null)) return null;
  let factor = 1;
  for (let i = 1; i < history.length; i++) {
    const y = history[i];
    // A missing payout is unknown, never an assumed zero distribution.
    const dividend = y.dividendsPerShare ?? ratio(y.dividendsPaid, y.dilutedShares);
    if (dividend === null || !Number.isFinite(dividend) || dividend < 0) return null;
    factor *= (nav[i]! + dividend) / nav[i - 1]!;
  }
  const uncappedCagr = factor ** .1 - 1;
  if (!Number.isFinite(uncappedCagr)) return null;
  return { nav: nav.at(-1)!, cagr: Math.min(.12, uncappedCagr), uncappedCagr, series: history.map((y, i) => [y.fy, nav[i]!]) };
}
export function valueInvestmentHolding(years: Year[], currency: string): { valuation: Valuation | null; reason: string | null } {
  const history = navHistory(years);
  if (!history) return { valuation: null, reason: 'Ten-year reported NAV per share and dividend history unavailable' };
  const latest = last(years, 1)[0];
  const shares = latest.sharesOutstanding ?? latest.dilutedShares;
  if (!shares || !Number.isFinite(shares) || shares <= 0) return { valuation: null, reason: 'Investment NAV share count unavailable' };
  return { reason: null, valuation: {
    version: 2, method: 'nav', tier: 'nav', currency, shares,
    normalized: history.nav, growth: history.cagr, discountRate: .1, terminalGrowth: 0, bondYield: null, netCash: 0,
    perShare: { low: history.nav, mid: history.nav, high: history.nav }, equityBondYield: null,
    navReturn: { cagr: history.cagr, uncappedCagr: history.uncappedCagr },
    bridge: [{ label: 'Reported NAV per share', value: history.nav }, { label: 'Ten-year NAV and dividend return', value: history.cagr }],
    assumptions: [
      'Investment holding: portfolio fair-value gains are not owner earnings',
      'Ten-year total return compounds each annual (NAV per share + dividend per share) / prior NAV per share; dividends reinvested at year-end NAV',
      'NAV and dividends must use a consistent currency and split-adjusted per-share basis',
      'Expected return = ten-year NAV total-return CAGR (capped at 12%) divided by price / NAV',
      'Buy requires price at or below 85% of NAV and expected return of at least 10%',
      'Reported NAV includes portfolio liabilities; cash and debt are not added or deducted again',
    ],
  } };
}
