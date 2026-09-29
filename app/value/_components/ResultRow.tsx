import { T } from '@/lib/value/config';
import { RoicSparkline } from '@/components/value/viz/RoicSparkline';
import { MarginBar } from '@/components/value/viz/MarginBar';
import type { IndexRow } from '@/lib/value/types';
import { compactMoney } from '@/lib/value/viz/layout';
import { ValueLink } from '@/components/value/ValueLink';
import { QualityDots } from './QualityDots';
export type ResultEntry = { row: IndexRow; mos: number | null; quote: number | null; date?: string | null; seed?: boolean; rowIndex?: number; maximum?: number; minimum?: number };
export function ResultRow({ row,mos,quote,date,seed,rowIndex,maximum,minimum }: ResultEntry) {
 const roic=row.r?.filter((n):n is number=>n!==null&&Number.isFinite(n)).sort((a,b)=>a-b)??[];
 const median=roic.length?roic.length%2?roic[Math.floor(roic.length/2)]:(roic[roic.length/2-1]+roic[roic.length/2])/2:null;
 const discount=row.m??T.price.requiredMos.stable;
 return <tr aria-rowindex={rowIndex} data-company-row className={row.st==='i'?'insufficient':''}>
 <td className="company-col"><ValueLink href={`/${row.id.toLowerCase()}`}>{row.n}</ValueLink><span className="ticker">{row.id}</span><div className="mobile-row-meta"><span>{row.mc===null?'Cap unavailable':compactMoney(row.mc,'USD')}</span><QualityDots tests={row.t}/></div></td>
 <td className="country-col">{row.c}</td><td className="sector-col">{row.s??'Unclassified'}</td><td className="cap-col">{row.mc===null?'n/a':compactMoney(row.mc,'USD')}</td>
 <td className="roic-col"><div><RoicSparkline values={row.r}/><span>{roic.length<5?'Insufficient':median===null?'n/a':`${(median*100).toFixed(1)}%`}</span></div></td>
 <td className="price-col" title={`${seed?'Price derived from market cap':'Price close'} ${date??'unavailable'}. Buy discount: ${discount*100}%.`}>{mos===null?<abbr title={quote===null?'No price available':row.st==='i'?'Insufficient financial data':'No positive comparable valuation published'}>{quote===null?'No price':'n/v'}</abbr>:<MarginBar value={mos} requiredMos={discount} maximum={maximum} minimum={minimum}/>}</td>
 <td className="buy-col">{(1-discount).toFixed(2)}×</td><td className="holders-col">{row.h}</td><td className="quality-col"><QualityDots tests={row.t}/></td></tr>;
}
