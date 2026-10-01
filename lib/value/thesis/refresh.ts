import { publishedBuyPrice } from '../buy-price';
import type { IndexRow, PriceMap } from '../types';
import { createHash } from 'node:crypto';
import { THESIS_VERSION } from './questions';
import type { ThesisResult } from './types';
export const THESIS_DAILY_LIMIT = 12;
export const THESIS_CALL_LIMIT = 240;
export const isThesisCandidate = (triggers:string[]) => triggers.some(t=>t==='buy'||t==='next_closest');
export const thesisFingerprint = (inputs:unknown) => createHash('sha256').update(JSON.stringify({version:THESIS_VERSION,inputs})).digest('hex');
export function thesisNeedsRefresh(prior:ThesisResult|null,fingerprint:string,asOf:string):boolean {
 const age=prior?Date.parse(asOf)-Date.parse(prior.asOf):NaN;
 return !prior||prior.version!==THESIS_VERSION||(prior.inputFingerprint??prior.fingerprint)!==fingerprint||!Number.isFinite(age)||age<0||age>30*86400000;
}

/** Use today's numeric eligibility, before applying a previous thesis veto. */
export function thesisZone(row:IndexRow|undefined,quote:PriceMap[string]|undefined):'buy'|'next_closest'|null {
 if(!row||row.t!=='PPPPP'||!row.v||!quote||quote[0]<=0||!row.buyReturnInputs)return null;
 const result=publishedBuyPrice({...row,businessChanged:false},quote);
 if(result.dataQualityFlags.length||row.st!=='s')return null;
 return result.b?'buy':'next_closest';
}
