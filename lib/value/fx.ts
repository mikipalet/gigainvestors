import { readCorpusJson, writeCorpusJson } from "./corpus";
import { eodhd } from "./eodhd";

/** Shared listing-currency conversion, cached by currency and UTC date. */
export function createUsdRate({ force = false }: { force?: boolean } = {}) {
  const rates = new Map<string, number | null>([["USD", 1]]);
  const today = new Date().toISOString().slice(0, 10);
  return async function usdRate(currency: string): Promise<number | null> {
    if (rates.has(currency)) return rates.get(currency)!;
    const major = currency === "GBX" || currency === "GBp" ? "GBP" : currency === "ZAc" ? "ZAR" : currency;
    let rate: number | null = null;
    try {
      const rel = `raw/eodhd/universe/fx-${major}.json`;
      const cached = readCorpusJson<{ date: string; data: Array<{ close: number }> }>(rel);
      let data = !force && cached?.date === today ? cached.data : null;
      if (data === null) {
        data = await eodhd<Array<{ close: number }>>(`eod/${encodeURIComponent(major)}USD.FOREX`, { order: "d", limit: "1" });
        writeCorpusJson(rel, { date: today, data });
      }
      const close = Number(data[0]?.close);
      if (Number.isFinite(close) && close > 0) rate = close / (major === currency ? 1 : 100);
    } catch {
      console.warn(`${currency}: USD conversion unavailable; market caps remain null`);
    }
    rates.set(currency, rate);
    return rate;
  };
}
