import { T } from "./config";
import { bvps, cagr, clamp, investment, last, mean, median, nopat, present, ratio, roe, roiic, sum } from "./metrics";
import { ownerEarningsBridge } from "./owner-earnings";
import type { Kind, Valuation, Year } from "./types";

export { ownerEarningsSeries } from "./owner-earnings";

export function presentValue({ oe, g, r, terminal }: { oe: number; g: number; r: number; terminal: number }): number {
  if (r <= terminal) throw new RangeError("discount rate must exceed terminal growth");
  let earnings = oe, pv = 0;
  for (let t = 1; t <= 10; t++) {
    const growth = t <= 5 ? g : g + (terminal - g) * (t - 5) / 5;
    earnings *= 1 + growth;
    pv += earnings / (1 + r) ** t;
  }
  return pv + earnings * (1 + terminal) / (r - terminal) / (1 + r) ** 10;
}

function decadeCagr(series: Array<[number, number | null]>): number | null {
  const ys = series.slice(-11), first = ys[0], end = ys.at(-1);
  return ys.length !== 11 || !first || !end || end[0] - first[0] !== 10 ? null
    : cagr({ first: first[1], last: end[1], years: 10 });
}

function reinvestmentRate(years: Year[]): number | null {
  const ys = last(years, 11);
  if (ys.length !== 11) return null;
  const investments = ys.slice(1).map((y, i) => investment(y, ys[i]));
  const profits = ys.slice(1).map(nopat);
  return investments.some(x => x === null) || profits.some(x => x === null) ? null : ratio(sum(present(investments)), sum(present(profits)));
}

export function valueCompany({ years, kind, bondYield, cyclical, currency = "" }: {
  years: Year[]; kind: Kind; bondYield: number | null; cyclical: boolean; currency?: string;
}): { valuation: Valuation | null; reason: string | null } {
  const ys = last(years, years.length), latest = ys.at(-1);
  if (!latest || latest.dilutedShares === null || latest.dilutedShares <= 0) return { valuation: null, reason: "no share count" };
  const shares = latest.dilutedShares;
  const discountRate = Math.max(T.valuation.minDiscount, (bondYield ?? 0.04) + T.valuation.bondSpread);
  const assumptions: string[] = [];
  if (bondYield === null) assumptions.push("local government bond yield unavailable; using 4%");
  if (!currency) assumptions.push("reporting currency not supplied");
  const common = { currency, discountRate, terminalGrowth: T.valuation.terminal, bondYield, shares, assumptions };

  if (kind !== "operating") {
    const book = bvps(latest);
    if (book === null || book <= 0) return { valuation: null, reason: "book value not positive" };
    const returns = present(last(ys, 10).map(roe));
    if (returns.length < 5) return { valuation: null, reason: "insufficient return on equity history" };
    const normalizedRoe = median(returns)!;
    const growth = clamp({ value: decadeCagr(ys.map(y => [y.fy, bvps(y)])) ?? 0, min: 0, max: T.valuation.finMaxGrowth });
    const multiple = (r: number) => clamp({ value: (normalizedRoe - growth) / (r - growth), min: 0, max: 4 });
    return { reason: null, valuation: { ...common, method: "book_value", normalized: book, growth, netCash: 0,
      perShare: { low: multiple(discountRate + 0.01) * book, mid: multiple(discountRate) * book, high: multiple(discountRate - 0.01) * book },
      equityBondYield: ratio(median(present(last(ys, 10).map(y => y.netIncome))), latest.marketCap),
      bridge: [{ label: "book value per share", value: book }, { label: "normalized return on equity", value: normalizedRoe }, { label: "justified price to book", value: multiple(discountRate) }],
      assumptions: [...assumptions, "cash and debt are included in book value", "equity bond yield uses median net income"],
    } };
  }

  const history = ownerEarningsBridge(ys), window = cyclical ? 7 : 5;
  const recent = history.slice(-window).filter((row): row is typeof row & { value: number; maintenanceCapex: number } => row.value !== null && row.maintenanceCapex !== null);
  if (recent.length < window) return { valuation: null, reason: "insufficient owner earnings history" };
  const normalized = median(recent.map(row => row.value))!;
  if (normalized <= 0) return { valuation: null, reason: "owner earnings not positive" };
  if (latest.cash === null || latest.totalDebt === null) return { valuation: null, reason: "net cash unavailable" };
  const netCash = latest.cash - latest.totalDebt;
  const oeGrowth = decadeCagr(history.map(row => [row.year.fy, ratio(row.value, row.year.dilutedShares)]));
  const revenueGrowth = decadeCagr(ys.map(y => [y.fy, ratio(y.revenue, y.dilutedShares)]));
  const incremental = roiic(ys), reinvestment = reinvestmentRate(ys);
  const estimates = present([oeGrowth, revenueGrowth, incremental === null || reinvestment === null ? null : incremental * reinvestment]);
  const growth = clamp({ value: estimates.length ? Math.min(...estimates) : 0, min: 0, max: T.valuation.maxGrowth });
  const pv = (g: number, r: number) => presentValue({ oe: normalized, g, r, terminal: T.valuation.terminal });
  const midPv = pv(growth, discountRate);
  if (history.some(row => row.year.sbc === null)) assumptions.push("stock compensation not reported");
  if (!estimates.length) assumptions.push("growth estimates unavailable; using zero growth");
  assumptions.push(`owner earnings normalized over ${window} years`, "growth capex uses trailing five-year PPE to revenue", "bridge components use the median owner earnings observation");
  const ordered = [...recent].sort((a, b) => a.value - b.value);
  const center = Math.floor(ordered.length / 2);
  const representative = ordered.length % 2 ? [ordered[center]] : ordered.slice(center - 1, center + 1);
  return { reason: null, valuation: { ...common, method: "owner_earnings", normalized, growth, netCash,
    perShare: { low: (pv(growth / 2, discountRate + 0.01) + netCash) / shares, mid: (midPv + netCash) / shares, high: (pv(growth, discountRate - 0.01) + netCash) / shares },
    equityBondYield: ratio(normalized, latest.marketCap),
    bridge: [
      { label: "net income", value: mean(representative.map(row => row.year.netIncome!))! },
      { label: "+ D&A", value: mean(representative.map(row => row.year.da!))! },
      { label: "− maintenance capex", value: -mean(representative.map(row => row.maintenanceCapex))! },
      { label: "− stock compensation", value: -mean(representative.map(row => row.year.sbc ?? 0))! },
      { label: "= owner earnings", value: normalized },
      { label: "× PV factor", value: midPv / normalized },
      { label: "+ net cash", value: netCash },
      { label: "÷ shares", value: shares },
    ],
  } };
}
