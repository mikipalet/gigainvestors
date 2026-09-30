'use client';
import { Toggle } from '@/components/controls/Toggle';

export function MarketScopeToggle({all,onChange}:{all:boolean;onChange:(all:boolean)=>void}) {
 return <div className="market-scope"><Toggle label={all?'All markets':'Western markets'} checked={all} onChange={()=>onChange(!all)}/></div>;
}
