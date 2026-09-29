import { readCorpusJson, writeCorpusJson } from "./corpus";
import { eodhd } from "./eodhd";

export async function usdRate(currency: string): Promise<number | null> {
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
