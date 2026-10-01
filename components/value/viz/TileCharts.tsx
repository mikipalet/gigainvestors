import { ChartInteraction } from './ChartInteraction';
import type { Dossier, PriceMap } from '@/lib/value/types';
import { useWidth } from '@/lib/value/viz/use-width';
export function MiniDollar({retained,created,first,last,fluid=false}:{retained:number|null;created:number|null;first?:number|null;last?:number|null;fluid?:boolean}){
 const {ref,width,height:availableHeight}=useWidth();
 if(retained===null||created===null||retained<=0)return null;
 const ratio=created/retained,max=Math.max(1,ratio,0);
 const labelWidth=Math.min(112,width*.6),barWidth=Math.max(12,width-labelWidth-4);
 const period=first&&last?`${first}–${last}`:'Measured period';
 const height=fluid?Math.max(70,availableHeight-24):66,keptY=height*.27,createdY=height*.73,barHeight=fluid?Math.min(36,height*.18):14;
 return <figure ref={ref} className="mini-dollar" style={{visibility:fluid&&!availableHeight?'hidden':undefined}}><figcaption>{period} · kept → created</figcaption><ChartInteraction width={width} height={height} label="Retained dollar" points={[{x:labelWidth+1/max*barWidth,y:keptY,text:`${period} · $1 retained. Passing bar: create at least $1.`},{x:labelWidth+Math.max(0,ratio)/max*barWidth,y:createdY,text:`${period} · $${ratio.toFixed(2)} created per $1 retained. Passing bar: ≥ $1.`}]}><svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}><text x="0" y={keptY+4}>$1 kept</text><rect x={labelWidth} y={keptY-barHeight/2} width={1/max*barWidth} height={barHeight} fill="var(--viz-muted)"/><text x="0" y={createdY+4}>${ratio.toFixed(2)} created</text><rect x={labelWidth} y={createdY-barHeight/2} width={Math.max(0,ratio)/max*barWidth} height={barHeight} fill="var(--buy)"/></svg></ChartInteraction></figure>;
}
export function MiniPrice({dossier,quote,height:chartHeight,fluid=false}:{dossier:Dossier;quote:PriceMap[string]|null;height?:number;fluid?:boolean}){
 const {ref,width,height:availableHeight}=useWidth();
 const values=dossier.valueHistory?.filter(v=>v.every(Number.isFinite)&&v.slice(1).every(n=>n>0))??[];
 const history=dossier.priceHistory??[];
 if(!values.length||!history.length)return null;
 const year=(date:string)=>Number(date.slice(0,4))+(Number(date.slice(5,7))-1)/12;
 const prices=quote?[...history.filter(p=>p[0]<quote[1]),[quote[1],quote[0]] as [string,number]]:history;
 const start=year(prices[0][0]),end=year(prices.at(-1)![0]);
 const visible=values.filter(v=>v[0]+1>=start),vs=visible.length?visible:[values.at(-1)!],ps=prices.filter(p=>year(p[0])>=start);
 const mos=dossier.requiredMos??.25,max=Math.max(...vs.map(v=>v[3]),...ps.map(p=>p[1]))*1.05;
 const height=fluid?Math.max(150,availableHeight-44):chartHeight??(width<500?146:260),left=42,right=width-8,top=12,bottom=height-22;
 const x=(n:number)=>left+(n-start)/(end-start||1)*(right-left),y=(n:number)=>bottom-n/max*(bottom-top);
 const tick=(n:number)=>new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:0}).format(n);
 const current=dossier.valuation?.perShareTrading??dossier.valuation?.perShare;
 const segments=vs.filter(v=>v[0]+1>=start).map(([fy,low,mid,high])=>({from:Math.max(start,fy),to:Math.min(end,fy+1),low,mid,high}));
 if(current&&end>vs.at(-1)![0]+1)segments.push({from:Math.max(start,vs.at(-1)![0]+1),to:end,...current});
 return <figure ref={ref} className="mini-price" style={{visibility:fluid&&!availableHeight?'hidden':undefined}}><figcaption><span>Price</span><span>Estimated range</span><span>Buy price</span></figcaption><ChartInteraction width={width} height={height} label="Price and estimated value" points={ps.map(([date,p])=>{const v=segments.find(v=>year(date)>=v.from&&year(date)<=v.to);return {x:x(year(date)),y:y(p),text:`${date.slice(0,7)} · Price ${dossier.company.currency} ${p.toFixed(2)}${v?` · Value ${v.mid.toFixed(2)} · Buy below ${(v.mid*(1-mos)).toFixed(2)}`:''}`};})}><svg viewBox={`0 0 ${width} ${height}`} aria-label="Monthly price against fiscal-year value range and buy line"><path d={`M${left} ${top}V${bottom}H${right}`} fill="none" stroke="var(--viz-grid)"/>{[0,max/2,max].map(v=><g key={v}><text x={left-6} y={y(v)+4} textAnchor="end">{tick(v)}</text><path d={`M${left} ${y(v)}H${right}`} stroke="var(--viz-grid)" opacity=".5"/></g>)}<text x={left} y={height-3}>{Math.floor(start)}</text><text x={right} y={height-3} textAnchor="end">{Math.floor(end)}</text>{segments.map((v,i)=><g key={i}><rect x={x(v.from)} width={Math.max(0,x(v.to)-x(v.from))} y={y(v.high)} height={Math.max(1,y(v.low)-y(v.high))} fill="#779971" opacity=".65" stroke="#536e50" strokeWidth=".5"/><path d={`M${x(v.from)} ${y(v.mid)}H${x(v.to)}`} stroke="var(--viz-muted)"/><path d={`M${x(v.from)} ${y(v.mid*(1-mos))}H${x(v.to)}`} stroke="var(--buy)" strokeDasharray="3 2"/></g>)}<path d={ps.map(([t,p],i)=>`${i?'L':'M'}${x(year(t))} ${y(p)}`).join(' ')} stroke="var(--ink)" fill="none" strokeWidth="1.5"/></svg></ChartInteraction><div>{dossier.company.currency} per share · annual estimates</div></figure>;
}
