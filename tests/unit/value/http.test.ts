import { afterEach, describe, expect, it, vi } from "vitest";
import { createLimiter, fetchWithRetry, pool } from "@/lib/value/http";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fetchWithRetry", () => {
  it("retries a 429 using Retry-After and returns the successful response", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { "Retry-After": "0" } }))
      .mockResolvedValueOnce(new Response("ok"));
    vi.stubGlobal("fetch", fetch);
    const response = await fetchWithRetry("https://example.test");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("returns 404 immediately", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetch);
    expect((await fetchWithRetry("https://example.test")).status).toBe(404);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("backs off exponentially, caps at 60 seconds, and stops at the retry budget", async () => {
    vi.useFakeTimers();
    const starts: number[] = [];
    vi.stubGlobal("fetch", vi.fn(async () => {
      starts.push(Date.now());
      return new Response(null, { status: 529 });
    }));
    const pending = fetchWithRetry("https://example.test", { retries: 8 });
    await vi.runAllTimersAsync();
    expect((await pending).status).toBe(529);
    expect(starts.slice(1).map((start, i) => start - starts[i])).toEqual([
      1000, 2000, 4000, 8000, 16000, 32000, 60000, 60000,
    ]);
  });

  it("honours an HTTP-date Retry-After and forwards only fetch options", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T00:00:00Z"));
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503, headers: { "Retry-After": "Tue, 29 Sep 2026 00:02:00 GMT" } }))
      .mockResolvedValueOnce(new Response("ok"));
    vi.stubGlobal("fetch", fetch);
    const pending = fetchWithRetry("https://example.test", { retries: 1, retryOn: [503], headers: { Accept: "application/json" } });
    await vi.advanceTimersByTimeAsync(119_999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect((await pending).status).toBe(200);
    expect(fetch).toHaveBeenLastCalledWith("https://example.test", { headers: { Accept: "application/json" } });
  });
});

describe("pool", () => {
  it("bounds concurrency and preserves input order despite out-of-order completion", async () => {
    let active = 0;
    let maximum = 0;
    const completed: number[] = [];
    const result = await pool({
      items: [30, 1, 1, 1], concurrency: 2,
      run: async (delay) => {
        active++;
        maximum = Math.max(maximum, active);
        await new Promise((resolve) => setTimeout(resolve, delay));
        active--;
        completed.push(delay);
        return delay * 2;
      },
    });
    expect(maximum).toBe(2);
    expect(completed[0]).toBe(1);
    expect(result).toEqual([60, 2, 2, 2]);
  });

  it("returns an empty result for empty input", async () => {
    expect(await pool({ items: [], concurrency: 2, run: async (item) => item })).toEqual([]);
  });

  it("rejects invalid concurrency instead of silently skipping work", async () => {
    await expect(pool({ items: [1], concurrency: 0, run: async (item) => item })).rejects.toThrow();
  });
});

describe("createLimiter", () => {
  it("spaces starts even when calls overlap or an earlier call fails", async () => {
    vi.useFakeTimers();
    const limit = createLimiter({ perSecond: 2 });
    const starts: number[] = [];
    const jobs = [0, 1, 2].map((id) => limit(async () => {
      starts.push(Date.now());
      if (id === 0) throw new Error("failed");
      return id;
    }));
    const pending = Promise.allSettled(jobs);
    await vi.runAllTimersAsync();
    expect((await pending).map((result) => result.status)).toEqual(["rejected", "fulfilled", "fulfilled"]);
    expect(starts.map((start) => start - starts[0])).toEqual([0, 500, 1000]);
  });

  it("rejects a nonpositive rate", () => {
    expect(() => createLimiter({ perSecond: 0 })).toThrow();
  });
});
