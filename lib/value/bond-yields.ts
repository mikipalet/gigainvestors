import { readCorpusJson, writeCorpusJson } from "./corpus";
import { eodhd } from "./eodhd";
import { usdRate } from "./fx";

// EODHD uses UK for the ISO GB country; other ISO2 codes are unchanged.
const EODHD_BOND_CODES: Readonly<Record<string, string>> = { GB: "UK" };

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
      const rows = await eodhd<Array<{ close: number }>>(`eod/${EODHD_BOND_CODES[country] ?? country}10Y.GBOND`, { order: "d", limit: "1" });
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

export async function tradingRate({ reporting, trading }: { reporting: string; trading: string }): Promise<number | null> {
  if (reporting === trading) return 1;
  const [from, to] = await Promise.all([usdRate(reporting), usdRate(trading)]);
  return from === null || to === null ? null : from / to;
}
