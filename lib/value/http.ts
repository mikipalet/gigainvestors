function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit & { retries?: number; retryOn?: number[]; beforeAttempt?: () => void | Promise<void>; fetcher?: typeof fetch; retryNetworkErrors?: boolean } = {},
): Promise<Response> {
  const { retries = 3, retryOn, beforeAttempt, fetcher = fetch, retryNetworkErrors = false, ...request } = init;
  if (!Number.isInteger(retries) || retries < 0) throw new RangeError("retries must be a nonnegative integer");
  for (let attempt = 0; ; attempt++) {
    await beforeAttempt?.();
    let response: Response;
    try { response = await fetcher(url, request); }
    catch (error) {
      if (!retryNetworkErrors || request.signal?.aborted || attempt >= retries) throw error;
      await sleep(Math.min(1000 * 2 ** attempt, 60_000), request.signal);
      continue;
    }
    const retry = retryOn
      ? retryOn.includes(response.status)
      : response.status === 429 || (response.status >= 500 && response.status < 600);
    if (!retry || attempt >= retries) return response;

    const header = response.headers.get("Retry-After");
    let delay = Math.min(1000 * 2 ** attempt, 60_000);
    if (header !== null && header.trim() !== "") {
      const seconds = Number(header);
      const retryAfter = Number.isFinite(seconds)
        ? seconds * 1000
        : Date.parse(header) - Date.now();
      if (Number.isFinite(retryAfter)) delay = Math.max(0, retryAfter);
    }
    await response.body?.cancel();
    await sleep(delay, request.signal);
  }
}

export function createLimiter({ perSecond }: { perSecond: number }): <T>(fn: () => Promise<T>) => Promise<T> {
  if (!Number.isFinite(perSecond) || perSecond <= 0) throw new RangeError("perSecond must be positive");
  const interval = 1000 / perSecond;
  let nextStart = 0;
  let queue = Promise.resolve();
  return <T>(fn: () => Promise<T>): Promise<T> => {
    const slot = queue.then(async () => {
      const delay = nextStart - Date.now();
      if (delay > 0) await sleep(delay);
      nextStart = Date.now() + interval;
    });
    queue = slot;
    return slot.then(fn);
  };
}

export async function pool<T, R>({ items, concurrency, run }: {
  items: T[];
  concurrency: number;
  run: (item: T) => Promise<R>;
}): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new RangeError("concurrency must be a positive integer");
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await run(items[index]);
    }
  }));
  return results;
}
