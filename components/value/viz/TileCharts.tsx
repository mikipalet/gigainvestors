import {formatMetric} from '@/lib/value/metric-labels';
import { ChartInteraction } from './ChartInteraction';
import type { Dossier, PriceMap } from '@/lib/value/types';
import { useWidth } from '@/lib/value/viz/use-width';
export function MiniDollar({retained,created,first,last,fluid=false,dense=false,currency=''}:{retained:number|null;created:number|null;first?:number|null;last?:number|null;fluid?:boolean;dense?:boolean;currency?:string}){
 const {ref,width,height:available}=useWidth();
 if(retained===null||created===null)return null;
 const height=dense?70:fluid?Math.max(70,available-44):90,left=20,right=width-12,top=22,bottom=height-(dense?22:44);
 const min=Math.min(0,retained,created),max=Math.max(0,retained,created),y=(n:number)=>bottom-(n-min)/(max-min||1)*(bottom-top);
 const period=first&&last?`${first}–${last}`:'Measured period',bars=[{label:'Retained',value:retained},{label:'Value created',value:created}];
 const fmt=(value:number)=>formatMetric({value,format:'money',currency});
 return <figure ref={ref} className="mini-dollar" data-window={JSON.stringify({first,last,retained,created})} data-currency={currency}><figcaption>{period} · retained → value created</figcaption><ChartInteraction width={width} height={height} label="Retained earnings and value created" points={bars.map((b,i)=>({x:left+(i+.5)*(right-left)/2,y:y(b.value),text:`${period} · ${b.label}: ${fmt(b.value)}`}))}><svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}><path d={`M${left} ${y(0)}H${right}`} stroke="var(--viz-grid)"/>{bars.map((b,i)=>{const x=left+(i+.5)*(right-left)/2,w=Math.min(80,(right-left)/4);return <g key={b.label}><rect x={x-w/2} y={Math.min(y(0),y(b.value))} width={w} height={Math.max(1,Math.abs(y(0)-y(b.value)))} fill={i?'var(--buy)':'var(--viz-muted)'}/><text x={x} y={dense?14:b.value>=0?y(b.value)-7:y(b.value)+14} textAnchor="middle">{fmt(b.value)}</text><text x={x} y={height-2} textAnchor="middle">{b.label}</text></g>})}</svg></ChartInteraction></figure>;
}
export function MiniPrice({dossier,quote,height:chartHeight,fluid=false,dense=false,minimumHeight=150}:{dossier:Dossier;quote:PriceMap[string]|null;height?:number;fluid?:boolean;dense?:boolean;minimumHeight?:number}){
 const {ref,width,height:availableHeight}=useWidth();
 const values=dossier.valueHistory?.filter(v=>v.every(Number.isFinite)&&v.slice(1).every(n=>n>0))??[];
 const history=dossier.priceHistory??[];
 if(!values.length||!history.length)return null;
 const year=(date:string)=>Number(date.slice(0,4))+(Number(date.slice(5,7))-1)/12;
 const prices=quote?[...history.filter(p=>p[0]<quote[1]),[quote[1],quote[0]] as [string,number]]:history;
 const quoteStart=year(prices[0][0]),end=year(prices.at(-1)![0]),sparse=dense&&Math.floor(quoteStart)===Math.floor(end);
 const start=sparse?Math.min(quoteStart,values[0][0]):quoteStart;
 const visible=values.filter(v=>v[0]+1>=start),vs=visible.length?visible:[values.at(-1)!],ps=prices.filter(p=>year(p[0])>=start);
 const mos=dossier.requiredMos??.25,max=Math.max(...vs.map(v=>v[3]),...ps.map(p=>p[1]))*1.05;
 const height=dense?minimumHeight:fluid?Math.max(minimumHeight,availableHeight-44):chartHeight??(width<500?146:260),left=42,right=width-8,top=12,bottom=height-22;
 const x=(n:number)=>left+(n-start)/(end-start||1)*(right-left),y=(n:number)=>bottom-n/max*(bottom-top);
 const tick=(n:number)=>new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:0}).format(n);
 const current=dossier.valuation?.perShareTrading??dossier.valuation?.perShare;
 const segments=vs.filter(v=>v[0]+1>=start).map(([fy,low,mid,high])=>({from:Math.max(start,fy),to:Math.min(end,fy+1),low,mid,high}));
 if(current&&end>vs.at(-1)![0]+1)segments.push({from:Math.max(start,vs.at(-1)![0]+1),to:end,...current});
 const points=ps.map(([date,p])=>{const v=segments.find(v=>year(date)>=v.from&&year(date)<=v.to);return {x:x(year(date)),y:y(p),text:`${date.slice(0,7)} · Price ${dossier.company.currency} ${p.toFixed(2)}${v?` · Value ${v.mid.toFixed(2)} · Buy below ${(v.mid*(1-mos)).toFixed(2)}`:''}`};});
 if(sparse)for(const v of segments)points.push({x:x((v.from+v.to)/2),y:y(v.mid),text:`FY${Math.floor(v.from)} · Estimated value ${dossier.company.currency} ${v.mid.toFixed(2)} · Range ${v.low.toFixed(2)}–${v.high.toFixed(2)} · Buy below ${(v.mid*(1-mos)).toFixed(2)}`});
 points.sort((a,b)=>a.x-b.x);
 return <figure ref={ref} className="mini-price" data-prices={JSON.stringify(ps)} data-values={JSON.stringify(segments)} data-mos={mos} data-currency={dossier.company.currency} style={{visibility:fluid&&!availableHeight?'hidden':undefined}}><figcaption><span>Price</span><span>Estimated range</span><span>Buy price</span></figcaption><ChartInteraction width={width} height={height} label="Price and estimated value" points={points}><svg viewBox={`0 0 ${width} ${height}`} aria-label="Monthly price against fiscal-year value range and buy line"><path d={`M${left} ${top}V${bottom}H${right}`} fill="none" stroke="var(--viz-grid)"/>{(dense&&height<80?[0,max]:[0,max/2,max]).map(v=><g key={v}><text x={left-6} y={y(v)+4} textAnchor="end">{tick(v)}</text><path d={`M${left} ${y(v)}H${right}`} stroke="var(--viz-grid)" opacity=".5"/></g>)}<text x={left} y={height-3}>{Math.floor(start)}</text><text x={right} y={height-3} textAnchor="end">{Math.floor(end)}</text>{segments.map((v,i)=><g key={i}><rect x={x(v.from)} width={Math.max(0,x(v.to)-x(v.from))} y={y(v.high)} height={Math.max(1,y(v.low)-y(v.high))} fill="#779971" opacity=".65" stroke="#536e50" strokeWidth=".5"/><path d={`M${x(v.from)} ${y(v.mid)}H${x(v.to)}`} stroke="var(--viz-muted)"/><path d={`M${x(v.from)} ${y(v.mid*(1-mos))}H${x(v.to)}`} stroke="var(--buy)" strokeDasharray="3 2"/></g>)}<path d={ps.map(([t,p],i)=>`${i?'L':'M'}${x(year(t))} ${y(p)}`).join(' ')} stroke="var(--ink)" fill="none" strokeWidth="1.5"/></svg></ChartInteraction><div>{dossier.company.currency} per share · annual estimates</div></figure>;
}
