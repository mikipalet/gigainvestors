import { AsyncLocalStorage } from 'node:async_hooks';
import { T } from './config';
import { readCorpusJson, writeCorpusJson } from './corpus';

export class ResearchBudgetError extends Error {}
export class EodhdBudgetError extends ResearchBudgetError {}

const stageCeiling = new AsyncLocalStorage<number>();
/** Scope every paid attempt (including retries and FX) to this stage's ceiling. */
export function withEodhdCeiling<Result>(ceiling: number, run: () => Result): Result {
  if (!Number.isSafeInteger(ceiling) || ceiling < 0 || ceiling > T.budget.dailyCalls)
    throw new EodhdBudgetError('Invalid EODHD stage budget ceiling');
  return stageCeiling.run(Math.min(stageCeiling.getStore() ?? Infinity, ceiling), run);
}
export function eodhdCeiling(forex = false): number {
  const hardCap = process.env.VALUE_EODHD_HARD_CAP === undefined ? null : Number(process.env.VALUE_EODHD_HARD_CAP);
  if (hardCap !== null && (!Number.isSafeInteger(hardCap) || hardCap <= 0 || hardCap > T.budget.dailyCalls))
    throw new EodhdBudgetError('Invalid EODHD hard budget cap');
  return Math.min(hardCap ?? Infinity, stageCeiling.getStore() ?? Infinity,
    T.budget.dailyCalls + (forex ? T.budget.extraCalls : 0));
}

export interface Usage { date: string; used: number; history: number; providerUsed?: number; checkedAt?: string }
export function budgetUsage(): Usage {
  const date = new Date().toISOString().slice(0, 10);
  return readCorpusJson<Usage>(`usage/eodhd-${date}.json`) ?? { date, used: 0, history: 0 };
}
export function syncBudget(providerUsed: number, { reset = false }: { reset?: boolean } = {}): number {
  const usage = budgetUsage();
  usage.used = reset ? providerUsed : Math.max(usage.used, providerUsed);
  // A confirmed provider reset can invalidate a ledger poisoned before the reset.
  // Retain same-day history reservations, bounded by total provider usage.
  if (reset) usage.history = Math.min(usage.history, providerUsed);
  usage.providerUsed = providerUsed;
  usage.checkedAt = new Date().toISOString();
  writeCorpusJson(`usage/eodhd-${usage.date}.json`, usage);
  return usage.used;
}

/** Synchronous reservation before EACH HTTP attempt, including failed calls/retries.
 * The daily runner serializes stages; do not run competing paid stages on this corpus.
 */
export function reserveEodhd({ endpoint, monthly = false }: { endpoint: string; monthly?: boolean }): void {
  if (endpoint === 'user') return;
  const usage = budgetUsage();
  const cost = endpoint === 'news' ? 5 : endpoint.startsWith('fundamentals/') ? T.budget.fundamentalsCost
    : endpoint === 'screener' ? T.budget.screenerCost
    : endpoint.startsWith('eod-bulk-last-day/') ? T.budget.bulkExchangeCost : T.budget.historyCost;
  const ceiling = eodhdCeiling(endpoint.includes('.FOREX'));
  if (usage.used + cost > ceiling) throw new EodhdBudgetError('daily EODHD budget reached; resume after EODHD daily reset');
  if (monthly && usage.history + cost > T.budget.priceHistoryCalls) throw new EodhdBudgetError('daily price-history budget reached; resume after EODHD daily reset');
  usage.used += cost;
  if (monthly) usage.history += cost;
  writeCorpusJson(`usage/eodhd-${usage.date}.json`, usage);
}
