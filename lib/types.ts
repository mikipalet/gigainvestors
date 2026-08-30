export type Activity = "new" | "add" | "reduce" | "hold" | "sold";

export interface Position {
  ticker: string;
  name: string;
  shares: number;
  pct: number;
  value: number;
  activity: Activity;
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
