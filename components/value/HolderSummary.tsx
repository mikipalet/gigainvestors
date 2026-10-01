'use client';
import {useState,useEffect} from 'react';
import {Face} from '@/components/Face';
import {SidePanel} from './SidePanel';
import {PagedItems} from './PanelTabs';
export function HolderSummary({holders}:{holders:Array<{name:string;code:string;firm?:string;portrait?:string}>}){
 const [open,setOpen]=useState(false),[size,setSize]=useState(12);
 useEffect(()=>{const media=matchMedia('(max-width:767px)'),resize=()=>setSize(media.matches?6:12);resize();media.addEventListener('change',resize);return()=>media.removeEventListener('change',resize);},[]);
 return <><button className="holder-summary" onClick={()=>setOpen(true)}>{`${holders.length} tracked investor${holders.length===1?'':'s'} ↗`}</button>{open&&<SidePanel title="Investors" onClose={()=>setOpen(false)}><section className="investor-panel"><header><p className="panel-answer">{holders.length} tracked investor{holders.length===1?' holds':'s hold'} this company.</p></header><div className="investor-directory"><PagedItems size={size} items={holders.map(h=><a key={h.code} className="investor-row" href={`https://gigainvestors.com/${encodeURIComponent(h.code)}`}>{h.portrait&&<span className="holder-portrait"><Face slug={h.portrait} size={320} sizes="80px"/></span>}<span><b>{h.name} ↗</b>{h.firm&&<small>{h.firm}</small>}</span></a>)}/></div><footer>Reported holdings from quarterly 13F filings. Open an investor to see the portfolio and filing history.</footer></section></SidePanel>}</>;
}
