import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { budgetUsage, reserveEodhd, syncBudget } from '@/lib/value/budget';
import { writeCorpusJson } from '@/lib/value/corpus';

let root: string;
let waitForEodhdReset: typeof import('@/lib/value/eodhd-reset').waitForEodhdReset;
beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-30T03:00:00Z'));
  root = mkdtempSync(join(tmpdir(), 'eodhd-reset-'));
  vi.stubEnv('VALUE_CORPUS_DIR', root);
  vi.stubEnv('EODHD_API_KEY', 'fixture');
  ({ waitForEodhdReset } = await import('@/lib/value/eodhd-reset'));
});
afterEach(() => {
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});
function userResponses(responses: unknown[]) {
  const observed: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    if (new URL(url).pathname === '/api/eod/KO.US') throw new Error('fixture quota still exhausted');
    expect(new URL(url).pathname).toBe('/api/user');
    observed.push(new Date().toISOString());
    const response = responses[Math.min(observed.length - 1, responses.length - 1)];
    if (response instanceof Error) throw response;
    return Response.json(response);
  });
  return observed;
}

it('waits for both current provider date and fewer than 5000 calls, then replaces the poisoned ledger', async () => {
  writeCorpusJson('usage/eodhd-2026-09-30.json', { date: '2026-09-30', used: 99000, history: 15000 });
  const observed = userResponses([
    { apiRequestsDate: '2026-09-29', apiRequests: 99000 },
    { apiRequestsDate: '2026-09-29', apiRequests: 25 },
    { apiRequestsDate: '2026-09-30', apiRequests: 5000 },
    { apiRequestsDate: '2026-09-30', apiRequests: 25 },
  ]);
  const logs: string[] = [];
  const work = waitForEodhdReset({ log: message => logs.push(message) });
  await vi.advanceTimersByTimeAsync(20 * 60_000);
  expect(budgetUsage().used).toBe(99001); // The failed reset probe still reserves one call.
  await vi.advanceTimersByTimeAsync(10 * 60_000);
  await work;
  expect(observed).toEqual(['2026-09-30T03:00:00.000Z', '2026-09-30T03:10:00.000Z', '2026-09-30T03:20:00.000Z', '2026-09-30T03:30:00.000Z']);
  expect(budgetUsage()).toMatchObject({ used: 25, history: 25, providerUsed: 25, checkedAt: '2026-09-30T03:30:00.000Z' });
  expect(logs.some(line => line.includes('reset observed at 2026-09-30T03:30:00.000Z'))).toBe(true);
  reserveEodhd({ endpoint: 'fundamentals/KO.US' });
  expect(syncBudget(25)).toBe(35); // Ordinary stage sync stays conservative.
});
it('starts immediately after reset and retains valid same-day history reservations', async () => {
  writeCorpusJson('usage/eodhd-2026-09-30.json', { date: '2026-09-30', used: 500, history: 20 });
  userResponses([{ apiRequestsDate: '2026-09-30', apiRequests: 4999 }]);
  await waitForEodhdReset({ log: () => {} });
  expect(Date.now()).toBe(Date.parse('2026-09-30T03:00:00Z'));
  expect(budgetUsage()).toMatchObject({ used: 4999, history: 20 });
});
it('fails closed after 12 hours without resetting the ledger, counting hourly probes', async () => {
  syncBudget(99000);
  const observed = userResponses([{ apiRequestsDate: '2026-09-29', apiRequests: 99000 }]);
  const work = expect(waitForEodhdReset({ log: () => {} })).rejects.toThrow('12 hours');
  await vi.advanceTimersByTimeAsync(12 * 60 * 60_000);
  await work;
  expect(observed).toHaveLength(72);
  expect(Date.now()).toBe(Date.parse('2026-09-30T15:00:00Z'));
  expect(budgetUsage().used).toBe(99012);
});
it('makes a cheap data request to expose the new provider day, then immediately rechecks', async () => {
  syncBudget(99000);
  const paths: string[] = [];
  let poked = false;
  vi.stubGlobal('fetch', async (url: string) => {
    const path = new URL(url).pathname;
    paths.push(path);
    if (path === '/api/eod/KO.US') { poked = true; return Response.json([]); }
    expect(path).toBe('/api/user');
    return Response.json(poked
      ? { apiRequestsDate: '2026-09-30', apiRequests: 1 }
      : { apiRequestsDate: '2026-09-29', apiRequests: 99000 });
  });
  const work = waitForEodhdReset({ log: () => {} });
  await vi.advanceTimersByTimeAsync(1000); // Allow the three rate-limited requests.
  await work;
  expect(paths).toEqual(['/api/user', '/api/eod/KO.US', '/api/user']);
  expect(Date.now()).toBeLessThan(Date.parse('2026-09-30T03:10:00Z'));
  expect(budgetUsage()).toMatchObject({ used: 1, providerUsed: 1 });
});
it('retries network failures and malformed counters without accepting them as a reset', async () => {
  const observed = userResponses([
    new Error('offline'), {}, { apiRequestsDate: '2026-09-30', apiRequests: -1 },
    { apiRequestsDate: '2026-09-30', apiRequests: '25' },
    { apiRequestsDate: '2026-09-30', apiRequests: 0 },
  ]);
  const work = waitForEodhdReset({ log: () => {} });
  await vi.advanceTimersByTimeAsync(40 * 60_000);
  await work;
  expect(observed).toHaveLength(5);
  expect(budgetUsage().used).toBe(0);
});
it('compares the provider date with the current UTC day after midnight', async () => {
  vi.setSystemTime(new Date('2026-09-30T23:55:00Z'));
  const observed = userResponses([
    { apiRequestsDate: '2026-09-30', apiRequests: 99000 },
    { apiRequestsDate: '2026-09-30', apiRequests: 25 },
    { apiRequestsDate: '2026-10-01', apiRequests: 25 },
  ]);
  const work = waitForEodhdReset({ log: () => {} });
  await vi.advanceTimersByTimeAsync(20 * 60_000);
  await work;
  expect(observed).toHaveLength(3);
  expect(budgetUsage()).toMatchObject({ date: '2026-10-01', used: 25 });
});
