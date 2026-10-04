export type ChecklistVerdict='pass'|'fair'|'fails';
/** A missing or incomplete assessment gets no mark. Colour never implies a result we lack. */
export function checklistVerdict(row:{t:string;b?:boolean}):ChecklistVerdict|undefined{
 if(row.t.includes('F'))return 'fails';
 if(row.t==='PPPPP')return row.b?'fair':'pass';
 return undefined;
}
export const verdictLabel={pass:'Passes quality',fair:'Fair price · passes quality',fails:'Fails quality'};
