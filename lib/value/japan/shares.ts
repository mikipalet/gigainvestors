import { corroboratingSplitPrice } from '../integrity';
import type { PriceHistory, Year } from '../types';

/** EPS can already be restated for a post-year-end split. Never apply it twice. */
export function reconcileEdinetShares(year: Year, prices?: PriceHistory | null): Year {
  const facts = year.edinetShares;
  if (!facts) return year;
  const { basic, issued, filing, treasury, splitFiled, filed } = facts;
  const positive = (n: number | null): n is number => n !== null && Number.isFinite(n) && n > 0;
  const near = (a: number, b: number) => Math.abs(a / b - 1) <= .1;
  const factor = positive(issued) && positive(filing) ? filing / issued : 1;
  // Issued shares include treasury; EPS shares do not. Use treasury only as a
  // cross-check, retaining the filing's weighted-average EPS denominator.
  const outstanding = positive(filing) && treasury !== null ? filing - treasury * factor : null;
  const matches = (n: number) => positive(filing) && (near(n, filing) || positive(outstanding) && near(n, outstanding));
  let shares = basic;
  let reconciled = positive(basic) && matches(basic);
  let reason = reconciled ? 'EDINET basic EPS shares reconciled to filing-date issued shares' : 'Unverified JP share count unreconciled: basic EPS and filing-date issued shares differ or are missing';
  if (!reconciled && positive(basic) && Math.abs(factor - 1) > .1 && matches(basic * factor)
    && (splitFiled || corroboratingSplitPrice(prices, year.end, filed, factor))) {
    shares = basic * factor; reconciled = true;
    reason = 'EDINET basic EPS shares reconciled using confirmed post-year share change';
  }
  return { ...year, dilutedShares: positive(shares) ? shares : year.dilutedShares, edinetShares: { ...facts, reconciled, reason } };
}

/** Require an effective date in the relevant interval, not a historical split mention. */
export function filedShareChange(texts: string[], after: string, through: string, candidate?: number): boolean {
  for (const raw of texts) {
    const text = raw.normalize('NFKC').replace(/<[^>]*>/g, ' ').replace(/\s+/g, '');
    for (const match of text.matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)) {
      const date = `${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;
      if (date <= after || date > through) continue;
      const following = text.slice(match.index! + match[0].length, match.index! + match[0].length + 100);
      // Filing/board-meeting dates are not themselves effective dates.
      if (/^(?:付|を効力発生日|をもって|より)/.test(following) && /株式分割|株式併合/.test(following)) {
        const ratio = following.match(/([\d,.]+)株(?:につき|を|当たり)([\d,.]+)株/);
        if (!ratio) continue;
        const factor = Number(ratio[2].replaceAll(',','')) / Number(ratio[1].replaceAll(',',''));
        if (Number.isFinite(factor) && factor > 0 && (candidate === undefined || Math.abs(candidate / factor - 1) <= .1)) return true;
      }
    }
  }
  return false;
}
