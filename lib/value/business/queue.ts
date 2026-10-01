interface ResearchState {status:string;inputHash:string;attemptedAt:string;retryAfter:string}
/** Give every company its first attempt before retrying unresolved old work. */
export function businessQueue(ids:string[],states:Map<string,ResearchState>,fingerprint:(id:string)=>string,now:string,force=false):string[]{
 return ids.filter(id=>{const s=states.get(id);return force||!s||s.inputHash!==fingerprint(id)||s.status!=='complete'&&s.retryAfter<=now;})
  .sort((a,b)=>Number(states.has(a))-Number(states.has(b))||(states.get(a)?.attemptedAt??'').localeCompare(states.get(b)?.attemptedAt??''));
}
