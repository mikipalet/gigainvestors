export type Id = string; // EODHD style "KO.US", "ASML.AS", "0700.HK"; Japan "8058.JP"
export type Kind = "operating" | "bank" | "insurer" | "financial";
export type Result = "pass" | "fail" | "unclear" | "na";
export type TestKey = "understandable" | "moat" | "economics" | "management" | "accounting" | "price";
export const QUALITY_TESTS: TestKey[] = ["understandable", "moat", "economics", "management", "accounting"];

export interface Company {
  id: Id;
  name: string;
  nativeName?: string;
  nameEn?: string;
  nameLocal?: string;
  logo?: string | null;
  about?: string | null;
  code: string;
  exchange: string;
  country: string; // ISO2
  currency: string; // trading currency
  isin: string | null;
  cik: string | null;
  lei: string | null;
  edinetCode: string | null;
  sector: string | null;
  industry: string | null;
  kind: Kind;
  listings: Id[];
  listingExchange?: string;
  marketCapUsd: number | null;
  description: string | null;
  source: "eodhd" | "edinet" | "esef";
}

// One fiscal year, reporting currency, absolute units. null = not reported.
// Sign convention: capex, buybacks, dividendsPaid, acquisitions are POSITIVE amounts spent.
export interface Year {
  fy: number;
  end: string; // ISO date
  fiscalEndInferred?: boolean; // EDINET summary dates extrapolated beyond the explicit current/prior end
  currency?: string | null;
  minorityInterest?: number | null;
  revenue: number | null;
  grossProfit: number | null;
  costOfSales?: number | null;
  operatingIncome: number | null;
  preTaxIncome: number | null;
  taxExpense: number | null;
  netIncome: number | null;
  totalNetIncome?: number | null; // consolidated profit, before non-controlling interests
  edinetShares?: { basic: number | null; issued: number | null; filing: number | null; treasury: number | null; splitFiled: boolean; filed: string; reconciled: boolean; reason: string };
  interestExpense: number | null;
  da: number | null;
  leaseLiabilities?: number | null;
  leaseCashIncomplete?: boolean;
  leaseCash?: number | null; // reported repayments of capitalized lease obligations
  leaseDepreciationIncluded?: boolean; // IFRS 16 or equivalent ROU depreciation included in D&A
  sbc: number | null;
  sbcIncomplete?: boolean; // one or more TTM quarters omit SBC
  nonRecurring: number | null;
  ocf: number | null;
  capex: number | null;
  dividendsPaid: number | null;
  buybacks: number | null;
  issuance: number | null;
  acquisitions: number | null;
  /** Positive annual growth in goodwill plus intangibles, not reported cash spending. */
  acquisitionsProxy?: boolean;
  receivables: number | null;
  clientAssets?: number | null;
  loans?: number | null; // loan assets when supplied separately by the provider
  inventory: number | null;
  payables: number | null;
  /** Cash/deposits plus separately reported short-term investments; excludes strategic holdings. */
  cash: number | null;
  cashAndDeposits?: number | null;
  cashAndCashEquivalents?: number | null;
  shortTermInvestments?: number | null;
  totalDebt: number | null;
  equity: number | null;
  netAssets?: number | null;
  subscriptionRights?: number | null;
  equityFromNetAssets?: boolean;
  goodwill: number | null;
  intangibles: number | null;
  ppe: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  liabilitiesAndStockholdersEquity?: number | null;
  currentAssets: number | null;
  currentLiabilities: number | null;
  basicEps?: number | null;
  sharesOutstanding?: number | null;
  dilutedShares: number | null;
  marketCap: number | null; // year-end, reporting currency, when derivable
}

export interface Fundamentals {
  id: Id;
  currency: string; // reporting currency
  ttm?: Year | null; // four quarters, or annual + current H1 - comparative H1
  years: Year[]; // ascending fy, one per fy
  integrity: { ok: boolean; reasons: string[]; notes?: string[] }; // Optional for older corpus files.
  fetchedAt: string;
  splits?: Array<{ date: string; factor: number }>;
}

export type Series = Array<[number, number | null]>; // [fy, value]

