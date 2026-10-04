import type {Activity} from './types';
// Activity is shape/texture; checklist alone owns semantic green/red.
export function surfaceFor(activity:Activity,_change:number|null|undefined,_strongNew=false,_flat=false):string{
 return activity==='new'||activity==='add'?'activity-buy':activity==='sold'?'activity-sold':activity==='reduce'?'activity-sell':'';
}
