import { parentShare } from "./parent-share";
import type { Series, Year } from "./types";

/** A complete cash-flow statement without a capex line proves zero capex only
 * for a business without material fixed assets. When the same year depreciates
 * more than 1% of revenue or carries PPE above 5% of revenue, the line was not
 * extracted: capex is unknown, never zero. Valuation applies this strictly (no
 * value without capex); quality tests keep the published inputs so a missing
 * line cannot silently remove a company from publication. */
export function reportedCapex(year: Year): number | null {
  if (year.capex !== 0 || year.provenance?.capex?.method !== 'absent-in-complete-statement') return year.capex;
  const revenue = year.revenue;
  if (revenue === null || !(revenue > 0)) return null;
  return (year.da ?? 0) > .01 * revenue || (year.ppe ?? 0) > .05 * revenue ? null : 0;
}

/** D&A is replenished inside operating cash flow when capex is under a quarter
 * of D&A and operating cash flow exceeds net income by less than a quarter of
 * D&A: lease merchandise, content or rental fleets bought as operating assets.
 * Adding that D&A back to net income counts the depreciation as free cash. */
function replenishedInOperations(year: Year): boolean {
  const capex = reportedCapex(year);
  return year.da !== null && year.da > 0 && capex !== null && year.ocf !== null && year.netIncome !== null
    && capex < year.da / 4 && year.ocf - year.netIncome < year.da / 4;
}

/** Persistent, not a one-year working-capital swing. A year is in this regime
 * when it shows the pattern and at least two other years within four years of
 * it do too, or when three of the five years ending with it show the pattern
 * (a year whose own vendor D&A is incomplete stays in its business's regime). */
export function operatingReplenishment(years: Year[], fy: number): boolean {
  const shown = years.filter(replenishedInOperations).map(y => y.fy);
  const self = shown.includes(fy) && shown.filter(other => other !== fy && Math.abs(other - fy) <= 4).length >= 2;
  return self || shown.filter(other => other <= fy && other > fy - 5).length >= 3;
}

export function ownerEarningsBridge(years: Year[], { replenished, strictCapex = false }: { replenished?: boolean; strictCapex?: boolean } = {}) {
  const sorted = [...years].sort((a, b) => a.fy - b.fy);
  return sorted.map((original, i) => {
    const capex = strictCapex ? reportedCapex(original) : original.capex;
    const year = capex === original.capex ? original : { ...original, capex };
    const operatingAssets = replenished ?? operatingReplenishment(sorted, year.fy);
    const trailing = sorted.slice(0, i + 1).filter(y => y.fy > year.fy - 5);
    const ratios = trailing.flatMap(y => y.ppe !== null && y.revenue !== null && y.revenue > 0 ? [y.ppe / y.revenue] : []);
    const prev = sorted[i - 1];
    const delta = prev && prev.fy === year.fy - 1 && prev.revenue !== null && year.revenue !== null
      ? year.revenue - prev.revenue : null;
    const growthCapex = delta === null || delta <= 0 ? 0 : ratios.length ? Math.max(0, ratios.reduce((a, b) => a + b, 0) / ratios.length * delta) : null;
    const cashFlowBasis = (operatingAssets || year.netIncome === null || year.da === null || growthCapex === null) && year.ocf !== null && year.capex !== null;
    const maintenanceCapex = year.maintenanceCapexJudgement ?? (cashFlowBasis && (year.da === null || growthCapex === null) ? year.capex : year.capex === null || year.da === null || growthCapex === null ? null : Math.max(year.capex - growthCapex, Math.min(year.capex, year.da)));
    const leaseCashCost = year.leaseCash ?? (year.leaseDepreciationIncluded && (year.leaseLiabilities ?? 0) > 0 ? 0.2 * year.leaseLiabilities! : 0);
    const allocation = parentShare(year);
    const value = year.leaseCashIncomplete || allocation === null || maintenanceCapex === null ? null
      : cashFlowBasis ? (year.ocf! - maintenanceCapex - (year.sbc ?? 0) - leaseCashCost) * allocation
      : operatingAssets || year.netIncome === null || year.da === null ? null : year.netIncome + (year.da - maintenanceCapex - leaseCashCost) * allocation;
    return { year, cashFlowBasis, operatingReplenishment: operatingAssets, growthCapex, maintenanceCapex, leaseCashCost, allocation, value };
  });
}

export function ownerEarningsSeries(years: Year[]): Series {
  return ownerEarningsBridge(years).map(({ year, value }) => [year.fy, value]);
}

/** Same maintenance model with annual capacity context. The increase between
 * overlapping annual/TTM revenue windows is the observed expansion since the
 * annual report, not an invented prior-year TTM cash-flow observation. */
export function trailingOwnerEarnings(years: Year[], trailing: Year) {
  const annual = [...years].filter(y => y.end < trailing.end).sort((a,b) => a.fy-b.fy);
  const context = annual.slice(-5), latest = context.at(-1);
  const ratios = context.flatMap(y => y.ppe !== null && y.revenue !== null && y.revenue > 0 ? [y.ppe/y.revenue] : []);
  const increase = latest?.revenue != null && trailing.revenue !== null ? Math.max(0,trailing.revenue-latest.revenue) : 0;
  const growthCapex = ratios.length ? increase*ratios.reduce((a,b)=>a+b,0)/ratios.length : increase === 0 ? 0 : null;
  const observation = {...trailing};
  delete observation.maintenanceCapexJudgement;
  delete observation.disclosedMaintenanceCapex;
  const capex = reportedCapex(observation);
  if (capex !== null && observation.da !== null && growthCapex !== null)
    observation.maintenanceCapexJudgement = Math.max(capex-growthCapex,Math.min(capex,observation.da));
  // The TTM window inherits the annual regime: one overlapping year cannot
  // show whether D&A is replenished inside operating cash flow.
  const row = ownerEarningsBridge([observation], { replenished: latest ? operatingReplenishment(annual, latest.fy) : false, strictCapex: true })[0];
  return {...row, year:trailing, growthCapex};
}
