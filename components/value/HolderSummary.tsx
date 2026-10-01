'use client';
import {useState} from 'react';
import {SidePanel} from './SidePanel';
import {PagedItems} from './PanelTabs';
export function HolderSummary({holders}:{holders:Array<{name:string;code:string}>}){
 const [open,setOpen]=useState(false);
 return <><button className="holder-summary" onClick={()=>setOpen(true)}>{`${holders.length} tracked investor${holders.length===1?'':'s'} ↗`}</button>{open&&<SidePanel title="Investors" onClose={()=>setOpen(false)}><p className="panel-answer">{holders.length} tracked investor{holders.length===1?' holds':'s hold'} this company.</p><p>Reported holdings from quarterly 13F filings.</p><PagedItems size={6} items={holders.map(h=><a className="investor-row" href={`https://gigainvestors.com/${encodeURIComponent(h.code)}`}>{h.name} ↗</a>)}/></SidePanel>}</>;
}
