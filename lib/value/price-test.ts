import type { Result, Valuation } from "./types";

export function priceTest({ valuation, price, requiredMos }: { valuation: Valuation | null; price: number | null; requiredMos: number }): { result: Result; mos: number | null } {
  if (valuation === null || price === null || !Number.isFinite(price) || price <= 0 || !Number.isFinite(valuation.perShare.mid)) return { result: "unclear", mos: null };
  if (valuation.perShare.mid <= 0) return { result: "fail", mos: null };
  const mos = 1 - price / valuation.perShare.mid;
  return { result: price <= valuation.perShare.mid * (1 - requiredMos) ? "pass" : mos >= 0 ? "unclear" : "fail", mos };
}