export interface JevAnswer {
  q: string; // question id
  label: string; // plain statement shown in UI, e.g. "Describes switching costs"
  kind: "noul" | "choice" | "score";
  value: number | string | null; // noul prob, choice key, score value; null = section missing
  probability: number | null; // noul prob, or prob of chosen option, or confidence for score
  section: SectionKey | "description";
  evidence: string | null; // best paragraph, filled by the evidence pass
  trusted: boolean; // passed the accuracy check (lib/value/jev-trust.json)
}

export interface TestOutcome {
  insufficientHistory?: number;
  /** Unclear solely because an input fetch is still pending. */
  pending?: boolean;
  key: TestKey;
  result: Result;
  numeric: Result;
  reasons: string[]; // short plain sentences, e.g. "ROIC median 31% over 10 years"
  metrics: Record<string, number | null>;
  series: Record<string, Series>;
  jev: JevAnswer[];
}

export interface Valuation {
  method: "owner_earnings" | "book_value";
  currency: string;
  normalized: number; // owner earnings (or book value per share for book_value)
  growth: number;
  discountRate: number;
  terminalGrowth: number;
  bondYield: number | null;
  bondSource?: string;
  bondFlags?: string[];
  netCash: number;
  shares: number;
  sharesSource?: "yahoo-shares";
  perShare: { low: number; mid: number; high: number };
  perShareTrading?: { currency: string; fxRate: number; low: number; mid: number; high: number };
  equityBondYield: number | null;
  bridge: Array<{ label: string; value: number }>;
  assumptions: string[];
}

export type SectionKey =
  | "business" | "risk" | "mdna" | "letter" | "capital" | "compensation" | "notes" | "auditor";

export interface ReportMeta {
  id: Id;
  kind: "10-K" | "20-F" | "40-F" | "ESEF" | "EDINET" | "description";
  url: string | null;
  filed: string | null;
  period: string | null;
  sections: SectionKey[];
}

export type Volatility = "stable" | "moderate" | "volatile";
export type ValueHistory = Array<[fy: number, low: number, mid: number, high: number]>;
export type PriceHistory = Array<[isoMonth: string, close: number]>;
export interface CompanyEvent {
  fy: number;
  kind: "acquisition" | "impairment" | "restatement" | "share_change" | "currency_change";
  note: string;
}

export interface Analysis {
  author?: string;
  dataQualityFlags?: string[];
  shareCount?: { value: number; source: "yahoo-shares" };
  historyCoverage?: { years: number; first: number | null; last: number | null; source: string };
  requiredMos?: number; // Optional only for pre-history corpus compatibility.
  volatility?: Volatility;
  valueHistory?: ValueHistory; // Trading currency, using today's bond yield and FX.
  historyAssumptions?: string[];
  events?: CompanyEvent[];
  series?: Record<string, Series>;
  id: Id;
  company: Company;
  asOf: string;
  status: "scored" | "insufficient_data";
  report: ReportMeta;
  tests: Record<Exclude<TestKey, "price">, TestOutcome>;
  valuation: Valuation | null;
  valuationReason: string | null; // why valuation is null
  versions: { pipeline: string; questions: string };
}

export interface Dossier extends Analysis {
  w: string | null; // Best Western trading listing; null means not easily buyable.
  b?: boolean; // Published all-five-pass, verified at-buy-price decision.
  priceHistory?: PriceHistory;
  tests: Analysis["tests"] & { price?: TestOutcome };
  holders: Array<{ code: string; name: string }>; // superinvestors, from data/store
  series: Record<string, Series>; // Includes revenuePerShare, ownerEarningsPerShare and bookValuePerShare when available
}

