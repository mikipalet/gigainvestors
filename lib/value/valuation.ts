import { parentShare } from "./parent-share";
import { T } from "./config";
import { financialBvps, tangibleEquity, cagr, clamp, investment, last, mean, median, nopat, present, ratio, roe, roiic, sum, withZeroDefaults } from "./metrics";
import { ownerEarningsBridge } from "./owner-earnings";
import type { Kind, Valuation, Year, PriceHistory } from "./types";

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

/** Fraction of positive asset additions represented by the acquisition proxy. */
function organicRevenueGrowth(years: Year[], revenueGrowth: number | null): number | null {
  const ys = last(years, 11);
  if (revenueGrowth === null || ys.length !== 11) return null;
  let acquired = 0, added = 0;
  for (let i = 1; i < ys.length; i++) {
    if (ys[i].acquisitions === null || ys[i].totalAssets === null || ys[i - 1].totalAssets === null) return null;
    acquired += Math.max(0, ys[i].acquisitions!);
    added += Math.max(0, ys[i].totalAssets! - ys[i - 1].totalAssets!);
  }
  const share = added > 0 ? Math.min(1, acquired / added) : acquired > 0 ? 1 : 0;
  return revenueGrowth * (1 - share);
}

function postYearSplit(prices: PriceHistory | null, end: string, shareRatio: number): boolean {
  const rows = [...(prices ?? [])].filter(([month, close]) => /^\d{4}-\d{2}$/.test(month) && close > 0 && Number.isFinite(close)).sort(([a], [b]) => a.localeCompare(b));
  const monthIndex = (s: string) => Number(s.slice(0, 4)) * 12 + Number(s.slice(5, 7));
  return rows.some(([month, close], i) => i > 0 && month > end.slice(0, 7)
    && monthIndex(month) - monthIndex(rows[i - 1][0]) === 1
    && (shareRatio > 1 ? close < rows[i - 1][1] : close > rows[i - 1][1])
    && Math.abs(close / rows[i - 1][1] * shareRatio - 1) <= T.integrity.splitPriceTolerance);
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

export function valueCompany({ years, kind, bondYield, cyclical, currency = "", currentShares = null, reportedShares = true, shareAssumptions = [], ttm = null, priceHistory = null }: {
  years: Year[]; kind: Kind; bondYield: number | null; cyclical: boolean; currency?: string; currentShares?: number | null; reportedShares?: boolean; shareAssumptions?: string[]; ttm?: Year | null; priceHistory?: PriceHistory | null;
}): { valuation: Valuation | null; reason: string | null } {
  const ys = withZeroDefaults(years).sort((a, b) => a.fy - b.fy), latest = ys.at(-1);
  if (!latest || latest.dilutedShares === null || latest.dilutedShares <= 0) return { valuation: null, reason: "no share count" };
  const postSplit = reportedShares && currentShares !== null && Number.isFinite(currentShares) && currentShares > 0
    && Math.abs(currentShares / latest.dilutedShares - 1) > 0.1
    && postYearSplit(priceHistory, latest.end, currentShares / latest.dilutedShares);
  const corrected = currentShares !== null && Number.isFinite(currentShares) && currentShares > 0
    && Math.max(currentShares / latest.dilutedShares, latest.dilutedShares / currentShares) > 1.5 || postSplit;
  const shares = corrected ? currentShares : latest.dilutedShares;
  if (bondYield === null || !Number.isFinite(bondYield)) return { valuation: null, reason: "local government bond yield unavailable" };
  const discountRate = Math.max(T.valuation.minDiscount, bondYield + T.valuation.bondSpread);
  const assumptions: string[] = [...shareAssumptions];
  if (latest.edinetShares) assumptions.push(latest.edinetShares.reason);
  if (postSplit) assumptions.push('share count adjusted for post-year split/bonus');
  if (corrected) assumptions.push(`share count corrected to current ${shares}`);
  const priorRevenue = ys.find(y => y.fy === latest.fy - 3)?.revenue;
  const trailing = ttm && ttm.end > latest.end && (!ttm.currency || !currency || ttm.currency === currency) ? ttm : null;
  if (trailing?.sbc === null) assumptions.push('TTM stock compensation not reported; assumed zero');
  else if (trailing?.sbcIncomplete) assumptions.push('TTM stock compensation missing quarters assumed zero; reported quarters retained');
  const currentRevenue = trailing?.revenue ?? latest.revenue;
  const decliningRevenue = currentRevenue !== null && priorRevenue != null && currentRevenue < priorRevenue;
  assumptions.push(trailing ? `TTM ending ${trailing.end}; ${trailing.revenue === null ? "quarterly revenue incomplete; zero-growth rule uses latest annual revenue" : `zero-growth rule compares TTM revenue with FY${latest.fy - 3} revenue`}`
    : 'complete newer TTM unavailable; zero-growth rule uses latest annual revenue');
  assumptions.push(decliningRevenue ? "three-year revenue trend is negative; growth set to zero"
    : "growth set to zero when latest revenue is below three years earlier");
  if (!currency) assumptions.push("reporting currency not supplied");
  const common = { currency, discountRate, terminalGrowth: T.valuation.terminal, bondYield, shares, assumptions };

  if (kind !== "operating") {
    const book = financialBvps({ ...latest, dilutedShares: shares });
    if (book === null || book <= 0) return { valuation: null, reason: "book value not positive" };
    const returns = last(ys, 10).map(roe).filter((value): value is number => value !== null);
    if (returns.length < 5) return { valuation: null, reason: "insufficient return on tangible equity history" };
    const normalizedRoe = median(returns)!;
    const growth = decliningRevenue ? 0 : clamp({ value: decadeCagr(ys.map(y => [y.fy, financialBvps(y)])) ?? 0, min: 0, max: T.valuation.finMaxGrowth });
    if (discountRate <= growth) return { valuation: null, reason: "required return does not exceed perpetual book-value growth" };
    const highRate = discountRate - Math.min(.01, (discountRate - growth) / 2);
    const multiple = (r: number) => clamp({ value: (normalizedRoe - growth) / (r - growth), min: 0, max: 4 });
    if (multiple(discountRate) * book <= 0) return { valuation: null, reason: "justified price to book is zero" };
    return { reason: null, valuation: { ...common, method: "book_value", normalized: book, growth, netCash: 0,
      perShare: { low: multiple(discountRate + 0.01) * book, mid: multiple(discountRate) * book, high: multiple(highRate) * book },
      equityBondYield: ratio(median(present(last(ys, 10).map(y => y.netIncome))), latest.marketCap),
      bridge: [{ label: tangibleEquity(latest)! > 0 ? "tangible book value per share" : "reported book value per share", value: book },
        ...(Number.isFinite(normalizedRoe) ? [{ label: "normalized return on tangible equity", value: normalizedRoe }] : []),
        { label: "justified price to book", value: multiple(discountRate) }],
      assumptions: [...assumptions, "returns use net income divided by tangible equity",
        tangibleEquity(latest)! > 0 ? "valuation uses tangible book value per share" : "nonpositive tangible equity: valuation uses reported book value per share",
        ...(!Number.isFinite(normalizedRoe) ? ["tangible equity is nonpositive: returns effectively unlimited; price to book capped at 4"] : []),
        "cash and debt are included in book value", "equity bond yield uses median net income"],
    } };
  }

  const history = ownerEarningsBridge(ys), window = 5;
  const recent = history.filter(row => row.year.fy > latest.fy - window).filter((row): row is typeof row & { value: number; maintenanceCapex: number } => row.value !== null && row.maintenanceCapex !== null);
  if (recent.length < window) return { valuation: null, reason: "insufficient owner earnings history" };
  const medianEarnings = median(recent.map(row => row.value))!;
  const latestRow = recent.at(-1)!;
  // Full trailing capex is conservative and avoids treating a partial fiscal interval as annual growth capex.
  const ttmRow = trailing ? ownerEarningsBridge([trailing])[0] : null;
  if (ttmRow && ttmRow.value === null) assumptions.push('TTM owner earnings unavailable: quarterly NI, D&A or capex incomplete; annual normalization retained');
  const normalized = Math.min(medianEarnings, latestRow.value, ttmRow?.value ?? Infinity);
  if (normalized <= 0) return { valuation: null, reason: "owner earnings not positive" };
  if (latest.cash === null || latest.totalDebt === null) return { valuation: null, reason: "net cash unavailable" };
  const allocation = parentShare(latest);
  if (allocation === null) return { valuation: null, reason: "Parent share of consolidated earnings unavailable with material minority interests" };
  const netCash = (latest.cash - latest.totalDebt) * allocation;
  if (allocation !== 1 || recent.some(row => row.allocation !== 1)) assumptions.push("Material minority interests: consolidated cash-flow adjustments and net cash allocated by parent net income / total net income; parent net income is already allocated");
  const oeGrowth = decadeCagr(history.map(row => [row.year.fy, ratio(row.value, row.year.dilutedShares)]));
  const revenueGrowth = decadeCagr(ys.map(y => [y.fy, ratio(y.revenue, y.dilutedShares)]));
  const incremental = roiic(ys), reinvestment = reinvestmentRate(ys);
  const organicGrowth = organicRevenueGrowth(ys, revenueGrowth);
  const estimates = present([oeGrowth, revenueGrowth, organicGrowth, incremental === null || reinvestment === null ? null : incremental * reinvestment]);
  const growth = decliningRevenue ? 0 : clamp({ value: estimates.length ? Math.min(...estimates) : 0, min: 0, max: T.valuation.maxGrowth });
  if (discountRate <= T.valuation.terminal) return { valuation: null, reason: "required return does not exceed terminal growth" };
  // Preserve finite scenarios near the perpetuity boundary without flooring the actual rate.
  const highRate = discountRate - Math.min(.01, (discountRate - T.valuation.terminal) / 2);
  const pv = (g: number, r: number) => presentValue({ oe: normalized, g, r, terminal: T.valuation.terminal });
  const midPv = pv(growth, discountRate);
  if ((midPv + netCash) / shares <= 0) return { valuation: null, reason: "debt exceeds the value of owner earnings" };
  if (last(years, window).some(y => y.sbc === null)) assumptions.push("stock compensation not reported");
  if (!estimates.length) assumptions.push("growth estimates unavailable; using zero growth");
  assumptions.push(organicGrowth === null ? 'organic growth proxy unavailable' : 'revenue CAGR reduced by acquisition proxy share of positive assets added over ten years', 'operating growth capped at 8%');
  assumptions.push(`owner earnings normalized over ${window} years`, "growth capex uses trailing five-year PPE to revenue", `owner earnings use the ${window}-year median capped at latest-year owner earnings and complete newer TTM owner earnings`, "maintenance capex floored at the smaller of capex and D&A",
    ttmRow?.value === normalized ? "bridge components use TTM owner earnings; full TTM capex deducted; latest annual lease liabilities used" : normalized < medianEarnings ? "bridge components use the latest owner earnings observation" : "bridge components use the median owner earnings observation");
  if (recent.some(row => row.year.leaseCash != null)) assumptions.push("Reported capitalized lease repayments charged in owner earnings; corresponding lease obligations excluded from debt");
  if (recent.some(row => row.leaseCashCost > 0 && row.year.leaseCash == null)) assumptions.push("lease payments estimated at 20% of lease liabilities");
  const ordered = [...recent].sort((a, b) => a.value - b.value);
  const center = Math.floor(ordered.length / 2);
  const representative = ttmRow?.value === normalized ? [ttmRow as typeof latestRow] : normalized < medianEarnings ? [latestRow] : ordered.length % 2 ? [ordered[center]] : ordered.slice(center - 1, center + 1);
  return { reason: null, valuation: { ...common, method: "owner_earnings", normalized, growth, netCash,
    perShare: { low: (pv(growth / 2, discountRate + 0.01) + netCash) / shares, mid: (midPv + netCash) / shares, high: (pv(growth, highRate) + netCash) / shares },
    equityBondYield: ratio(normalized, latest.marketCap),
    bridge: [
      { label: "net income", value: mean(representative.map(row => row.year.netIncome!))! },
      { label: "+ D&A", value: mean(representative.map(row => row.year.da! * row.allocation!))! },
      { label: "− maintenance capex", value: -mean(representative.map(row => row.maintenanceCapex * row.allocation!))! },
      { label: "− stock compensation", value: -mean(representative.map(row => (row.year.sbc ?? 0) * row.allocation!))! },
      ...(representative.some(row => row.leaseCashCost > 0) ? [{ label: representative.some(row => row.year.leaseCash != null) ? "− lease payments" : "− estimated lease payments", value: -mean(representative.map(row => row.leaseCashCost * row.allocation!))! }] : []),
      { label: "= owner earnings", value: normalized },
      { label: "× PV factor", value: midPv / normalized },
      { label: "+ net cash", value: netCash },
      { label: "÷ shares", value: shares },
    ],
  } };
}
