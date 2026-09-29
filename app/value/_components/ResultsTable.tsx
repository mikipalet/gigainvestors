'use client';
import { useState } from 'react';
import { ResultRow, type ResultEntry } from './ResultRow';
export type Sort = 'name' | 'country' | 'cap' | 'mos' | 'holders';
export const columns: Array<[Sort,string]> = [['name','Company'],['country','Country'],['cap','Market cap (USD)'],['mos','Price / value'],['holders','Holders']];
export function ResultsTable({ entries, sort, direction, sortBy }: { entries: ResultEntry[]; sort: Sort; direction: number; sortBy: (key: Sort)=>void }) {
 const [scroll,setScroll]=useState(0), virtual=entries.length>60, rowHeight=56;
 const start=virtual ? Math.min(Math.max(0,entries.length-50),Math.max(0,Math.floor(scroll/rowHeight)-10)):0;
 const ratios=entries.flatMap(e=>e.mos===null?[]:[1-e.mos]);
 const maximum=Math.max(4,...ratios.map(n=>2**Math.ceil(Math.log2(n)))), minimum=Math.min(.25,...ratios.map(n=>2**Math.floor(Math.log2(n))));
 const visible=virtual?entries.slice(start,start+50):entries;
 const head=(key:Sort,label:string,cls='')=><th className={cls} aria-sort={sort===key?(key==='mos'?-direction:direction)===1?'ascending':'descending':'none'}><button onClick={()=>sortBy(key)}>{label} <span aria-hidden="true">{sort===key?(key==='mos'?-direction:direction)===1?'↑':'↓':'↕'}</span></button></th>;
 return <div data-testid="results-scroll" style={virtual?{maxHeight:650,overflowY:'auto'}:undefined} onScroll={e=>setScroll(e.currentTarget.scrollTop)}><table aria-rowcount={entries.length+1} data-testid="results-table" className={`results-table ${virtual?'value-virtual':''}`}><thead><tr>{head('name','Company')}{head('country','Country','country-col')}<th className="sector-col">Sector</th>{head('cap','Market cap (USD)','cap-col')}<th className="roic-col">ROIC · 10 years</th>{head('mos','Price / value','price-col')}<th className="buy-col">Buy line</th>{head('holders','Holders','holders-col')}<th className="quality-col"><div>{['Understandable','Moat','Economics','Management','Accounting'].map((label,i)=><abbr key={label} title={label}>{['U','M','E','Mg','A'][i]}</abbr>)}</div></th></tr></thead><tbody>{start>0&&<tr aria-hidden="true"><td colSpan={9} style={{height:start*rowHeight}}/></tr>}{visible.map((entry,i)=><ResultRow key={entry.row.id} rowIndex={start+i+2} maximum={maximum} minimum={minimum} {...entry}/>)}{virtual&&start+visible.length<entries.length&&<tr aria-hidden="true"><td colSpan={9} style={{height:(entries.length-start-visible.length)*rowHeight}}/></tr>}</tbody></table></div>;
}
