import type { Year } from './types';

/** Parent NI is already allocated. Apply this factor only to consolidated inputs. */
export function parentShare(year: Year): number | null {
  if (year.totalNetIncome === undefined) return 1; // legacy/non-EDINET input contract
  const minority = year.minorityInterest ?? 0;
  if (!(minority > 0) || year.equity === null || minority / (year.equity + minority) <= .1) return 1;
  const parent = year.netIncome, total = year.totalNetIncome;
  if (parent === null || total == null || total <= 0 || parent < 0 || parent > total) return null;
  return parent / total;
}
