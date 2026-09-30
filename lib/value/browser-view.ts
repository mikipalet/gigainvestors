import { ownerReturn } from './owner-return';
import type { SnapshotRow } from './time-travel';
import type { IndexRow,PriceMap } from './types';

export type BrowserRow = IndexRow & { quote: PriceMap[string] | null; expected?: number | null; pm?: number | null; gain?: number | null; historicalPrice?: import('./time-travel').HistoricalPrice };
export type ViewManifest = { current: string; years: Record<string, string>; deferred?: string[]; yearDeferred?: Record<string,string[]> };
export type BrowserPayload = { columns: Array<keyof BrowserRow>; rows: unknown[][] };
/** Column names occur once; exact numerical values and every identity are retained. */
export function packView(rows: BrowserRow[]): BrowserPayload {
  const columns=[...new Set(rows.flatMap(row=>Object.keys(row)))] as Array<keyof BrowserRow>;
  return {columns,rows:rows.map(row=>columns.map(key=>row[key]??null))};
}
export function unpackView(payload: BrowserPayload): BrowserRow[] {
  return payload.rows.map(values=>Object.fromEntries(payload.columns.map((key,i)=>[key,values[i]])) as unknown as BrowserRow);
}

export function browserRow(row: IndexRow, quote: PriceMap[string] | null = null): BrowserRow {
  const {ownerReturnInputs, dataQualityFlags, shareSources, buyReturnInputs, r, ...rest} = row;
  const unavailable = Boolean(dataQualityFlags?.length);
  const valuation = unavailable ? null : ownerReturnInputs?.valuation ?? null;
  const owner = ownerReturn(valuation, row.cur, ownerReturnInputs?.marketCapUsd ?? null, quote?.[0] ?? null);
  return {...rest, ...(unavailable ? {v:null,b:false,buyReturnInputs:null} : {}), quote,
    ...(!unavailable ? {expected:owner?.expected??null} : {}),
  };
}

/** The timeline displays quality passes and near misses, not every failed analysis. */
export function historyView(snapshots: SnapshotRow[], identities: IndexRow[]): BrowserRow[] {
  const byId = new Map(identities.map(row => [row.id,row]));
  return snapshots.filter(row => row[1]==='PPPPP' || /^P*FP*$/.test(row[1])).flatMap(([id,t,pm,b,gain,historicalPrice]) => {
    const identity = byId.get(id);
    if (!identity) throw new Error(`Historical identity missing: ${id}`);
    const {n,c,s,k,mc,cur,w,lg,exchange,nameEn,nameLocal,h} = identity;
    // Presentation-only ratios: eight significant digits exceed the view's
    // one-decimal precision. Original research snapshots remain lossless.
    const shown=(value:number|null)=>value===null?null:Number(value.toPrecision(8));
    return [{id,n,c,s,k,mc,cur,w,lg,exchange,...(nameEn&&nameEn!==n?{nameEn}:{}),...(nameLocal?{nameLocal}:{}),h,t,b,v:null,g:[],st:'s' as const,quote:null,pm:shown(pm),gain:shown(gain),...(historicalPrice?{historicalPrice:{discount:historicalPrice.discount,price:shown(historicalPrice.price),buyPrice:shown(historicalPrice.buyPrice)}}:{})}];
  });
}
