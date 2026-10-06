import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createUsdRate } from "../../../lib/value/fx";
import { writeCorpusJson } from "../../../lib/value/corpus";
import { eodhd } from "../../../lib/value/eodhd";

vi.mock("../../../lib/value/eodhd", () => ({ eodhd: vi.fn() }));
let directory: string;
beforeEach(() => {
  const root = (process.env.VALUE_TEST_TEMP_ROOT ?? join(tmpdir(), "value-corpus-tests"));
  mkdirSync(root, { recursive: true });
  directory = mkdtempSync(join(root, "fx-test-"));
  vi.stubEnv("VALUE_CORPUS_DIR", directory);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-29T12:00:00Z"));
  vi.mocked(eodhd).mockReset();
});
afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

it("uses the same USD and minor-unit conversions for supplied and cached rates", async () => {
  const rates = { GBP: 1.25, ZAR: 0.05 };
  for (const [currency, close] of Object.entries(rates)) {
    writeCorpusJson(`raw/eodhd/universe/fx-${currency}.json`, { date: "2026-09-29", data: [{ close }] });
  }
  const supplied = createUsdRate({ rates });
  const cached = createUsdRate();
  for (const [currency, expected] of Object.entries({ USD: 1, GBP: 1.25, GBX: 0.0125, GBp: 0.0125, ZAR: 0.05, ZAc: 0.0005 })) {
    expect(supplied(currency)).toBe(expected);
    expect(await cached(currency)).toBe(expected);
  }
  expect(await cached("invalid")).toBeNull();
  expect(supplied("EUR")).toBeNull();
  expect(eodhd).not.toHaveBeenCalled();
});

it("deduplicates major/minor requests and refreshes when the UTC day changes", async () => {
  vi.mocked(eodhd).mockResolvedValueOnce([{ close: 1.25 }]).mockResolvedValueOnce([{ close: 1.5 }]);
  const rate = createUsdRate();
  expect(await Promise.all([rate("GBP"), rate("GBX"), rate("GBp")])).toEqual([1.25, 0.0125, 0.0125]);
  expect(eodhd).toHaveBeenCalledTimes(1);
  vi.setSystemTime(new Date("2026-09-30T00:00:00Z"));
  expect(await rate("GBX")).toBe(0.015);
  expect(eodhd).toHaveBeenCalledTimes(2);
});

it("force bypasses today's corpus cache but reuses the fetched major rate", async () => {
  writeCorpusJson("raw/eodhd/universe/fx-GBP.json", { date: "2026-09-29", data: [{ close: 1.25 }] });
  vi.mocked(eodhd).mockResolvedValue([{ close: 1.5 }]);
  const rate = createUsdRate({ force: true });
  expect(await rate("GBP")).toBe(1.5);
  expect(await rate("GBX")).toBe(0.015);
  expect(eodhd).toHaveBeenCalledTimes(1);
});

it("rejects nonpositive and nonfinite rates in both modes", async () => {
  for (const close of [0, -1, Infinity, NaN]) {
    vi.mocked(eodhd).mockResolvedValue([{ close }]);
    expect(await createUsdRate({ force: true })("GBP")).toBeNull();
    expect(createUsdRate({ rates: { GBP: close } })("GBX")).toBeNull();
  }
});
