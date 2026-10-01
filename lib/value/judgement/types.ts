import type { Result, TestKey } from '../types';
export interface Evidence { quote:string; url:string; section:string; filed:string }
export interface Reading { id:string; version:string; value:string; confidence:number; evidence:Evidence|null; period?:string|null }
export interface Grade { version:string; accuracy:number; n:number; positive:number; negative:number }
export type Trust=Record<string,Grade>;
export interface Adjustment { amountEvidence?:Evidence; test:Exclude<TestKey,'price'>; fy:number; field:string; before:number; after:number; reason:string; evidence:Evidence }
export interface JudgementRecord { questionsHash?:string; numericFacts?:import("./amounts").ReportedAdjustmentFact[]; id:string; version:string; readings:Reading[]; facts?:Array<{text:string;url:string}>; inputHash?:string; asOf?:string }
export interface HumanTest { result:Result; reason:string; evidence?:Evidence; override:boolean }
export interface PublicJudgement { business:Reading[]; facts:Array<{text:string;url:string}>; adjustments:Adjustment[] }
