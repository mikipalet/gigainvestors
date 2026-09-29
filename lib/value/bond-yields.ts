import { readCorpusJson, writeCorpusJson } from "./corpus";
import { eodhd } from "./eodhd";

type BondCache = Record<string, { date: string; yield: number | null }>;
const pending = new Map<string, Promise<number | null>>();

export async function bondYield(country: string): Promise<number | null> {
  if (!/^[A-Z]{2}$/.test(country)) return null;
  const date = new Date().toISOString().slice(0, 10);
  const cached = readCorpusJson<BondCache>("bonds.json")?.[country];
  if (cached?.date === date) return cached.yield;
  const key = `${process.env.VALUE_CORPUS_DIR ?? ""}:${date}:${country}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = (async () => {
    let value: number | null = null;
    try {
      const rows = await eodhd<Array<{ close: number }>>(`eod/${country}10Y.GBOND`, { order: "d", limit: "1" });
      if (typeof rows[0]?.close === "number" && Number.isFinite(rows[0].close)) value = rows[0].close / 100;
    } catch {
      return null;
    }
    writeCorpusJson("bonds.json", { ...readCorpusJson<BondCache>("bonds.json"), [country]: { date, yield: value } });
    return value;
  })();
  pending.set(key, request);
  try { return await request; } finally { pending.delete(key); }
}

async function usdRate(currency: string): Promise<number | null> {
  if (currency === "USD") return 1;
  const major = currency === "GBX" || currency === "GBp" ? "GBP" : currency === "ZAc" ? "ZAR" : currency;
  if (!/^[A-Z]{3}$/.test(major)) return null;
  const date = new Date().toISOString().slice(0, 10);
  const file = `raw/eodhd/universe/fx-${major}.json`;
  const cached = readCorpusJson<{ date: string; data: Array<{ close: number }> }>(file);
  try {
    const data = cached?.date === date ? cached.data
      : await eodhd<Array<{ close: number }>>(`eod/${major}USD.FOREX`, { order: "d", limit: "1" });
    const close = data[0]?.close;
    if (typeof close !== "number" || !Number.isFinite(close) || close <= 0) return null;
    if (cached?.date !== date) writeCorpusJson(file, { date, data });
    return close / (major === currency ? 1 : 100);
  } catch { return null; }
}

export async function tradingRate({ reporting, trading }: { reporting: string; trading: string }): Promise<number | null> {
  if (reporting === trading) return 1;
  const [from, to] = await Promise.all([usdRate(reporting), usdRate(trading)]);
  return from === null || to === null ? null : from / to;
}
