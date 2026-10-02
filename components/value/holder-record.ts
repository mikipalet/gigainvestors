import type {InvestorData} from '@/lib/types';

/** Report the current position and first observation, without treating a stale holding as current. */
export function holderRecord(data:InvestorData|null,ticker:string){
 const quarters=[...(data?.quarters??[])].sort((a,b)=>a.q.localeCompare(b.q));
 const matches=(name:string)=>name.toUpperCase()===ticker.toUpperCase();
 const history=quarters.map(q=>({q:q.q,position:q.positions.find(p=>matches(p.ticker)&&p.shares>0)}));
 const latest=history.at(-1);
 if(!latest?.position)return undefined;
 const first=history.find(q=>q.position)!.q;
 const lastChange=history.filter(q=>q.position&&q.position.activity!=='hold').at(-1);
 return {...latest.position,q:latest.q,first,lastChange:lastChange?{q:lastChange.q,activity:lastChange.position!.activity,change:lastChange.position!.change}:null,history:history.map(q=>({q:q.q,pct:q.position?.pct??0,shares:q.position?.shares??0}))};
}
