import { parentShare } from "./parent-share";
import type { Series, Year } from "./types";

export function ownerEarningsBridge(years: Year[]) {
  const sorted = [...years].sort((a, b) => a.fy - b.fy);
  return sorted.map((year, i) => {
    const trailing = sorted.slice(0, i + 1).filter(y => y.fy > year.fy - 5);
    const ratios = trailing.flatMap(y => y.ppe !== null && y.revenue !== null && y.revenue > 0 ? [y.ppe / y.revenue] : []);
    const prev = sorted[i - 1];
    const delta = prev && prev.fy === year.fy - 1 && prev.revenue !== null && year.revenue !== null
      ? year.revenue - prev.revenue : null;
    const growthCapex = delta === null || delta <= 0 ? 0 : ratios.length ? Math.max(0, ratios.reduce((a, b) => a + b, 0) / ratios.length * delta) : null;
    const cashFlowBasis = (year.netIncome === null || year.da === null || growthCapex === null) && year.ocf !== null && year.capex !== null;
    const maintenanceCapex = year.maintenanceCapexJudgement ?? (cashFlowBasis && (year.da === null || growthCapex === null) ? year.capex : year.capex === null || year.da === null || growthCapex === null ? null : Math.max(year.capex - growthCapex, Math.min(year.capex, year.da)));
    const leaseCashCost = year.leaseCash ?? (year.leaseDepreciationIncluded && (year.leaseLiabilities ?? 0) > 0 ? 0.2 * year.leaseLiabilities! : 0);
    const allocation = parentShare(year);
    const value = year.leaseCashIncomplete || allocation === null || maintenanceCapex === null ? null
      : cashFlowBasis ? (year.ocf! - maintenanceCapex - (year.sbc ?? 0) - leaseCashCost) * allocation
      : year.netIncome === null || year.da === null ? null : year.netIncome + (year.da - maintenanceCapex - leaseCashCost) * allocation;
    return { year, cashFlowBasis, growthCapex, maintenanceCapex, leaseCashCost, allocation, value };
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
  if (observation.capex !== null && observation.da !== null && growthCapex !== null)
    observation.maintenanceCapexJudgement = Math.max(observation.capex-growthCapex,Math.min(observation.capex,observation.da));
  const row = ownerEarningsBridge([observation])[0];
  return {...row, year:trailing, growthCapex};
}
