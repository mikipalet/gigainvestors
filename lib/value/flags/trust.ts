import type {Evidence,Grade} from '../judgement/types';
export function validEvidence(e:Evidence|undefined|null):e is Evidence {
 return !!e&&e.quote.trim().length>0&&/^https:\/\//.test(e.url)&&/^\d{4}-\d{2}-\d{2}$/.test(e.filed);
}
export function trustedExtraction(r:{version:string;confidence:number;evidence:Evidence;reviewed?:boolean},grade?:Grade):boolean {
 return !!grade&&grade.version===r.version&&grade.accuracy>=.9&&grade.n>=10&&grade.positive>=3&&grade.negative>=3
  &&Number.isFinite(r.confidence)&&(r.confidence>=.9||r.reviewed===true)&&validEvidence(r.evidence);
}
