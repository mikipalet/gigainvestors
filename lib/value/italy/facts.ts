import { deriveYears } from '../derive';
import { T } from "../config";
import type { Year } from "../types";

interface XbrlFact {
  value: string | number | null;
  decimals?: number | string;
  dimensions: Record<string, string>;
}
export interface XbrlReport {
  documentInfo: { namespaces: Record<string, string> };
  facts: Record<string, XbrlFact>;
}
const fields = {
  deposits: ['DepositsFromCustomers'],
  loans: ['LoansAndAdvancesToCustomers'],
  creditLossProvision: ['ImpairmentLossOnFinancialAssets'],
  preferredEquity: ['PreferenceShares'],
  insuranceReserves: ['InsuranceContractLiabilities'],
  revenue: ["Revenue", "RevenueFromContractsWithCustomers"],
  grossProfit: ["GrossProfit"],
  costOfSales: ["CostOfSales"],
  operatingExpenses: ["OperatingExpense"],
  retainedEarnings: ["RetainedEarnings"],
  shortTermDebt: ["CurrentBorrowings"],
  dilutedEps: ["DilutedEarningsLossPerShare"],
  operatingIncome: ["ProfitLossFromOperatingActivities"],
  preTaxIncome: ["ProfitLossBeforeTax"],
  taxExpense: ["IncomeTaxExpenseContinuingOperations"],
  netIncome: ["ProfitLossAttributableToOwnersOfParent", "ProfitLoss"],
  totalNetIncome: ["ProfitLoss"],
  interestExpense: ["InterestExpense", "FinanceCosts"],
  da: [
    "DepreciationAndAmortisationExpense",
    "AdjustmentsForDepreciationAndAmortisationExpense",
  ],
  sbc: ["SharebasedPaymentExpense", "AdjustmentsForSharebasedPayments"],
  nonRecurring: ["RestructuringExpense"],
  ocf: ["CashFlowsFromUsedInOperatingActivities"],
  dividendsPaid: [
    "DividendsPaidToEquityHoldersOfParentClassifiedAsFinancingActivities",
    "DividendsPaidClassifiedAsFinancingActivities",
    "DividendsPaid",
  ],
  buybacks: [
    "PaymentsToAcquireOrRedeemEntitysShares",
    "PurchaseOfTreasuryShares",
  ],
  issuance: ["ProceedsFromIssuingShares"],
  acquisitions: ["PurchaseOfSubsidiariesNetOfCashAcquired"],
  receivables: [
    "TradeAndOtherCurrentReceivables",
    "CurrentTradeReceivables",
    "TradeAndOtherReceivables",
  ],
  inventory: ["Inventories"],
  payables: ["TradeAndOtherCurrentPayables", "TradeAndOtherPayables"],
  cash: ["CashAndCashEquivalents"],
  equity: ["EquityAttributableToOwnersOfParent", "Equity"],
  minorityInterest: ["NoncontrollingInterests"],
  goodwill: ["Goodwill"],
  intangibles: ["IntangibleAssetsOtherThanGoodwill"],
  ppe: ["PropertyPlantAndEquipment"],
  totalAssets: ["Assets"],
  totalLiabilities: ["Liabilities"],
  liabilitiesAndStockholdersEquity: ["EquityAndLiabilities"],
  currentAssets: ["CurrentAssets"],
  currentLiabilities: ["CurrentLiabilities"],
  dilutedShares: [
    "AdjustedWeightedAverageShares",
    "WeightedAverageNumberOfDilutedSharesOutstanding",
    "WeightedAverageNumberOfSharesOutstanding",
    "NumberOfSharesOutstanding",
  ],
  basicEps: ["BasicEarningsLossPerShare"],
  sharesOutstanding: ["NumberOfSharesOutstanding"],
} as const;
const instant = new Set(["deposits", "loans", "preferredEquity", "insuranceReserves",
  "retainedEarnings",
  "shortTermDebt",
  "receivables",
  "inventory",
  "payables",
  "cash",
  "equity",
  "minorityInterest",
  "goodwill",
  "intangibles",
  "ppe",
  "totalAssets",
  "totalLiabilities",
  "liabilitiesAndStockholdersEquity",
  "currentAssets",
  "currentLiabilities",
  "sharesOutstanding",
]);
const spent = new Set([
  "capex",
  "dividendsPaid",
  "buybacks",
  "issuance",
  "acquisitions",
]);
const baseDimensions = new Set([
  "concept",
  "entity",
  "period",
  "unit",
  "language",
]);
function consolidated(f: XbrlFact): boolean {
  return Object.entries(f.dimensions).every(
    ([k, v]) =>
      baseDimensions.has(k) ||
      (k.endsWith(":ConsolidatedAndSeparateFinancialStatementsAxis") &&
        v.endsWith(":ConsolidatedMember")),
  );
}
function endDate(period: string): string | null {
  const time = Date.parse(period.split("/").at(-1)!);
  return Number.isFinite(time)
    ? new Date(time - 1).toISOString().slice(0, 10)
    : null;
}
/** XBRL-JSON values are canonical, already scaled; decimals describe precision, never scale. */
export function yearsFromEsef({
  raw,
  lei,
}: {
  raw: XbrlReport;
  lei: string;
}): Year[] {
  if (!raw?.facts || !raw.documentInfo?.namespaces)
    throw new Error("Invalid XBRL-JSON report");
  const prefixes = new Set(
    Object.entries(raw.documentInfo.namespaces)
      .filter(([, uri]) =>
        /^https?:\/\/xbrl\.ifrs\.org\/taxonomy\/.+\/ifrs-full$/.test(uri),
      )
      .map(([p]) => p),
  );
  const prefix=[...prefixes][0];
  const equivalents:XbrlFact[]=Object.values(raw.facts).flatMap((f):XbrlFact[]=>{
    const dimensions={...f.dimensions},local=dimensions.concept?.split(':').at(-1);
    const axis=Object.keys(dimensions).find(k=>k.endsWith(':ComponentsOfEquityAxis'));
    const member=axis?dimensions[axis].split(':').at(-1):null;
    let concept:string|undefined;
    if(prefixes.has(dimensions.concept?.split(':')[0])&&axis){
      if(member==='EquityAttributableToOwnersOfParentMember'&&local==='Equity')concept='EquityAttributableToOwnersOfParent';
      if(member==='EquityAttributableToOwnersOfParentMember'&&local==='ProfitLoss')concept='ProfitLossAttributableToOwnersOfParent';
      if(member==='NoncontrollingInterestsMember'&&local==='Equity')concept='NoncontrollingInterests';
      if(concept)delete dimensions[axis];
    }else if(!prefixes.has(dimensions.concept?.split(':')[0])){
      concept=({TotalEquity:'Equity',TotalEquityAttributableToOwnersOfParent:'EquityAttributableToOwnersOfParent',OfWhichGoodwill:'Goodwill'} as Record<string,string>)[local??''];
    }
    return concept&&prefix?[{...f,dimensions:{...dimensions,concept:`${prefix}:${concept}`}}]:[];
  });
  const facts = [...Object.values(raw.facts),...equivalents].filter(
    (f) =>
      consolidated(f) &&
      f.dimensions.entity?.split(":").at(-1) === lei &&
      prefixes.has(f.dimensions.concept?.split(":")[0]) &&
      f.value !== null &&
      String(f.value).trim() !== "" &&
      Number.isFinite(Number(f.value)),
  );
  const annual = facts.filter((f) => {
    const p = f.dimensions.period?.split("/");
    if (p?.length !== 2) return false;
    const days = (Date.parse(p[1]) - Date.parse(p[0])) / 86400000;
    return days >= T.esef.minAnnualDays && days <= T.esef.maxAnnualDays;
  });
  const ends = [
    ...new Set(
      annual
        .map((f) => endDate(f.dimensions.period))
        .filter((s): s is string => !!s),
    ),
  ].sort();
  return ends
    .map((end) => {
      const duration = annual.filter(
        (f) => endDate(f.dimensions.period) === end,
      );
      const balance = facts.filter(
        (f) =>
          !f.dimensions.period.includes("/") &&
          endDate(f.dimensions.period) === end,
      );
      const currencies = duration
        .map((f) => f.dimensions.unit)
        .filter((u) => /^iso4217:[A-Z]{3}$/.test(u));
      const unit = [...new Set(currencies)].sort(
        (a, b) =>
          currencies.filter((u) => u === b).length -
          currencies.filter((u) => u === a).length,
      )[0];
      const currency = unit?.split(":")[1] ?? null;
      const pick = ({
        names,
        stock = false,
        shares = false,
        eps = false,
      }: {
        names: readonly string[];
        stock?: boolean;
        shares?: boolean;
        eps?: boolean;
      }): number | null => {
        for (const name of names) {
          const pool =
            name === "NumberOfSharesOutstanding"
              ? balance
              : stock
                ? balance
                : duration;
          const matches = pool.filter(
            (f) =>
              f.dimensions.concept.split(":")[1] === name &&
              (shares
                ? f.dimensions.unit === "xbrli:shares"
                : eps
                  ? f.dimensions.unit === `${unit}/xbrli:shares`
                  : f.dimensions.unit === unit),
          );
          if (!matches.length) continue;
          // Duplicates with different precision are allowed only when their rounding intervals overlap.
          const precise = [...matches].sort(
            (a, b) =>
              Number(b.decimals ?? Infinity) - Number(a.decimals ?? Infinity),
          )[0];
          const value = Number(precise.value);
          if (
            matches.some(
              (f) =>
                Math.abs(Number(f.value) - value) >
                (Number.isFinite(Number(f.decimals))
                  ? 0.5 * 10 ** -Number(f.decimals)
                  : 0) +
                  (Number.isFinite(Number(precise.decimals))
                    ? 0.5 * 10 ** -Number(precise.decimals)
                    : 0),
            )
          )
            return null;
          return value;
        }
        return null;
      };
      const y = {
        fy: Number(end.slice(0, 4)),
        end,
        currency,
        capex: null,
        totalDebt: null,
        marketCap: null,
      } as Year;
      for (const [key, names] of Object.entries(fields)) {
        let value = pick({
          names,
          stock: instant.has(key),
          shares: key === "dilutedShares" || key === "sharesOutstanding",
          eps: key === "basicEps" || key === "dilutedEps",
        });
        if (value !== null && spent.has(key)) value = Math.abs(value);
        Object.assign(y, { [key]: value });
      }
      const sum = (values: (number | null)[]) =>
        values.every((v) => v !== null)
          ? values.reduce<number>((s, v) => s + v!, 0)
          : null;
      y.da ??= sum([
        pick({
          names: ["DepreciationExpense", "AdjustmentsForDepreciationExpense"],
        }),
        pick({
          names: ["AmortisationExpense", "AdjustmentsForAmortisationExpense"],
        }),
      ]);
      y.capex = pick({
        names: [
          "PurchaseOfPropertyPlantAndEquipmentAndIntangibleAssets",
          "PurchaseOfPropertyPlantAndEquipmentAndIntangibleAssetsClassifiedAsInvestingActivities",
        ],
      });
      y.capex ??= sum(
        [
          pick({
            names: [
              "PurchaseOfPropertyPlantAndEquipment",
              "PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities",
            ],
          }),
          pick({
            names: [
              "PurchaseOfIntangibleAssets",
              "PurchaseOfIntangibleAssetsClassifiedAsInvestingActivities",
            ],
          }),
        ].map((v) => (v === null ? null : Math.abs(v))),
      );
      if (y.capex !== null) y.capex = Math.abs(y.capex);
      y.totalDebt =
        pick({ names: ["Borrowings"], stock: true }) ??
        sum([
          pick({ names: ["CurrentBorrowings"], stock: true }),
          pick({
            names: ["NoncurrentBorrowings", "LongtermBorrowings"],
            stock: true,
          }),
        ]);
      y.totalDebt ??= sum([
        pick({ names: ["ShorttermBorrowings"], stock: true }),
        pick({ names: ["CurrentPortionOfLongtermBorrowings"], stock: true }),
        pick({
          names: ["LongtermBorrowings", "NoncurrentBorrowings"],
          stock: true,
        }),
      ]);
      // Keep EPS for auditing; rounded EPS is not an exact share-count source.
      y.cashAndCashEquivalents = y.cash;
      if (
        y.equity !== null &&
        pick({ names: ["EquityAttributableToOwnersOfParent"], stock: true }) ===
          null &&
        y.minorityInterest != null
      )
        y.equity -= y.minorityInterest;
      y.statementCoverage={income:y.operatingIncome!==null&&y.netIncome!==null&&y.costOfSales!=null,balance:y.totalAssets!==null&&y.totalLiabilities!==null&&y.equity!==null,cashFlow:y.ocf!==null&&duration.some(f=>/InvestingActivities$/.test(f.dimensions.concept))&&duration.some(f=>/FinancingActivities$/.test(f.dimensions.concept))};
      y.provenance=Object.fromEntries(Object.keys(fields).filter(k=>typeof y[k as keyof Year]==='number').map(k=>[k,{source:`ESEF ${lei}`,field:k,method:'reported' as const}]));
      if(pick({names:['ProfitLossAttributableToOwnersOfParent']})===null){
        const total=pick({names:['ProfitLoss']}),continuing=pick({names:['ProfitLossFromContinuingOperations']});
        const minority=pick({names:['ProfitLossAttributableToNoncontrollingInterests']})
          ?? (total!==null&&total===continuing?pick({names:['ProfitLossFromContinuingOperationsAttributableToNoncontrollingInterests']}):null);
        if(total!==null&&minority!==null){y.netIncome=total-minority;y.provenance.netIncome={source:`ESEF ${lei}`,field:'netIncome',method:'derived',inputs:['consolidated profit less reported non-controlling profit']};}
      }
      return deriveYears([y])[0];
    })
    .filter(
      (y) => y.revenue !== null || y.netIncome !== null || y.ocf !== null,
    );
}
/** Newer filings restate comparatives; absent comparative balance facts must not erase older facts. */
export function mergeEsefYears(older: Year[], newer: Year[]): Year[] {
  const years = new Map(older.map((y) => [y.fy, y]));
  for (const year of newer) {
    const old = years.get(year.fy);
    years.set(
      year.fy,
      old?.currency === year.currency
        ? ({
            ...old,
            ...Object.fromEntries(
              Object.entries(year).filter(([, v]) => v !== null),
            ),
          } as Year)
        : year,
    );
  }
  return [...years.values()].sort((a, b) => a.fy - b.fy);
}
