import { deriveYears } from '../derive';
import { filedShareChange, reconcileEdinetShares } from "./shares";
import { usGaapStatementRows } from "./us-gaap-text";
import type { SectionKey, Year } from "../types";
import { htmlToText } from "../reports/html-to-text";
import { SECTION_TOKENS, truncateTokens } from "../reports/cut-sections";

export interface EdinetRow { element: string; context: string; unit: string | null; value: string }
/** EDINET TSV is quoted CSV: cells can contain literal tabs and line breaks. */
export function parseEdinetCsv(tsv: string): EdinetRow[] {
  const records: string[][] = []; let record: string[] = []; let cell = ""; let quoted = false;
  const source = tsv.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (c === "\t" || c === "\n")) {
      record.push(cell.replace(/\r$/, "")); cell = "";
      if (c === "\n") { records.push(record); record = []; }
    } else cell += c;
  }
  if (cell || record.length) { record.push(cell.replace(/\r$/, "")); records.push(record); }
  const headers = records.shift() ?? [];
  const at = (r: string[], name: string) => r[headers.indexOf(name)] ?? "";
  return records.filter(r => at(r, "要素ID")).map(r => ({ element: at(r,"要素ID"), context: at(r,"コンテキストID"), unit: at(r,"単位") || null, value: at(r,"値") }));
}
const local = (r: EdinetRow) => r.element.split(":").at(-1)!;
export function edinetFact(rows: EdinetRow[], name: string): string | null { return rows.find(r => local(r) === name)?.value ?? null; }
const fields = {
  revenue: ["RevenueIFRSSummaryOfBusinessResults", "RevenuesUSGAAPSummaryOfBusinessResults", "NetSalesSummaryOfBusinessResults", "OperatingRevenue1SummaryOfBusinessResults", "Revenue2IFRS", "RevenueIFRS", "NetSales", "OperatingRevenue1", "OperatingRevenuesIFRSKeyFinancialData", "TotalNetRevenuesIFRS", "SalesRevenuesIFRS", "RevenuesUSGAAP", "NetSalesUSGAAP"],
  costOfSales: ["CostOfSalesIFRS", "CostOfSales", "CostOfSalesUSGAAP", "CostOfRevenue"],
  grossProfit: ["GrossProfitIFRSSummaryOfBusinessResults", "GrossProfitIFRS", "GrossProfit"],
  operatingIncome: ["OperatingProfitLossIFRS", "OperatingIncome", "OperatingIncomeUSGAAP"],
  // OrdinaryIncomeLoss excludes extraordinary items, so it is not a pretax-profit proxy.
  preTaxIncome: ["ProfitLossBeforeTaxUSGAAPSummaryOfBusinessResults", "ProfitLossBeforeTaxIFRS", "IncomeBeforeIncomeTaxes"],
  taxExpense: ["IncomeTaxExpenseIFRS", "IncomeTaxes"],
  netIncome: ["NetIncomeLossAttributableToOwnersOfParentUSGAAPSummaryOfBusinessResults", "ProfitLossAttributableToOwnersOfParentIFRSSummaryOfBusinessResults", "ProfitLossAttributableToOwnersOfParentSummaryOfBusinessResults", "NetIncomeLossSummaryOfBusinessResults", "ProfitLossAttributableToOwnersOfParentIFRS", "ProfitLossAttributableToOwnersOfParent", "NetIncome"],
  totalNetIncome: ["ProfitLossIFRS", "ProfitLoss", "NetIncomeLossUSGAAP"],
  interestExpense: ["InterestExpensesIFRS", "InterestExpenses", "InterestPaidOpeCFIFRS"],
  da: ["DepreciationAndAmortizationOpeCFIFRS", "DepreciationExpenseOpeCFIFRS", "DepreciationAndAmortizationOpeCF", "DepreciationAndAmortization", "Depreciation", "DepreciationAndAmortizationUSGAAP", "DepreciationAndAmortizationOpeCFUSGAAP", "DepreciationDepletionAndAmortization", "DepreciationAndOtherAmortizationOpeCF", "DepreciationAndAmortizationOfIntangibleAssetsOpeCFIFRS"],
  sbc: ["ShareBasedPaymentExpenseOpeCFIFRS", "ShareBasedPaymentExpensesIFRS", "ShareBasedCompensationOpeCF", "StockBasedCompensation", "ShareBasedCompensation", "ShareBasedCompensationOpeCFUSGAAP", "ShareBasedCompensationExpensesOpeCF", "ShareBasedPaymentExpensesOpeCFIFRS", "EquitySettledShareBasedCompensationOpeCFIFRS"],
  nonRecurring: ["RestructuringExpenses", "BusinessRestructuringExpenses", "RestructuringCostsIFRS"],
  retainedEarnings: ["RetainedEarnings", "RetainedEarningsIFRS"],
  ocf: ["CashFlowsFromUsedInOperatingActivitiesUSGAAPSummaryOfBusinessResults", "CashFlowsFromUsedInOperatingActivitiesIFRSSummaryOfBusinessResults", "CashFlowsFromUsedInOperatingActivitiesSummaryOfBusinessResults", "CashFlowsFromUsedInOperatingActivitiesIFRS", "NetCashProvidedByUsedInOperatingActivitiesIFRS", "NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivitiesUSGAAP", "NetCashProvidedByUsedInOperatingActivitiesSummaryOfBusinessResults"],
  capex: ["PurchaseOfPropertyPlantAndEquipmentInvCFIFRS", "PurchaseOfPropertyPlantAndEquipmentInvCF", "PurchaseOfPropertyPlantAndEquipmentAndIntangibleAssetsInvCFIFRS", "PurchaseOfPropertyPlantAndEquipmentAndIntangibleAssetsInvCF", "PurchaseOfNoncurrentAssetsInvCF", "PurchaseOfPropertyPlantAndEquipmentInvCFUSGAAP", "PurchasesOfPropertyPlantAndEquipment", "PaymentsToAcquirePropertyPlantAndEquipment", "PurchaseOfPropertyPlantEquipmentAndTheIncreaseOfConstructionInProgressInvCF"],
  leaseCash: ["RepaymentsOfLeaseObligationsFinCFIFRS", "RepaymentsOfLeaseObligationsFinCF", "RepaymentsOfLeaseLiabilitiesFinCFIFRS", "RepaymentsOfFinanceLeaseObligationsFinCF"],
  dividendsPaid: ["DividendsPaidFinCFIFRS", "CashDividendsPaidFinCF", "DividendsPaidFinCF"],
  buybacks: ["PurchaseOfTreasurySharesFinCFIFRS", "PurchaseOfTreasuryStockFinCF"],
  issuance: ["ProceedsFromIssuanceOfSharesFinCFIFRS", "ProceedsFromIssuanceOfCommonSharesFinCF"],
  acquisitions: ["PaymentsForAcquisitionOfBusinessesInvCFIFRS", "PurchaseOfSharesOfSubsidiariesResultingInChangeInScopeOfConsolidationInvCF"],
  receivables: ["TradeAndOtherReceivablesCAIFRS", "NotesAndAccountsReceivableTrade", "NotesAndAccountsReceivableTradeAndContractAssets", "NotesAndAccountsReceivableTradeAndContractAssetsCA", "NotesAndAccountsReceivableTradeCA"],
  inventory: ["InventoriesCAIFRS", "Inventories"],
  payables: ["TradeAndOtherPayablesCLIFRS", "NotesAndAccountsPayableTrade"],
  cash: [],
  cashAndDeposits: ["CashAndDeposits"],
  cashAndCashEquivalents: ["CashAndCashEquivalentsIFRS", "CashAndCashEquivalents", "CashAndCashEquivalentsUSGAAP", "CashAndCashEquivalentsAtCarryingValue", "CashAndCashEquivalentsUSGAAPSummaryOfBusinessResults", "CashAndCashEquivalentsIFRSSummaryOfBusinessResults", "CashAndCashEquivalentsSummaryOfBusinessResults"],
  shortTermInvestments: ["ShortTermInvestmentsCAIFRS", "ShortTermInvestmentSecurities", "ShortTermInvestments", "ShortTermInvestmentsUSGAAP"],
  totalDebt: ["InterestBearingDebtIFRS"],
  equity: ["EquityAttributableToOwnersOfParentUSGAAPSummaryOfBusinessResults", "EquityAttributableToOwnersOfParentIFRSSummaryOfBusinessResults", "EquityAttributableToOwnersOfParentIFRS"],
  goodwill: ["GoodwillIFRS", "Goodwill"],
  intangibles: ["IntangibleAssetsIFRS", "IntangibleAssets"],
  ppe: ["PropertyPlantAndEquipmentIFRS", "PropertyPlantAndEquipment"],
  totalAssets: ["TotalAssetsIFRSSummaryOfBusinessResults", "TotalAssetsUSGAAPSummaryOfBusinessResults", "TotalAssetsSummaryOfBusinessResults", "AssetsIFRS", "Assets"],
  totalLiabilities: ["LiabilitiesIFRS", "Liabilities"],
  currentAssets: ["CurrentAssetsIFRS", "CurrentAssets"],
  currentLiabilities: ["TotalCurrentLiabilitiesIFRS", "CurrentLiabilities"],
  dilutedShares: ["WeightedAverageNumberOfDilutedSharesIFRS", "AverageNumberOfSharesDilutedIFRS"],
  marketCap: [], minorityInterest: ["NonControllingInterestsIFRS", "NonControllingInterests", "MinorityInterests"],
  liabilitiesAndStockholdersEquity: ["LiabilitiesAndEquityIFRS", "LiabilitiesAndNetAssets"],
} satisfies Partial<Record<keyof Year, string[]>>;
export function yearsFromEdinet(rows: EdinetRow[]): Year[] {
  const end = edinetFact(rows, "CurrentFiscalYearEndDateDEI");
  if (!end || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return [];
  const consolidated = edinetFact(rows, "WhetherConsolidatedFinancialStatementsArePreparedDEI") !== "false";
  rows = [...rows, ...usGaapStatementRows(rows)];
  const years: Year[] = [];
  for (let offset = 4; offset >= 0; offset--) {
    const prefix = offset ? `Prior${offset}Year` : "CurrentYear";
    const base = new RegExp(`^${prefix}(?:Duration|Instant)${consolidated ? "" : "(?:_NonConsolidatedMember)?"}$`);
    const candidates = rows.filter(r => base.test(r.context));
    const value = (names: string[], input = candidates): number | null => {
      for (const name of names) {
        const row = input.find(r => local(r) === name && /^(?:-?\d+(?:\.\d+)?|[－—―–-])$/.test(r.value));
        if (row) { const n = /^[－—―–-]$/.test(row.value) ? 0 : Number(row.value); if (Number.isFinite(n)) return n; }
      }
      return null;
    };
    const previousEnd = edinetFact(rows,"PreviousFiscalYearEndDateDEI");
    const hasPrevious = previousEnd !== null && /^\d{4}-\d{2}-\d{2}$/.test(previousEnd);
    const anchor = offset > 0 && hasPrevious ? previousEnd! : end;
    const distance = offset > 0 && hasPrevious ? offset - 1 : offset;
    const fy = Number(anchor.slice(0,4)) - distance;
    const month = Number(anchor.slice(5,7)); const day = Number(anchor.slice(8,10));
    const isMonthEnd = day === new Date(Date.UTC(Number(anchor.slice(0,4)),month,0)).getUTCDate();
    const fiscalEnd = new Date(Date.UTC(fy,month - 1,isMonthEnd ? new Date(Date.UTC(fy,month,0)).getUTCDate() : day)).toISOString().slice(0,10);
    const year = { fy, end: fiscalEnd, fiscalEndInferred: offset > (hasPrevious ? 1 : 0), currency: "JPY" } as Year;
    for (const [key,names] of Object.entries(fields)) (year as unknown as Record<string, unknown>)[key] = value(names);
    year.equityFromNetAssets = false;
    // Net assets includes minority interests and subscription rights, unlike parent equity.
    if (year.equity === null) {
      const netAssets = value(["NetAssetsSummaryOfBusinessResults", "NetAssets"]);
      year.netAssets = netAssets; year.subscriptionRights = value(["SubscriptionRightsToShares"]);
      year.equityFromNetAssets = netAssets !== null;
      if (netAssets !== null) year.equity = netAssets - (year.minorityInterest ?? 0) - (year.subscriptionRights ?? 0);
      else year.equity = value(["ShareholdersEquity"]);
    }
    const eps = value(["BasicEarningsLossPerShareIFRSSummaryOfBusinessResults", "BasicEarningsLossPerShareUSGAAPSummaryOfBusinessResults", "BasicEarningsLossPerShareSummaryOfBusinessResults", "BasicEarningsLossPerShareIFRS", "EarningsPerShare"]);
    const basic = eps && year.netIncome !== null && year.netIncome / eps > 0 ? year.netIncome / eps : null;
    if (basic !== null) year.dilutedShares = basic;
    if (offset === 0) {
      const filingRows = rows.filter(r => r.context === "FilingDateInstant");
      const issued = value(["NumberOfIssuedSharesAsOfFiscalYearEndIssuedSharesTotalNumberOfSharesEtc"], filingRows);
      const filing = value(["NumberOfIssuedSharesAsOfFilingDateIssuedSharesTotalNumberOfSharesEtc"], filingRows);
      const block = edinetFact(filingRows, "IssuedSharesTotalNumberOfSharesEtcTextBlock") ?? "";
      year.edinetShares = { basic, issued, filing,
        treasury: value(["TotalNumberOfSharesHeldTreasurySharesEtc", "NumberOfSharesHeldInOwnNameTreasurySharesEtc"], rows.filter(r => r.context === "CurrentYearInstant")),
        splitFiled: filedShareChange([block], end, edinetFact(rows, "FilingDateCoverPage") ?? end, issued && filing ? filing / issued : undefined), filed: edinetFact(rows, "FilingDateCoverPage") ?? end,
        reconciled: false, reason: "" };
    }
    if (year.dilutedShares === null && year.netIncome !== null) {
      const eps = value(["DilutedEarningsLossPerShareUSGAAPSummaryOfBusinessResults", "DilutedEarningsLossPerShareIFRSSummaryOfBusinessResults", "DilutedEarningsPerShareSummaryOfBusinessResults", "DilutedEarningsLossPerShareIFRS"]);
      if (eps !== null && eps !== 0 && year.netIncome / eps > 0) year.dilutedShares = year.netIncome / eps;
    }
    if (year.dilutedShares === null) year.dilutedShares = value(["NumberOfIssuedSharesSummaryOfBusinessResults", "TotalNumberOfIssuedSharesSummaryOfBusinessResults"], rows.filter(r => new RegExp(`^${prefix}(?:Duration|Instant)(?:_NonConsolidatedMember)?$`).test(r.context)));
    const sumReported = (components: Array<number | null>): number | null => components.every(n => n === null)
      ? null : components.reduce<number>((sum, n) => sum + (n ?? 0), 0);
    year.shortTermDebt = value(["InterestBearingLiabilitiesCLIFRS", "BondsAndBorrowingsCLIFRS"]) ?? sumReported([
      value(["ShortTermLoansPayable", "ShortTermBorrowings", "ShortTermDebtUSGAAP", "BorrowingsCLIFRS"]),
      value(["CurrentPortionOfLongTermLoansPayable", "LongTermDebtCurrent", "CurrentPortionOfLongTermBorrowingsCLIFRS"]), value(["CurrentPortionOfBonds", "CurrentPortionOfBondsPayable"]), value(["CommercialPapersLiabilities", "CommercialPaper"])]);
    const full=candidates.filter(r=>!local(r).includes('SummaryOfBusinessResults'));
    year.statementCoverage={
      income: year.operatingIncome!==null && year.preTaxIncome!==null && year.netIncome!==null && candidates.some(r=>/CostOfSales|SellingGeneral/.test(local(r))),
      balance: year.totalAssets!==null && year.totalLiabilities!==null && year.equity!==null,
      cashFlow: year.ocf!==null && full.some(r=>/InvCF|InvestingActivities/.test(local(r))) && full.some(r=>/FinCF|FinancingActivities/.test(local(r))),
    };
    year.provenance=Object.fromEntries(Object.keys(fields).filter(k=>typeof year[k as keyof Year]==='number').map(k=>[k,{source:'EDINET XBRL',field:(fields[k as keyof typeof fields] as string[]).find(tag=>value([tag])!==null)??k,method:'reported' as const}]));
    year.leaseLiabilities = sumReported([value(["LeaseLiabilitiesCLIFRS", "LeaseObligationsCL"]), value(["LeaseLiabilitiesNCLIFRS", "LeaseObligationsNCL"])]);
    // A repayment of a lease obligation is financing cash for a capitalized
    // asset; ordinary rent is excluded by the exact tags above.
    year.leaseDepreciationIncluded = year.leaseCash !== null && year.leaseCash !== undefined;
    const chargedLeases = year.leaseDepreciationIncluded;
    year.debtIncludesLeases = !chargedLeases;
    if (year.totalDebt === null) {
      // Aggregates include bonds/current maturities: never add their children twice.
      const current = value(["InterestBearingLiabilitiesCLIFRS", "BondsAndBorrowingsCLIFRS"]);
      const long = value(["InterestBearingLiabilitiesNCLIFRS", "BondsAndBorrowingsNCLIFRS"]);
      year.totalDebt = sumReported([
        current ?? sumReported([value(["ShortTermLoansPayable", "ShortTermBorrowings", "ShortTermDebtUSGAAP", "BorrowingsCLIFRS"]),
          value(["CurrentPortionOfLongTermLoansPayable", "LongTermDebtCurrent", "CurrentPortionOfLongTermBorrowingsCLIFRS"]), value(["CurrentPortionOfBonds", "CurrentPortionOfBondsPayable"]), value(["CommercialPapersLiabilities", "CommercialPaper"])]),
        long ?? sumReported([value(["LongTermLoansPayable", "LongTermBorrowings", "LongTermDebtNoncurrent", "LongTermDebtUSGAAP", "BorrowingsNCLIFRS"]), value(["BondsPayable"]), value(["ConvertibleBondTypeBondsWithSubscriptionRightsToShares"])]),
        chargedLeases ? 0 : year.leaseLiabilities ?? null,
      ]);
    }
    else if (chargedLeases && year.leaseLiabilities !== null) year.totalDebt = Math.max(0, year.totalDebt - year.leaseLiabilities!);
    // Toyota reports purchased PPE as owned assets and assets leased to customers.
    // Both are capital spending; disposal proceeds must not be netted against purchases.
    if (year.capex === null) year.capex = sumReported([
      value(["AdditionsToFixedAssetsExcludingEquipmentLeasedToOthersInvCFIFRS", "AdditionsToFixedAssetsExcludingEquipmentLeasedToOthersInvCFUSGAAP"]),
      value(["AdditionsToEquipmentLeasedToOthersInvCFIFRS", "AdditionsToEquipmentLeasedToOthersInvCFUSGAAP"]),
    ]);
    const combinedCapex = value(["PurchaseOfPropertyPlantAndEquipmentAndIntangibleAssetsInvCFIFRS", "PurchaseOfPropertyPlantAndEquipmentAndIntangibleAssetsInvCF"]);
    const intangiblesCapex = value(["PurchaseOfIntangibleAssetsInvCFIFRS", "PurchaseOfIntangibleAssetsInvCF", "PurchaseOfIntangibleAssetsInvCFUSGAAP"]);
    year.capex = combinedCapex !== null ? Math.abs(combinedCapex) : sumReported([year.capex === null ? null : Math.abs(year.capex), intangiblesCapex === null ? null : Math.abs(intangiblesCapex)]);
    if (year.receivables === null) year.receivables = sumReported([value(["NotesReceivableTrade"]), value(["AccountsReceivableTrade", "AccountsReceivableTradeAndContractAssets", "AccountsReceivableTradeAndContractAssetsCA"]) ]);
    if (year.inventory === null) year.inventory = sumReported([
      value(["MerchandiseAndFinishedGoods", "MerchandiseAndFinishedGoodsCAIFRS"])
        ?? sumReported([value(["Merchandise", "MerchandiseCAIFRS"]), value(["FinishedGoods", "FinishedGoodsCAIFRS"])]),
      value(["WorkInProcess", "WorkInProcessCAIFRS"]),
      value(["RawMaterialsAndSupplies", "RawMaterialsAndSuppliesCAIFRS"])
        ?? sumReported([value(["RawMaterials", "RawMaterialsCAIFRS"]), value(["Supplies", "SuppliesCAIFRS"])]),
      value(["OtherInventories", "OtherInventoriesCAIFRS"]),
    ]);
    if (year.costOfSales != null) year.costOfSales += value(["CostOfFinancingOperationsIFRS"]) ?? 0;
    if (year.grossProfit === null && year.revenue !== null && year.costOfSales != null) year.grossProfit = year.revenue - year.costOfSales;
    // Japanese GAAP's IntangibleAssets total includes goodwill; IFRS's separate
    // IntangibleAssets line excludes it. Year stores the two disjoint components.
    if (value(["IntangibleAssetsIFRS"]) === null && value(["IntangibleAssets"]) !== null && year.goodwill !== null)
      year.intangibles = Math.max(0, year.intangibles! - year.goodwill);
    year.cash = liquidCash(year);
    if (year.buybacks === null) {
      const netTreasury = value(["NetDecreaseIncreaseInTreasurySharesFinCFIFRS"]);
      if (netTreasury !== null) year.buybacks = Math.max(0, -netTreasury);
    }
    for (const key of ["leaseCash","capex","dividendsPaid","buybacks","acquisitions","interestExpense"] as const) if (year[key] != null) year[key] = Math.abs(year[key]!);
    if (year.revenue !== null || year.netIncome !== null || year.totalAssets !== null) years.push(reconcileEdinetShares(year));
  }
  // A short transition period can end in the same calendar year as its predecessor.
  // The shared Year contract retains the later annual period for that year.
  return deriveYears(mergeYears([], years));
}
function liquidCash(year: Year): number | null {
  const base = year.cashAndDeposits ?? year.cashAndCashEquivalents;
  return base == null ? year.cash : base + (year.shortTermInvestments ?? 0);
}
export function mergeYears(earlier: Year[], later: Year[]): Year[] {
  const years = new Map(earlier.map(y => [y.fy,y]));
  for (const year of later) {
    const prior = years.get(year.fy);
    const knownEnd = prior && !prior.fiscalEndInferred && year.fiscalEndInferred;
    // Summary dates beyond the prior year are extrapolations. A fiscal year-end
    // change must not make those inferred dates erase the actual older statement.
    if(prior && prior.end!==year.end && !knownEnd)years.set(year.fy,{...year});
    else {
      const updates=Object.fromEntries(Object.entries(year).filter(([key,value])=>value!==null && key!=='provenance' && !(prior?.[key as keyof Year]!=null && year.provenance?.[key]?.method==='absent-in-complete-statement')));
      const provenance={...prior?.provenance,...Object.fromEntries(Object.entries(year.provenance??{}).filter(([key])=>key in updates))};
      const statementCoverage=Object.fromEntries(['income','balance','cashFlow'].map(key=>[key,Boolean(prior?.statementCoverage?.[key as keyof NonNullable<Year['statementCoverage']>]||year.statementCoverage?.[key as keyof NonNullable<Year['statementCoverage']>]) ]));
      years.set(year.fy,{...(prior??year),...updates,provenance,statementCoverage,...(knownEnd?{end:prior.end,fiscalEndInferred:false}:{})} as Year);
    }
    // A newer comparative EPS can restate a past split. Its new denominator
    // must not be reset from the older filing's reconciliation metadata.
    if (!year.edinetShares && year.dilutedShares !== null) delete years.get(year.fy)!.edinetShares;
  }
  return [...years.values()].map(year => ({ ...year, cash: liquidCash(year),
    ...(year.equityFromNetAssets && year.netAssets != null ? { equity: year.netAssets - (year.minorityInterest ?? 0) - (year.subscriptionRights ?? 0) } : {}) })).sort((a,b) => a.fy-b.fy);
}
export function sectionsFromEdinet(rows: EdinetRow[]): Partial<Record<SectionKey,string>> {
  const map: Record<string,SectionKey> = {
    DescriptionOfBusinessTextBlock:"business", BusinessPolicyBusinessEnvironmentIssuesToAddressEtcTextBlock:"business",
    BusinessRisksTextBlock:"risk", ManagementAnalysisOfFinancialPositionOperatingResultsAndCashFlowsTextBlock:"mdna",
    RemunerationForDirectorsAndOtherOfficersTextBlock:"compensation", ShareholdingsTextBlock:"capital",
  };
  const sections: Partial<Record<SectionKey,string>> = {};
  for (const row of rows) {
    const key = map[local(row)];
    if (!key || !/^(?:CurrentYearDuration|FilingDateInstant)$/.test(row.context)) continue;
    const text = htmlToText(row.value);
    if (text) sections[key] = [sections[key],text].filter(Boolean).join("\n\n");
  }
  for (const key of Object.keys(sections) as SectionKey[]) sections[key] = truncateTokens(sections[key]!, SECTION_TOKENS[key]);
  return sections;
}
