import {qualityQuarters,type QualityQuarter} from './quality-ltm';
/** Secondary issuer caches have already passed the identity/annual reconciliation
 * gate. The LTM gate still checks currency, amounts and share units anew. */
export function cachedQualityQuarters(id:string,read:<T>(path:string)=>T|null):QualityQuarter[]{
 const primary=read<unknown>(`raw/eodhd/${id}.json`);
 if(primary)return qualityQuarters(primary);
 const verified=read<{id:string;sourceId:string}>(`completeness/verified/${id}.json`);
 return verified?.id===id&&/^[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/.test(verified.sourceId)?qualityQuarters(read(`raw/eodhd/${verified.sourceId}.json`)):[];
}
