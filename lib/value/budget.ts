import { T } from './config';
import { readCorpusJson, writeCorpusJson } from './corpus';

/** The extra 500 calls are reserved for FX and operational overhead. */
export function dailyBudgetSplit({ exchanges, used, historyUsed = 0 }: { exchanges: number; used: number; historyUsed?: number }) {
  let remaining = Math.max(0, T.budget.dailyCalls - used);
  const prices = Math.min(exchanges, Math.floor(remaining / T.budget.bulkExchangeCost)) * T.budget.bulkExchangeCost;
  remaining -= prices;
  const history = Math.min(remaining, Math.max(0, T.budget.priceHistoryCalls - historyUsed));
  remaining -= history;
  return { prices, history, fundamentals: Math.floor(remaining / T.budget.fundamentalsCost) * T.budget.fundamentalsCost };
}

export interface Usage { date: string; used: number; history: number; providerUsed?: number; checkedAt?: string }
export function budgetUsage(): Usage {
  const date = new Date().toISOString().slice(0, 10);
  return readCorpusJson<Usage>(`usage/eodhd-${date}.json`) ?? { date, used: 0, history: 0 };
}
export function syncBudget(providerUsed: number): number {
  const usage = budgetUsage();
  usage.used = Math.max(usage.used, providerUsed);
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
  const cost = endpoint.startsWith('fundamentals/') ? T.budget.fundamentalsCost
    : endpoint.startsWith('eod-bulk-last-day/') ? T.budget.bulkExchangeCost : T.budget.historyCost;
  const ceiling = T.budget.dailyCalls + (endpoint.includes('.FOREX') ? T.budget.extraCalls : 0);
  if (usage.used + cost > ceiling) throw new Error('Daily EODHD budget reached');
  if (monthly && usage.history + cost > T.budget.priceHistoryCalls) throw new Error('Daily price-history budget reached');
  usage.used += cost;
  if (monthly) usage.history += cost;
  writeCorpusJson(`usage/eodhd-${usage.date}.json`, usage);
}
