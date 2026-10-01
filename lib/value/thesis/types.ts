import type { RawAnswer } from '../types';
export type ThesisQuestionId = 'thesis_structural' | 'thesis_liability' | 'thesis_guidance' | 'thesis_distress';
export interface ThesisEvidence { quote:string; url:string; filed:string; section:string }
export interface ThesisAnswer {
  id:ThesisQuestionId; version:string; value:'yes'|'no'|'unclear'; evidence:ThesisEvidence|null;
  amount?:string|null;
  guidance?:{metric:'revenue'|'operating_profit'; prior:number; guided:number; currency:string; priorOwnerEarnings?:number};
}
export interface ThesisGrade { version:string; accuracy:number; n:number; positives:number; negatives:number }
export type ThesisTrust = Partial<Record<ThesisQuestionId,ThesisGrade>>;
export interface ThesisSource { url:string; filed:string; period:string; section:string; text:string }
export interface ThesisResult {
  id:string; version:string; asOf:string; fingerprint:string; triggers:string[];
  answers:ThesisAnswer[]; sources:Array<Omit<ThesisSource,'text'>>; gaps:string[];
  recordings?:Array<{stateHash:string;questions:Record<string,unknown>;answers:Record<string,RawAnswer>}>;
}
export interface PublicThesis {
  changed:boolean; reason:string; evidence:ThesisEvidence[];
  guidance?:{before:number;after:number;reason:string;evidence:ThesisEvidence};
}
