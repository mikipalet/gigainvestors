export const T = {
  budget: { dailyCalls: 100_000, extraCalls: 500, priceHistoryCalls: 15_000, bulkExchangeCost: 100, fundamentalsCost: 10, historyCost: 1, screenerCost: 5 },
  analyze: { concurrency: 64 },
  reports: { secConcurrency: 6, esefConcurrency: 3 },
  minYears: 7,
  kind: {
    lendingAssetsRatio: 0.4,
    // AXP's EODHD template omits card-member loans; netReceivables alone is only 20.61% (FY2025).
    // Explicit calibration requirement: retain bank treatment only while that loan field is absent.
    missingLoanBankIds: ["AXP.US"] as readonly string[],
  },
  edinet: { checkpointCompanies: 100, perSecond: 3, concurrency: 6, timeoutMs: 180_000, maxCsvBytes: 128 * 1024 * 1024, filingYears: 2 },
  esef: { checkpointCompanies: 50, minAnnualDays: 330, maxAnnualDays: 400, concurrency: 3 },
  marketCaps: { refreshMs: 7 * 86400000, maxReportedAgeMs: 120 * 86400000, shareBasisTolerance: 0.15 },
  yahoo: { perSecond: 2 },
  numeric: { minAvailableFraction: 2 / 3 },
  dedupe: { revenueTolerance: 0.02, backupRetentionMs: 7 * 24 * 60 * 60 * 1000 },
  integrity: { maxShareRatio: 5, minShareRatio: 0.2, splitTolerance: 0.03, splitPriceTolerance: 0.20, balanceTolerance: 0.10, balanceYears: 5, balanceMinFailures: 2 },
  fundamentals: { maxYears: 30, usageSyncCompanies: 200 },
  eodhd: { perSecond: 5, timeoutMs: 180_000, screenerPageSize: 100, screenerMaxOffset: 999 },
  publish: { maxCountDrop: 0.20, lockMaxAgeMs: 6 * 60 * 60 * 1000 },
  understandable: { years: 10, maxRevenueDeclines: 5, maxLossYears: 2, maxOpMarginCv: 0.35 },
  moat: { badYearsAllowed: 1, roicMedian: 0.15, roicSecondLowest: 0.10, gmDropPp: 0.04, roeMedianFin: 0.12, roeSecondLowestFin: 0.08 },
  economics: { oeToNi: 0.8, roiic: 0.12, maxNwcRise: 0.10 },
  management: {
    maxShareCagr: 0.01,
    retainedMinYears: 7, retainedMaxYears: 10,
    buybackMinYears: 6, buybackFailRho: -0.5, buybackMinYield: 0.01,
    acquisitionYears: 10, acquisitionToNetIncome: 0.5, roicEndpointYears: 3, roicRetention: 2 / 3,
  },
  accounting: { maxAccruals: 0.10, maxDsri: 1.465, minRedFlags: 2, maxRestructYears: 2, maxSbcToOcf: 0.15 },
  price: { requiredMos: { stable: 0.25, moderate: 0.35, volatile: 0.50 }, cvStable: 0.20 },
  history: { years: 10, refreshMs: 7 * 24 * 60 * 60 * 1000, acquisitionToAssets: 0.10, impairmentDrop: 0.20 },
  valuation: { bondSpread: 0.04, maxGrowth: 0.08, terminal: 0.03, finMaxGrowth: 0.06 },
  jev: { contradict: 0.7, trustAgreement: 0.85, evidence: 0.6, commodityCyclical: 0.6, chunkTokens: 24_000, minParagraphChars: 200 },
} as const;

// MI and NZ are compatibility codes; neither is currently returned by EODHD's exchanges-list.
export const YAHOO_SUFFIXES: Readonly<Record<string, string>> = {
  US: "", LSE: ".L", PA: ".PA", AS: ".AS", XETRA: ".DE", SW: ".SW", MC: ".MC", MI: ".MI",
  ST: ".ST", CO: ".CO", OL: ".OL", HE: ".HE", BR: ".BR", LS: ".LS", VI: ".VI", WAR: ".WA",
  TO: ".TO", V: ".V", AU: ".AX", HK: ".HK", TW: ".TW", TWO: ".TWO", KO: ".KS", KQ: ".KQ",
  SHG: ".SS", SHE: ".SZ", SA: ".SA", MX: ".MX", JK: ".JK", KLSE: ".KL", BK: ".BK", JSE: ".JO",
  NZ: ".NZ", SN: ".SN", IR: ".IR", AT: ".AT", JP: ".T",
};

/** Owner-defined venues available through typical Western retail brokers. F = Frankfurt. */
export const WESTERN_VENUES = [
  'US', 'TO', 'V', 'NEO', 'LSE', 'XETRA', 'F', 'PA', 'AS', 'BR', 'MC', 'MI',
  'LS', 'VI', 'IR', 'CO', 'ST', 'HE', 'OL', 'WAR', 'SW', 'AU', 'NZ',
] as const;
