import type { Dossier, PriceMap } from '@/lib/value/types';
import { formatMetric } from '@/lib/value/metric-labels';
import { useWidth } from '@/lib/value/viz/use-width';
export function MiniDollar({retained,created}:{retained:number|null;created:number|null}){
 if(retained===null||created===null||retained<=0)return null;
 const ratio=created/retained,max=Math.max(1,ratio,0);
 return <figure className="mini-dollar"><figcaption>Retained → value created</figcaption><div><span>$1</span><i style={{width:`${1/max*65}%`}}/></div><div><span>{formatMetric({value:ratio,format:'x'})}</span><i style={{width:`${Math.max(0,ratio)/max*65}%`}}/></div></figure>;
}
export function MiniPrice({dossier,quote}:{dossier:Dossier;quote:PriceMap[string]|null}){
 const {ref,width}=useWidth();
 const values=dossier.valueHistory?.filter(v=>v.every(Number.isFinite)&&v.slice(1).every(n=>n>0))??[];
 const history=dossier.priceHistory??[];
 if(!values.length||!history.length)return null;
 const year=(date:string)=>Number(date.slice(0,4))+(Number(date.slice(5,7))-1)/12;
 const prices=quote?[...history.filter(p=>p[0]<quote[1]),[quote[1],quote[0]] as [string,number]]:history;
 const start=Math.max(values[0][0],year(prices[0][0])),end=year(prices.at(-1)![0]);
 const visible=values.filter(v=>v[0]+1>=start),vs=visible.length?visible:[values.at(-1)!],ps=prices.filter(p=>year(p[0])>=start);
 const mos=dossier.requiredMos??.25,max=Math.max(...vs.map(v=>v[3]),...ps.map(p=>p[1]))*1.05;
 const x=(n:number)=>(n-start)/(end-start||1)*(width-2)+1,y=(n:number)=>49-n/max*45;
 const current=dossier.valuation?.perShareTrading??dossier.valuation?.perShare;
 const segments=vs.filter(v=>v[0]+1>=start).map(([fy,low,mid,high])=>({from:Math.max(start,fy),to:Math.min(end,fy+1),low,mid,high}));
 if(current&&end>vs.at(-1)![0]+1)segments.push({from:Math.max(start,vs.at(-1)![0]+1),to:end,...current});
 return <figure ref={ref} className="mini-price"><figcaption><span>Price</span><span>Value range</span><span>Buy line</span></figcaption><svg viewBox={`0 0 ${width} 54`} aria-label="Monthly price against fiscal-year value range and buy line">{segments.map((v,i)=><g key={i}><rect x={x(v.from)} width={Math.max(0,x(v.to)-x(v.from))} y={y(v.high)} height={Math.max(1,y(v.low)-y(v.high))} fill="var(--viz-muted)" opacity=".3"/><path d={`M${x(v.from)} ${y(v.mid)}H${x(v.to)}`} stroke="var(--viz-muted)"/><path d={`M${x(v.from)} ${y(v.mid*(1-mos))}H${x(v.to)}`} stroke="var(--buy)" strokeDasharray="3 2"/></g>)}<path d={ps.map(([t,p],i)=>`${i?'L':'M'}${x(year(t))} ${y(p)}`).join(' ')} stroke="var(--ink)" fill="none" strokeWidth="1.5"/></svg><div>{Math.floor(start)}–{Math.floor(end)} · annual estimates</div></figure>;
}
