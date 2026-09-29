import { readCorpusJson, writeCorpusJson } from "./corpus";
import { eodhd } from "./eodhd";

type Rates = Readonly<Record<string, number>>;
type UsdRate = (currency: string) => Promise<number | null>;

function denomination(currency: string) {
  const major = currency === "GBX" || currency === "GBp" ? "GBP" : currency === "ZAc" ? "ZAR" : currency;
  return { major, divisor: major === currency ? 1 : 100 };
}

function convert(currency: string, rate: number | null): number | null {
  return rate !== null && Number.isFinite(rate) && rate > 0 ? rate / denomination(currency).divisor : null;
}

/** USD per currency unit. Supplied rates are major-currency USD rates, with no I/O. */
export function createUsdRate(options: { rates: Rates }): (currency: string) => number | null;
export function createUsdRate(options?: { force?: boolean }): UsdRate;
export function createUsdRate(options: { force?: boolean; rates?: Rates } = {}): UsdRate | ((currency: string) => number | null) {
  if (options.rates) {
    const rates = options.rates;
    return currency => {
      const { major } = denomination(currency);
      return convert(currency, major === "USD" ? 1 : /^[A-Z]{3}$/.test(major) ? rates[major] ?? null : null);
    };
  }
  // Share requests for major/minor denominations, but refresh across UTC days.
  const rates = new Map<string, Promise<number | null>>();
  return async currency => {
    const { major } = denomination(currency);
    if (major === "USD") return 1;
    if (!/^[A-Z]{3}$/.test(major)) return null;
    const date = new Date().toISOString().slice(0, 10);
    const key = `${date}:${major}`;
    let request = rates.get(key);
    if (!request) {
      request = (async () => {
        try {
          const file = `raw/eodhd/universe/fx-${major}.json`;
          const cached = readCorpusJson<{ date: string; data: Array<{ close: number }> }>(file);
          let data = !options.force && cached?.date === date ? cached.data : null;
          if (data === null) {
            data = await eodhd<Array<{ close: number }>>(`eod/${major}USD.FOREX`, { order: "d", limit: "1" });
            writeCorpusJson(file, { date, data });
          }
          const close = data[0]?.close;
          return typeof close === "number" && Number.isFinite(close) && close > 0 ? close : null;
        } catch {
          console.warn(`${major}: USD conversion unavailable`);
          return null;
        }
      })();
      rates.set(key, request);
    }
    return convert(currency, await request);
  };
}
