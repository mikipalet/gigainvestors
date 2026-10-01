import type { RawAnswer } from '../types';
export type ThesisQuestionId = 'thesis_structural' | 'thesis_liability' | 'thesis_guidance' | 'thesis_distress';
export interface ThesisEvidence { quote:string; url:string; filed:string; section:string }
export interface ThesisMarket {currency:string;marketValue:number|null;ownerEarnings:number|null;asOf:string;basis:string;usdRates?:Record<string,number>}
export interface Liability {amount:number;currency:string;basis:'provided'|'estimated'|'claimed';topic:string}
export interface SizedLiability extends Liability {marketValueRatio:number;ownerEarningsRatio:number|null;evidence:ThesisEvidence}
export interface ThesisAnswer {
  id:ThesisQuestionId; version:string; value:'yes'|'no'|'unclear'; evidence:ThesisEvidence|null;
  amount?:string|null;
  liability?:Liability;
  guidance?:{metric:'revenue'|'operating_profit'; prior:number; guided:number; currency:string; priorOwnerEarnings?:number};
}
export interface ThesisGrade { version:string; accuracy:number; n:number; positives:number; negatives:number; enabled?:boolean }
export type ThesisTrust = Partial<Record<ThesisQuestionId,ThesisGrade>>;
export interface ThesisSource { url:string; filed:string; period:string; section:string; text:string }
export interface ThesisResult {
  id:string; version:string; asOf:string; fingerprint:string; triggers:string[];
  answers:ThesisAnswer[]; sources:Array<Omit<ThesisSource,'text'>>; gaps:string[];
  recordings?:Array<{stateHash:string;questions:Record<string,unknown>;answers:Record<string,RawAnswer>}>;
  market?:ThesisMarket;
}
export interface PublicThesis {
  changed:boolean; reason:string; evidence:ThesisEvidence[];
  liabilities?:SizedLiability[];
  guidance?:{before:number;after:number;reason:string;evidence:ThesisEvidence};
}
