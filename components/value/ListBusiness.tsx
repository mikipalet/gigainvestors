'use client';
import {useEffect,useState} from 'react';
import {fetchValueData} from '@/lib/value/data-source';
import {shardOf} from '@/lib/value/shard';
import type {Dossier} from '@/lib/value/types';
import {ChartInteraction} from './viz/ChartInteraction';
export function ListBusiness({id,buyPrice,currency}:{id:string;buyPrice:number|null;currency:string}){
 const [dossier,setDossier]=useState<Dossier|null>(null);
 useEffect(()=>{let live=true;fetchValueData<Record<string,Dossier>>(`dossiers/${shardOf(id)}.json`).then(d=>{if(live)setDossier(d[id]??null);}).catch(()=>{});return()=>{live=false;};},[id]);
 const line=dossier?.ownerMemo?.lines.find(l=>l.question===1)?.answer;
 const prices=dossier?.priceHistory?.slice(-24)??[],w=280,h=62,values=prices.map(p=>p[1]);
 const low=Math.min(...values,buyPrice??Infinity),high=Math.max(...values,buyPrice??-Infinity);
 const points=prices.map(([date,p],i)=>({x:8+i*264/Math.max(1,prices.length-1),y:8+(high-p)/(high-low||1)*46,text:`${date} · ${currency} ${p.toFixed(2)}${buyPrice?` · Buy below ${currency} ${buyPrice.toFixed(2)}`:''}`}));
 return <div className="list-business">{line&&<p>{line}</p>}{points.length>1&&<ChartInteraction width={w} height={h} label="Price and current buy price" points={points}><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Two-year price history against today's buy price">{buyPrice!==null&&<path d={`M8 ${8+(high-buyPrice)/(high-low||1)*46}H272`} stroke="var(--buy)" strokeDasharray="3 3"/>}<polyline points={points.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></ChartInteraction>}</div>;
}
