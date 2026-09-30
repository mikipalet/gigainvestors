'use client';
import { Toggle } from '@/components/controls/Toggle';

export function MarketScopeToggle({all,onChange}:{all:boolean;onChange:(all:boolean)=>void}) {
 return <div className="market-scope"><span>{all?'All markets':'Buyable in the West'}</span><Toggle label="Show all markets" checked={all} onChange={()=>onChange(!all)}/></div>;
}
