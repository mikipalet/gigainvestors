import type { Dossier, PriceMap } from '@/lib/value/types';
import { formatMetric } from '@/lib/value/metric-labels';
import { useWidth } from '@/lib/value/viz/use-width';
export function MiniDollar({retained,created,first,last}:{retained:number|null;created:number|null;first?:number|null;last?:number|null}){
 if(retained===null||created===null||retained<=0)return null;
 const ratio=created/retained,max=Math.max(1,ratio,0);
 return <figure className="mini-dollar"><figcaption>{first&&last?`${first}–${last}`:'Over the measured period'} · kept → created</figcaption><div><span>$1 kept</span><i style={{width:`${1/max*55}%`}}/></div><div><span>${ratio.toFixed(2)} created</span><i style={{width:`${Math.max(0,ratio)/max*55}%`,background:ratio>=1?'var(--buy)':'var(--sell)'}}/></div></figure>;
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
 const height=width<400?146:174,left=42,right=width-8,top=12,bottom=height-22;
 const x=(n:number)=>left+(n-start)/(end-start||1)*(right-left),y=(n:number)=>bottom-n/max*(bottom-top);
 const tick=(n:number)=>new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:0}).format(n);
 const current=dossier.valuation?.perShareTrading??dossier.valuation?.perShare;
 const segments=vs.filter(v=>v[0]+1>=start).map(([fy,low,mid,high])=>({from:Math.max(start,fy),to:Math.min(end,fy+1),low,mid,high}));
 if(current&&end>vs.at(-1)![0]+1)segments.push({from:Math.max(start,vs.at(-1)![0]+1),to:end,...current});
 return <figure ref={ref} className="mini-price"><figcaption><span>Price</span><span>Estimated range</span><span>Buy price</span></figcaption><svg viewBox={`0 0 ${width} ${height}`} aria-label="Monthly price against fiscal-year value range and buy line"><path d={`M${left} ${top}V${bottom}H${right}`} fill="none" stroke="var(--viz-grid)"/>{[0,max/2,max].map(v=><g key={v}><text x={left-6} y={y(v)+4} textAnchor="end">{tick(v)}</text><path d={`M${left} ${y(v)}H${right}`} stroke="var(--viz-grid)" opacity=".5"/></g>)}<text x={left} y={height-3}>{Math.floor(start)}</text><text x={right} y={height-3} textAnchor="end">{Math.floor(end)}</text>{segments.map((v,i)=><g key={i}><rect x={x(v.from)} width={Math.max(0,x(v.to)-x(v.from))} y={y(v.high)} height={Math.max(1,y(v.low)-y(v.high))} fill="var(--viz-muted)" opacity=".3"/><path d={`M${x(v.from)} ${y(v.mid)}H${x(v.to)}`} stroke="var(--viz-muted)"/><path d={`M${x(v.from)} ${y(v.mid*(1-mos))}H${x(v.to)}`} stroke="var(--buy)" strokeDasharray="3 2"/></g>)}<path d={ps.map(([t,p],i)=>`${i?'L':'M'}${x(year(t))} ${y(p)}`).join(' ')} stroke="var(--ink)" fill="none" strokeWidth="1.5"/></svg><div>{dossier.company.currency} per share · annual estimates</div></figure>;
}
