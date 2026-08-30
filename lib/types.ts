export type Activity = "new" | "add" | "reduce" | "hold" | "sold";

export interface Position {
  ticker: string;
  name: string;
  shares: number;
  pct: number;
  value: number;
  activity: Activity;
  change: number | null;
}

export interface Quarter {
  q: string;
  total: number;
  positions: Position[];
}

export interface InvestorData {
  code: string;
  person: string;
  firm: string;
  quarters: Quarter[];
}

export interface SeriesPoint {
  q: string;
  total: number;
  positions: number;
}

export interface IndexInvestor {
  code: string;
  slug: string;
  person: string;
  firm: string;
  sketch: boolean;
  series: SeriesPoint[];
}

export interface Index {
  generatedAt: string;
  quarters: string[];
  investors: IndexInvestor[];
}

export interface Holder {
  code: string;
  value: number;
  pct: number;
  activity: Activity;
  change: number | null;
}

export interface StockQuarter {
  q: string;
  holders: Holder[];
  price: number | null;
}

export interface StockData {
  ticker: string;
  name: string;
  quarters: StockQuarter[];
}

export type StockShard = Record<string, StockData>;

export interface SearchIndex {
  investors: { code: string; person: string; firm: string }[];
  stocks: { t: string; n: string; h: number }[];
}
