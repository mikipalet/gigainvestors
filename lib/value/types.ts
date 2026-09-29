export type Id = string; // EODHD style "KO.US", "ASML.AS", "0700.HK"; Japan "8058.JP"
export type Kind = "operating" | "bank" | "insurer";
export type Result = "pass" | "fail" | "unclear" | "na";
export type TestKey = "understandable" | "moat" | "economics" | "management" | "accounting" | "price";
export const QUALITY_TESTS: TestKey[] = ["understandable", "moat", "economics", "management", "accounting"];

export interface Company {
  id: Id;
  name: string;
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
  marketCapUsd: number | null;
  description: string | null;
  source: "eodhd" | "edinet";
}

// One fiscal year, reporting currency, absolute units. null = not reported.
// Sign convention: capex, buybacks, dividendsPaid, acquisitions are POSITIVE amounts spent.
export interface Year {
  fy: number;
  end: string; // ISO date
  currency?: string | null;
  minorityInterest?: number | null;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  preTaxIncome: number | null;
  taxExpense: number | null;
  netIncome: number | null;
  interestExpense: number | null;
  da: number | null;
  sbc: number | null;
  nonRecurring: number | null;
  ocf: number | null;
  capex: number | null;
  dividendsPaid: number | null;
  buybacks: number | null;
  issuance: number | null;
  acquisitions: number | null;
  receivables: number | null;
  inventory: number | null;
  payables: number | null;
  cash: number | null;
  totalDebt: number | null;
  equity: number | null;
  goodwill: number | null;
  intangibles: number | null;
  ppe: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  currentAssets: number | null;
  currentLiabilities: number | null;
  dilutedShares: number | null;
  marketCap: number | null; // year-end, reporting currency, when derivable
}

export interface Fundamentals {
  id: Id;
  currency: string; // reporting currency
  years: Year[]; // ascending fy, one per fy
  integrity: { ok: boolean; reasons: string[] };
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
  netCash: number;
  shares: number;
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

export interface Analysis {
  requiredMos?: number;
  volatility?: "stable" | "moderate" | "volatile";
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
  valueHistory?: Array<[number, number, number, number]>; // fy, low, mid, high in trading currency
  priceHistory?: Array<[string, number]>; // ISO month, close in trading currency
  events?: Array<{ fy: number; kind: "acquisition" | "impairment" | "restatement" | "share_change" | "currency_change"; note: string }>;
  holders: Array<{ code: string; name: string }>; // superinvestors, from data/store
  series: Record<string, Series | undefined> & { revenuePerShare?: Series; ownerEarningsPerShare?: Series; bookValuePerShare?: Series }; // optional published series
}

// Compact index row. t = one char per quality test in QUALITY_TESTS order: P F U N.
export interface IndexRow {
  m?: number; // required margin of safety
  r?: Array<number | null>; // ten-year ROIC
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

export type PriceMap = Record<Id, [number, string]>; // close, ISO date, in trading currency

export type NumericOutcome = Omit<TestOutcome, "jev" | "result">;
export interface NumericInput { years: Year[]; kind: Kind }

export type JevQuestion =
  | { type: "noul"; instructions: string; criteria?: { true: string; false: string } }
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] };

export type RawAnswer =
  | { type: "noul"; noul: number }
  | { type: "choice"; choice: string; probabilities: Record<string, number>; confidence: number }
  | { type: "score"; score: number; probabilities: Record<string, number>; legend: Record<string, string>; confidence: number };

export interface StoreMeta {
  asOf: string;
  counts: { universe: number; scored: number; insufficient: number };
  versions: { pipeline: string; questions: string };
  tags: Record<string, string>;
}
