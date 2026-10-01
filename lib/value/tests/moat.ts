import { T } from "../config";
import { grossMargin, investedCapital, last, median, nopat, outcome, present, ratio, roe, roic, tangibleEquity, withZeroDefaults } from "../metrics";
import type { NumericInput } from "../types";

export function run({ years, kind }: NumericInput) {
  years = withZeroDefaults(years);
  const ys = last(years, 10), financial = kind !== "operating";
  const returns = ys.map(y => financial ? roe(y) : roic(y));
  const valid = returns.filter((value): value is number => value !== null), enough = valid.length >= 5;
  const typical = enough ? median(valid) : null;
  // One bad year is allowed; use the second-lowest return.
  const k = T.moat.badYearsAllowed + 1;
  const worst = enough && valid.length >= k ? [...valid].sort((a, b) => a - b)[k - 1] : null;
  // An upper bound on capital can prove a return hurdle without assigning an
  // invented value to undisclosed goodwill. A low bound cannot prove failure.
  const floors=ys.map((y,i)=>{
    if(returns[i]!==null)return returns[i];
    if(financial||y.goodwill!=null||y.equity===null||y.totalDebt===null||y.cash===null||y.cash<0)return null;
    const capital=y.equity+y.totalDebt+(y.debtIncludesLeases?0:y.leaseLiabilities??0),profit=nopat(y);
    return capital>0&&profit!==null&&profit>=0?profit/capital:null;
  });
  const floorValues=present(floors),floorMedian=floorValues.length>=5?median(floorValues):null;
  const floorWorst=floorValues.length>=5?[...floorValues].sort((a,b)=>a-b)[k-1]:null;
  const floorUsed=!financial&&returns.some((n,i)=>n===null&&floors[i]!==null);
  const gm2019 = years.find(y => y.fy === 2019), gm2020 = years.find(y => y.fy === 2020), gm2023 = years.find(y => y.fy === 2023);
  const margin2019 = gm2019 ? grossMargin(gm2019) : null, margin2020 = gm2020 ? grossMargin(gm2020) : null;
  const start = margin2019 === null || margin2020 === null ? null : (margin2019 + margin2020) / 2;
  const end = gm2023 ? grossMargin(gm2023) : null;
  const drop = start === null || end === null ? null : start - end;
  const name = financial ? "roe" : "roic";
  const label = financial ? "Return on tangible equity" : "ROIC";
  return outcome({ key: "moat", metrics: { [`${name}Median`]: typical, [`${name}SecondLowest`]: worst, grossMarginDrop: financial ? null : drop,
    ...(floorUsed?{returnFloorMedian:floorMedian,returnFloorSecondLowest:floorWorst}:{}),
    capitalFallbackYears: ys.filter(y=>{const c=financial?tangibleEquity(y):investedCapital(y);return c!==null&&c<=0;}).length,
    capexToRevenue: median(present(ys.map(y => ratio(y.capex, y.revenue)))) },
    series: { [name]: ys.map((y, i) => [y.fy, returns[i]]), grossMargin: ys.map(y => [y.fy, grossMargin(y)]) },
    checks: [
      { core: true, pass: typical === null ? floorUsed&&floorMedian!==null&&floorMedian>=T.moat.roicMedian?true:null : typical >= (financial ? T.moat.roeMedianFin : T.moat.roicMedian), data: `${label} median`, reason: `${label} median below threshold` },
      { core: true, pass: worst === null ? floorUsed&&floorWorst!==null&&floorWorst>=T.moat.roicSecondLowest?true:null : worst >= (financial ? T.moat.roeSecondLowestFin : T.moat.roicSecondLowest), data: `${label} worst years`, reason: `${label} worst years below threshold (more than ${T.moat.badYearsAllowed} bad year allowed)` },
      ...(!financial ? [{ pass: drop === null ? null : drop <= T.moat.gmDropPp + Number.EPSILON, data: "FY2019, FY2020 and FY2023 gross margins", reason: `FY2023 gross margin fell ${((drop ?? 0) * 100).toFixed(1)}pp versus the FY2019/FY2020 mean (limit ${T.moat.gmDropPp * 100}pp)` }] : []),
    ], reasons: [
      ...(floorUsed?['The return floor includes all equity, debt and leases without deducting cash or goodwill. Only a floor above the hurdle establishes a pass.']:[]),
      ...(!financial && ys.some(y=>{const c=investedCapital(y);return c!==null&&c<=0;}) ? ["Years with nonpositive invested capital use equity plus debt and leases; positive earnings with no positive capital are shown above 100%."] : []),
    ],
  });
}
