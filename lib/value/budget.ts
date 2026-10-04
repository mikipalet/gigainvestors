import { T } from './config';
import { readCorpusJson, writeCorpusJson } from './corpus';

export class ResearchBudgetError extends Error {}
export class EodhdBudgetError extends ResearchBudgetError {}

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
  const hardCap=process.env.VALUE_EODHD_HARD_CAP===undefined?null:Number(process.env.VALUE_EODHD_HARD_CAP);
  if(hardCap!==null&&(!Number.isSafeInteger(hardCap)||hardCap<=0||hardCap>T.budget.dailyCalls))throw new EodhdBudgetError('Invalid EODHD hard budget cap');
  const ceiling = Math.min(hardCap??Infinity,T.budget.dailyCalls + (endpoint.includes('.FOREX') ? T.budget.extraCalls : 0));
  if (usage.used + cost > ceiling) throw new EodhdBudgetError('daily EODHD budget reached; resume after EODHD daily reset');
  if (monthly && usage.history + cost > T.budget.priceHistoryCalls) throw new EodhdBudgetError('daily price-history budget reached; resume after EODHD daily reset');
  usage.used += cost;
  if (monthly) usage.history += cost;
  writeCorpusJson(`usage/eodhd-${usage.date}.json`, usage);
}
