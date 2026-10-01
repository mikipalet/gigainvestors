import type { HistoricalPrice } from './time-travel';
import type { IndexRow } from './types';
export type ResultEntry = { expected?: number | null; historicalPrice?: HistoricalPrice; historical?: boolean; historicalReturn?: number | null; row: IndexRow; mos: number | null; quote: number | null; date?: string | null; seed?: boolean; };
