import { displayName, priceState, returnDisplay, dateLabel } from '@/lib/value/presentation';
import { StatusGlyph } from '@/components/value/viz/StatusGlyph';
import { T } from '@/lib/value/config';
import { RoicSparkline } from '@/components/value/viz/RoicSparkline';
import { MarginBar } from '@/components/value/viz/MarginBar';
import type { IndexRow } from '@/lib/value/types';
import { compactMoney } from '@/lib/value/viz/layout';
import { ValueLink } from '@/components/value/ValueLink';
import { QualityDots } from './QualityDots';
export type ResultEntry = { row: IndexRow; mos: number | null; quote: number | null; date?: string | null; seed?: boolean; rowIndex?: number; maximum?: number; minimum?: number; expanded?:boolean };
export function ResultRow({ row,mos,quote,date,seed,rowIndex,maximum,minimum,expanded }: ResultEntry) {
 const roic=row.r?.filter((n):n is number=>n!==null&&Number.isFinite(n)).sort((a,b)=>a-b)??[];
 const median=roic.length?roic.length%2?roic[Math.floor(roic.length/2)]:(roic[roic.length/2-1]+roic[roic.length/2])/2:null;
 const info=row.returnInfo??returnDisplay({value:median,years:roic.length,financial:row.k!=='operating'});
 const state=priceState({price:quote,mid:row.v?.[1]??null,requiredMos:row.m??T.price.requiredMos.stable});
 const discount=row.m??T.price.requiredMos.stable;
 return <tr aria-rowindex={rowIndex} data-company-row className={row.st==='i'?'insufficient':row.t==='PPPPP'?'quality-pass':'near-miss'}>
 <td className="company-col" title={displayName(row.n)}><ValueLink title={displayName(row.n)} href={`/${row.id.toLowerCase()}`}><span>{displayName(row.n)}</span></ValueLink><span className="ticker">{row.id}</span><div className="mobile-row-meta"><span>{row.mc===null?'Cap unavailable':compactMoney(row.mc,'USD')}</span></div></td>
 <td className="country-col">{row.c}</td><td className="sector-col">{row.s??'Unclassified'}</td><td className="cap-col">{row.mc===null?'n/a':compactMoney(row.mc)}</td>
 <td className="roic-col"><div>{info.label==='Unlimited'||info.label==='n/m'||!roic.length?<span aria-label="No numeric return series">—</span>:<RoicSparkline values={row.r}/>}<span title={info.note}>{info.label}{info.label==='Unlimited'?' †':''}</span></div></td>
 <td className="price-col" title={`${seed?'Price derived from market cap':'Price close'} ${dateLabel(date)}. Buy discount: ${discount*100}%.`}>{mos===null?<abbr title={quote===null?'No price available':row.st==='i'?'Insufficient financial data':'No positive comparable valuation published'}>{quote===null?'No price':'n/v'}</abbr>:<MarginBar quality={row.t==='PPPPP'} value={mos} requiredMos={discount} maximum={maximum} minimum={minimum}/>}<small className="desktop-buy-line">{mos===null?'':`buy ≤ ${(1-discount).toFixed(2)}×`}</small><span className="mobile-price-detail">{mos===null?'Buy line unavailable':`buy ≤ ${(1-discount).toFixed(2)}×`}<div><QualityDots tests={row.t}/><StatusGlyph result={state.state} label={`Price: ${state.label}. ${state.description}`}/></div></span></td>
 <td className="holders-col">{row.h||'—'}</td><td className="quality-col"><div>{expanded&&row.t!=='PPPPP'?<QualityDots tests={row.t}/>:<span>5/5</span>}<StatusGlyph result={state.state} label={`Price: ${state.label}. ${state.description}`}/></div></td></tr>;
}
