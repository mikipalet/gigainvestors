import type {Evidence,Grade} from '../judgement/types';
import type {Series} from '../types';
export const THEMES=['Capital cycle','Obligations off the balance sheet','Who it depends on','Accounting choices','Owners and management','Balance sheet'] as const;
export type Theme=typeof THEMES[number];
/** Amounts are absolute reporting-currency units; ratios are fractions. */
export interface Observation {metric:string;value:number;fy:number;currency:string;evidence:Evidence}
export interface BusinessFlag {
 id:string;kind:string;theme:Theme;tone:'red'|'green';severity:number;label:string;why:string;question:string;
 series:Series;unit:'ratio'|'percent'|'money'|'years'|'count';currency?:string;evidence:Evidence[];
 basis:'computed'|'filing';extraction?:'signal'|'relationship';version?:string;confidence?:number;reviewed?:boolean;
}
export interface Counterparty {id:string;name:string;aliases?:string[];logo?:string|null;wikidata?:string}
/** Direction: from supplies/services/guarantees/invests in to. Customer is the recipient. */
export interface Relationship {
 id:string;from:string;to:string;name:string;basis?:'filing'|'wikidata';type:'customer'|'supplier'|'stake'|'guarantee'|'contract'|'licensing'|'related-party'|'subsidiary';
 amount?:number;currency?:string;percent?:number;metric?:'revenue'|'backlog'|'purchases'|'ownership'|'votes';period?:string;
 evidence:Array<Evidence & {disclosedBy:string}>;status:'confirmed'|'one-sided';
 counterparty?:Counterparty;version?:string;confidence?:number;reviewed?:boolean;
}
export interface FlagRecord {id:string;asOf:string;flags:BusinessFlag[];relationships:Relationship[];observations:Observation[];gaps:string[];inputHash:string}
export interface PublicBusiness {flags:BusinessFlag[];relationships:Relationship[];asOf:string}
export type FlagTrust=Record<string,Grade>;
