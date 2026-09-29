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
    const maintenanceCapex = year.capex === null || year.da === null || growthCapex === null ? null : Math.max(year.capex - growthCapex, Math.min(year.capex, year.da));
    const leaseCashCost = year.leaseCash ?? (year.leaseDepreciationIncluded && (year.leaseLiabilities ?? 0) > 0 ? 0.2 * year.leaseLiabilities! : 0);
    const allocation = parentShare(year);
    const value = year.leaseCashIncomplete || allocation === null || year.netIncome === null || year.da === null || maintenanceCapex === null
      ? null : year.netIncome + (year.da - maintenanceCapex - (year.sbc ?? 0) - leaseCashCost) * allocation!;
    return { year, growthCapex, maintenanceCapex, leaseCashCost, allocation, value };
  });
}

export function ownerEarningsSeries(years: Year[]): Series {
  return ownerEarningsBridge(years).map(({ year, value }) => [year.fy, value]);
}

export function ownerEarnings(year: Year, prev?: Year): number | null {
  return ownerEarningsSeries(prev ? [prev, year] : [year]).at(-1)?.[1] ?? null;
}
