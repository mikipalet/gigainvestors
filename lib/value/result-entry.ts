import type { HistoricalPrice } from './time-travel';
import type { IndexRow } from './types';
export type ResultEntry = { outcome?:{date:string;lastTraded?:boolean}; basis?:{annual:number;ttm:string}; expected?: number | null; historicalPrice?: HistoricalPrice; historical?: boolean; historicalReturn?: number | null; row: IndexRow; mos: number | null; quote: number | null; date?: string | null; seed?: boolean; };
