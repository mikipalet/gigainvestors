import { parentShare } from "./parent-share";
import { T } from "./config";
import { financialBvps, tangibleEquity, cagr, clamp, investment, last, mean, median, nopat, present, ratio, roe, roic, roiic, sum, withZeroDefaults } from "./metrics";
import { ownerEarningsBridge } from "./owner-earnings";
import type { Kind, Valuation, Year, PriceHistory, Volatility } from "./types";


export function presentValue({ oe, g, r, terminal, decadeFade = false }: { oe: number; g: number; r: number; terminal: number; decadeFade?: boolean }): number {
  if (r <= terminal) throw new RangeError("discount rate must exceed terminal growth");
  let earnings = oe, pv = 0;
  for (let t = 1; t <= 10; t++) {
    const growth = decadeFade ? g + (terminal - g) * (t - 1) / 9 : t <= 5 ? g : g + (terminal - g) * (t - 5) / 5;
    earnings *= 1 + growth;
    pv += earnings / (1 + r) ** t;
  }
  return pv + earnings * (1 + terminal) / (r - terminal) / (1 + r) ** 10;
}

/** Winsorise ten annual log returns by replacing the smallest/largest with
 * the adjacent order statistic (10% of observations in each tail).
 * Eleven consecutive positive observations supply a full ten-year CAGR. */
export function compounderGrowth(years: Year[]): number | null {
  const history = ownerEarningsBridge([...years].sort((a,b) => a.fy-b.fy)).slice(-11);
  if (history.length !== 11 || history.some((r,i) => r.value === null || r.value <= 0 || !r.year.dilutedShares || r.year.dilutedShares <= 0 || (i > 0 && r.year.fy !== history[i-1].year.fy + 1))) return null;
  const values = history.map(r => r.value! / r.year.dilutedShares!);
  const logs = values.slice(1).map((v,i) => Math.log(v / values[i]));
  const sorted = [...logs].sort((a,b) => a-b);
  const rate = Math.expm1(mean(logs.map(v => Math.max(sorted[1], Math.min(sorted[8], v))))!);
  return Number.isFinite(rate) ? clamp({value:rate,min:0,max:T.valuation.compounderMaxGrowth}) : null;
}