// Compact index row. t = one char per quality test in QUALITY_TESTS order: P F C (checking) U N.
export interface IndexRow {
  historyYears?: number;
  buyReturnInputs?: { cashPerShare: number; growth: number; requiredReturn: number } | null;
  w: string | null; // Best Western trading listing.
  ownerReturnInputs?: { valuation: Valuation; marketCapUsd: number | null };
  exchange?: string; // Listing venue, enriched from the published dossier when needed.
  nameEn?: string;
  nameLocal?: string;
  lg?: string | null;
  b?: boolean; // Published all-five-pass, verified at-buy-price decision; absent in legacy snapshots.
  dataQualityFlags?: string[];
  returnInfo?: { label: string; note: string; sort: number };
  fy?: number;
  m?: number; // Required margin of safety; absent only in legacy snapshots.
  r?: Array<number | null>; // Last ten annual ROIC observations, three significant digits.
  id: Id;
  n: string;
  c: string;
  s: string | null;
  k: Kind;
  mc: number | null;
  v: [number, number, number] | null; // per-share low, mid, high in `cur`
  cur: string;
  t: string;
  g: string[]; // Jev tag ids, trusted questions only
  h: number; // superinvestor holders
  st: "s" | "i"; // scored / insufficient
}

export type PriceMap = Record<Id, [number, string, "seed"?]>; // close, fetch/close ISO date, optional derived-price flag; trading currency

export type NumericOutcome = Omit<TestOutcome, "jev" | "result">;
export interface NumericInput { years: Year[]; kind: Kind; priceHistoryPending?: boolean }

export type JevQuestion =
  | { type: "noul"; instructions: string; criteria?: { true: string; false: string } }
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] };

export type RawAnswer =
  | { type: "noul"; noul: number }
  | { type: "choice"; choice: string; probabilities: Record<string, number>; confidence: number }
  | { type: "score"; score: number; probabilities: Record<string, number>; legend: Record<string, string>; confidence: number };

export interface FunnelCounts {
  asOf: string | null; // Latest analysis date in this population.
  analysed: number;
  gates: Array<{
    key: TestKey;
    label: string;
    pass?: number; // Same cumulative survivor count as passing; optional for legacy snapshots.
    fail?: number;
    checking?: number;
    unclear?: number;
    passing: number; // Passes this gate and every preceding gate.
    failsOnlyThis: number; // Confirmed failure here, passes all other QUALITY gates (price independent).
  }>;
}

export interface PublishedFunnel extends FunnelCounts {
  byCountry: Record<string, FunnelCounts>;
}

export interface StoreMeta {
  western?: { story: NonNullable<StoreMeta["story"]>; funnel: PublishedFunnel };
  author?: string;
  story?: { analysed: number; qualityPasses: number; qualityShare: number; atBuy: number; countriesCovered: number };
  funnel?: PublishedFunnel;
  asOf: string;
  counts: { universe: number; analysed?: number; scored: number; insufficient: number };
  versions: { pipeline: string; questions: string };
  tags: Record<string, string>;
}

/** Search covers the full universe, including companies without an analysis. */
export type SearchRow = [id: Id, name: string, country: string, status: "a" | "p", marketCapUsd: number | null, w?: string | null];
export interface SearchShard {
  rows: SearchRow[];
  /** Normalized listing codes and ISINs mapped to local row offsets. */
  aliases: Record<string, number[]>;
}

/** Code-only annual snapshot; r is a cumulative price-return ratio, not a percent. */
export type SnapshotRow = [id: Id, t5: string, pm: number | null, b: boolean, r: number | null];
export interface HistorySummary {
  analysed: number;
  qualityPasses: number;
  atBuy: number;
  /** Finite-return denominators; cohort totals above also include missing returns. */
  returnCountAtBuy: number;
  returnCountQuality: number;
  returnCountAll: number;
  medianReturnAtBuy: number | null;
  medianReturnQuality: number | null;
  medianReturnAll: number | null;
  /** Share of finite cohort returns strictly above the unrounded all-universe median. */
  hitRateAtBuy: number | null;
  hitRateQuality: number | null;
  hitRateAll: number | null;
  /** Secondary arithmetic means, retained for existing consumers. */
  avgReturnAtBuy: number | null;
  avgReturnQuality: number | null;
  avgReturnAll: number | null;
}
export interface HistoryIndex {
  western?: { perYear: Record<string, HistorySummary> };
  scope?: "universe" | "selection";
  years: number[];
  perYear: Record<string, HistorySummary>;
  asOf?: string;
  assumptions?: string[];
  caveats?: string[];
}
