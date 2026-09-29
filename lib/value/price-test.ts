import { T } from "./config";
import type { Result, Valuation } from "./types";

export function priceTest(valuation: Valuation | null, price: number | null): { result: Result; mos: number | null } {
  if (valuation === null || price === null || !Number.isFinite(price) || price < 0 || !Number.isFinite(valuation.perShare.mid)) return { result: "unclear", mos: null };
  if (valuation.perShare.mid <= 0) return { result: "fail", mos: null };
  const mos = 1 - price / valuation.perShare.mid;
  return { result: mos >= T.price.passMos ? "pass" : mos >= 0 ? "unclear" : "fail", mos };
}
