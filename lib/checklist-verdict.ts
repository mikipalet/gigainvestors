import {gateCode,qualityPass} from '@/lib/value/fair-buy';
export type ChecklistVerdict='pass'|'fair'|'fails';
/** A missing or incomplete assessment gets no mark. Colour never implies a result we lack. */
export function checklistVerdict(row:{t:string;pr?:string;b?:boolean}):ChecklistVerdict|undefined{
 if(gateCode(row).includes('F'))return 'fails';
 if(qualityPass(row))return row.b?'fair':'pass';
 return undefined;
}
export const verdictLabel={pass:'Passes quality',fair:'Fair price · passes quality',fails:'Fails quality'};