export function valuationMargin(v: Valuation | null, volatility: Volatility): number {
  const base = v?.tier === 'compounder' ? T.valuation.compounderMos : T.price.requiredMos[volatility];
  return Math.max(base, v?.leverage === 'volatile' ? T.price.requiredMos.volatile : v?.leverage === 'moderate' ? T.price.requiredMos.moderate : 0);
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

export function valueCompany({ years, kind, bondYield, cyclical, currency = "", currentShares = null, reportedShares = true, shareAssumptions = [], shareSource, ttm = null, priceHistory = null, qualityPass = false, version = T.valuation.version }: {
  qualityPass?: boolean; version?: 1 | 2; years: Year[]; kind: Kind; bondYield: number | null; cyclical: boolean; currency?: string; currentShares?: number | null; reportedShares?: boolean; shareAssumptions?: string[]; shareSource?: "yahoo-shares"; ttm?: Year | null; priceHistory?: PriceHistory | null;
}): { valuation: Valuation | null; reason: string | null } {
  const ys = withZeroDefaults(years).sort((a, b) => a.fy - b.fy), latest = ys.at(-1);
  const fallback = latest && !(latest.dilutedShares && latest.dilutedShares > 0) && shareSource === 'yahoo-shares' && reportedShares && currentShares !== null && Number.isFinite(currentShares) && currentShares > 0;
  if (!latest || (!(latest.dilutedShares && latest.dilutedShares > 0) && !fallback)) return { valuation: null, reason: "no share count" };
  const taggedShares = latest.dilutedShares ?? 0;
  const postSplit = !fallback && reportedShares && currentShares !== null && Number.isFinite(currentShares) && currentShares > 0
    && Math.abs(currentShares / taggedShares - 1) > 0.1
    && postYearSplit(priceHistory, latest.end, currentShares / taggedShares);
  const corrected = !fallback && currentShares !== null && Number.isFinite(currentShares) && currentShares > 0
    && Math.max(currentShares / taggedShares, taggedShares / currentShares) > 1.5 || postSplit;
  const shares = (fallback || corrected ? currentShares : latest.dilutedShares)!;
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
  const common = { version, ...(fallback ? { sharesSource: shareSource } : {}), currency, discountRate, terminalGrowth: T.valuation.terminal, bondYield, shares, assumptions };

  if (kind !== "operating") {
    const book = version === 2 ? ratio(tangibleEquity(latest), shares) : financialBvps({ ...latest, dilutedShares: shares });
    if (book === null || book <= 0) return { valuation: null, reason: "book value not positive" };
    const returns = last(ys, 10).map(roe).filter((value): value is number => value !== null && (version === 1 || Number.isFinite(value)));
    if (returns.length < 5) return { valuation: null, reason: "insufficient return on tangible equity history" };
    const normalizedRoe = version === 2 ? clamp({value:median(returns)!,min:0,max:T.valuation.finMaxRoe}) : median(returns)!;
    if (normalizedRoe <= 0) return {valuation:null,reason:"justified price to book is zero"};
    // Use original observations: zero defaults must not invent a dividend payout.
    const retentions = last([...years].sort((a,b)=>a.fy-b.fy),10).flatMap(y => y.netIncome !== null && y.netIncome > 0 && y.dividendsPaid !== null
      ? [clamp({value:1-y.dividendsPaid/y.netIncome,min:0,max:1})] : []);
    if (version === 2 && retentions.length < 5) return {valuation:null,reason:'insufficient dividend payout history'};
    const retention = median(retentions) ?? 0;
    const growth = version === 2 ? decliningRevenue ? 0 : Math.min(T.valuation.finMaxGrowth, normalizedRoe * retention) : decliningRevenue ? 0 : clamp({ value: decadeCagr(ys.map(y => [y.fy, financialBvps(y)])) ?? 0, min: 0, max: T.valuation.finMaxGrowth });
    if (discountRate <= growth) return { valuation: null, reason: "required return does not exceed perpetual book-value growth" };
    const highRate = discountRate - Math.min(.01, (discountRate - growth) / 2);
    const multiple = (r: number) => clamp({ value: (normalizedRoe - growth) / (r - growth), min: 0, max: 4 });
    if (multiple(discountRate) * book <= 0) return { valuation: null, reason: "justified price to book is zero" };
    return { reason: null, valuation: { ...common, ...(version === 2 ? {financialReturn:{roe:normalizedRoe,retention,payout:normalizedRoe > 0 ? 1-growth/normalizedRoe : 0,cashPerShare:book*(normalizedRoe-growth)}} : {}), method: "book_value", normalized: book, growth, netCash: 0,
      perShare: { low: multiple(discountRate + 0.01) * book, mid: multiple(discountRate) * book, high: multiple(highRate) * book },
      equityBondYield: ratio(median(present(last(ys, 10).map(y => y.netIncome))), latest.marketCap),
      bridge: [{ label: tangibleEquity(latest)! > 0 ? "tangible book value per share" : "reported book value per share", value: book },
        ...(Number.isFinite(normalizedRoe) ? [{ label: "normalized return on tangible equity", value: normalizedRoe }] : []),
        { label: "justified price to book", value: multiple(discountRate) }],
      assumptions: [...assumptions, ...(version === 2 ? ['sustainable tangible ROE: ten-year median capped at 25%; at least five finite observations', 'growth = sustainable ROE × median dividend retention, capped at 6%; residual earnings distributable', 'expected return = distributable earnings / price + sustainable growth; retained earnings counted once'] : []), "returns use net income divided by tangible equity",
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
  if (version === 2 && (latest.revenue === null || latest.revenue < 0)) return {valuation:null,reason:'operating cash reserve unavailable'};
  const netDebt = (latest.totalDebt - latest.cash) * allocation;
  const netCash = version === 2 ? Math.max(0, latest.cash - T.valuation.operatingCashRatio * latest.revenue!) * allocation : -netDebt;
  const debtYears = netDebt / normalized;
  const leverage = version === 1 || debtYears <= T.valuation.leverageModerate ? 'normal' : debtYears > T.valuation.leverageVolatile ? 'volatile' : 'moderate';
  const riskFlags = leverage === 'normal' ? [] : [leverage === 'volatile' ? 'High leverage: net debt exceeds 5 years of owner earnings' : 'Elevated leverage: net debt exceeds 3 years of owner earnings'];
  if (version === 2) assumptions.push('equity owner earnings are after interest; debt is reflected in leverage risk, never deducted a second time', 'only cash above 2% of revenue is added to equity value');
  if (allocation !== 1 || recent.some(row => row.allocation !== 1)) assumptions.push("Material minority interests: consolidated cash-flow adjustments and cash adjustment allocated by parent net income / total net income; parent net income is already allocated");
  const oeGrowth = decadeCagr(history.map(row => [row.year.fy, ratio(row.value, row.year.dilutedShares)]));
  const revenueGrowth = decadeCagr(ys.map(y => [y.fy, ratio(y.revenue, y.dilutedShares)]));
  const incremental = roiic(ys), reinvestment = reinvestmentRate(ys);
  const organicGrowth = organicRevenueGrowth(ys, revenueGrowth);
  const estimates = present([oeGrowth, revenueGrowth, organicGrowth, incremental === null || reinvestment === null ? null : incremental * reinvestment]);
  const finiteRoic = last(ys,10).map(roic).filter((r): r is number => r !== null && Number.isFinite(r));
  const ownGrowth = version === 2 && qualityPass && finiteRoic.length >= 8 && median(finiteRoic)! >= T.valuation.compounderMinRoic ? compounderGrowth(ys) : null;
  const tier = ownGrowth !== null ? 'compounder' : 'standard';
  const growth = decliningRevenue ? 0 : ownGrowth ?? clamp({ value: estimates.length ? Math.min(...estimates) : 0, min: 0, max: T.valuation.maxGrowth });
  if (discountRate <= T.valuation.terminal) return { valuation: null, reason: "required return does not exceed terminal growth" };
  // Preserve finite scenarios near the perpetuity boundary without flooring the actual rate.
  const highRate = discountRate - Math.min(.01, (discountRate - T.valuation.terminal) / 2);
  const pv = (g: number, r: number) => presentValue({ oe: normalized, g, r, terminal: T.valuation.terminal, decadeFade: tier === 'compounder' });
  const midPv = pv(growth, discountRate);
  if ((midPv + netCash) / shares <= 0) return { valuation: null, reason: "debt exceeds the value of owner earnings" };
  if (last(years, window).some(y => y.sbc === null)) assumptions.push("stock compensation not reported");
  if (!estimates.length && tier !== 'compounder') assumptions.push("growth estimates unavailable; using zero growth");
  assumptions.push(organicGrowth === null ? 'organic growth proxy unavailable' : 'revenue CAGR reduced by acquisition proxy share of positive assets added over ten years', tier === 'compounder' ? 'durable compounder: winsorised ten-year per-share owner-earnings CAGR capped at 12%, fading to 3% over ten years' : 'operating growth capped at 8%');
  assumptions.push(`owner earnings normalized over ${window} years`, "growth capex uses trailing five-year PPE to revenue", `owner earnings use the ${window}-year median capped at latest-year owner earnings and complete newer TTM owner earnings`, "maintenance capex floored at the smaller of capex and D&A",
    ttmRow?.value === normalized ? "bridge components use TTM owner earnings; full TTM capex deducted; latest annual lease liabilities used" : normalized < medianEarnings ? "bridge components use the latest owner earnings observation" : "bridge components use the median owner earnings observation");
  if (recent.some(row => row.year.leaseCash != null)) assumptions.push("Reported capitalized lease repayments charged in owner earnings; corresponding lease obligations excluded from debt");
  if (recent.some(row => row.leaseCashCost > 0 && row.year.leaseCash == null)) assumptions.push("lease payments estimated at 20% of lease liabilities");
  if (recent.some(row=>row.cashFlowBasis)) assumptions.push("Cash-flow owner earnings deduct all capital spending");
  const ordered = [...recent].sort((a, b) => a.value - b.value);
  const center = Math.floor(ordered.length / 2);
  const representative = ttmRow?.value === normalized ? [ttmRow as typeof latestRow] : normalized < medianEarnings ? [latestRow] : ordered.length % 2 ? [ordered[center]] : ordered.slice(center - 1, center + 1);
  return { reason: null, valuation: { ...common, tier, netDebt, leverage, riskFlags, method: "owner_earnings", normalized, growth, netCash,
    perShare: { low: (pv(growth / 2, discountRate + 0.01) + netCash) / shares, mid: (midPv + netCash) / shares, high: (pv(growth, highRate) + netCash) / shares },
    equityBondYield: ratio(normalized, latest.marketCap),
    bridge: [
      ...(representative.some(row=>row.cashFlowBasis) ? [{ label: "cash before maintenance investment", value: mean(representative.map(row=>row.cashFlowBasis ? row.year.ocf! * row.allocation! : row.year.netIncome! + row.year.da! * row.allocation!))! }] : [
        { label: "net income", value: mean(representative.map(row => row.year.netIncome!))! },
        { label: "+ D&A", value: mean(representative.map(row => row.year.da! * row.allocation!))! },
      ]),
      { label: "− maintenance capex", value: -mean(representative.map(row => row.maintenanceCapex * row.allocation!))! },
      { label: "− stock compensation", value: -mean(representative.map(row => (row.year.sbc ?? 0) * row.allocation!))! },
      ...(representative.some(row => row.leaseCashCost > 0) ? [{ label: representative.some(row => row.year.leaseCash != null) ? "− lease payments" : "− estimated lease payments", value: -mean(representative.map(row => row.leaseCashCost * row.allocation!))! }] : []),
      { label: "= owner earnings", value: normalized },
      { label: "× PV factor", value: midPv / normalized },
      { label: version === 2 ? "+ excess cash" : "+ net cash", value: netCash },
      { label: "÷ shares", value: shares },
    ],
  } };
}
