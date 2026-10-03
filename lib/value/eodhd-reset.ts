import { syncBudget } from './budget';
import { T } from './config';
import { eodhd } from './eodhd';

const POLL_MS = 10 * 60_000;
const MAX_WAIT_MS = 12 * 60 * 60_000;

/** Called while the runner holds the corpus lock, before any paid stages. */
export async function waitForEodhdReset({ log = console.log }: { log?: (message: string) => void } = {}): Promise<void> {
  const startedAt = Date.now();
  const deadline = startedAt + MAX_WAIT_MS;
  let poked = '';
  while (Date.now() < deadline) {
    const polledAt = Date.now();
    let result: { apiRequestsDate?: unknown; apiRequests?: unknown } | null = null;
    try {
      result = await eodhd('user', {}, {
        retries: 0,
        signal: AbortSignal.timeout(Math.min(T.eodhd.timeoutMs, deadline - polledAt)),
      });
    } catch {
      // Never include a provider error or request URL: either may contain credentials.
      log(`${new Date().toISOString()} EODHD reset check failed; will retry`);
    }
    const observedAt = new Date();
    if (result) {
      const { apiRequestsDate, apiRequests } = result;
      log(`${observedAt.toISOString()} EODHD reset check: apiRequestsDate=${apiRequestsDate} apiRequests=${apiRequests}`);
      if (observedAt.getTime() <= deadline
        && apiRequestsDate === observedAt.toISOString().slice(0, 10)
        && typeof apiRequests === 'number' && Number.isFinite(apiRequests)
        && apiRequests >= 0 && apiRequests < 5_000) {
        syncBudget(apiRequests, { reset: true });
        log(`EODHD reset observed at ${observedAt.toISOString()}: apiRequestsDate=${apiRequestsDate} apiRequests=${apiRequests} waitedMs=${observedAt.getTime() - startedAt}`);
        return;
      }
    }
    // EODHD's user endpoint keeps reporting yesterday's date and count until a request is made on the new day,
    // so after midnight UTC one cheap data call is needed for the reset to become visible.
    if (result && result.apiRequestsDate !== new Date().toISOString().slice(0, 10) && poked !== new Date().toISOString().slice(0, 13)) {
      poked = new Date().toISOString().slice(0, 13);
      try { await eodhd('eod/KO.US', { from: new Date(Date.now() - 4 * 86_400_000).toISOString().slice(0, 10) }, { retries: 0, signal: AbortSignal.timeout(T.eodhd.timeoutMs) }); continue; } catch { /* quota still exhausted; keep polling */ }
    }
    const delay = Math.min(polledAt + POLL_MS, deadline) - Date.now();
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error('EODHD reset not observed within 12 hours; paid stages must be skipped');
}
