import {notFound} from 'next/navigation';
import {getDossier,getPrice,getSearchCompany,readStore} from '@/lib/value/store';
import {getIndex,getStock} from '@/lib/data';
import {companyTicker,companyPath,dossierId} from '@/lib/company-route';
import {StockContent} from '@/components/AgentContent';
import {Company} from '@/components/company/Company';
import type {HistoryIndex} from '@/lib/value/time-travel';
import {Stock} from './Stock';
export const revalidate=86400;
export const dynamicParams=true;
export async function generateStaticParams(){
 // Other canonical company pages are generated on first visit and cached.
 return ['AAPL','PLX.PA','7203.JP','ADBE','GOOGL','KO','JPM','LULU'].map(ticker=>({ticker}));
}
export async function generateMetadata({params}:{params:Promise<{ticker:string}>}){
 const ticker=companyTicker(decodeURIComponent((await params).ticker));
 const [dossier,stock]=await Promise.all([getDossier(dossierId(ticker)),getStock(ticker)]);
 const name=dossier?.company.name??stock?.name??ticker;
 return {title:`${name} · GigaInvestors`,description:`${name}: business quality, price, and superinvestor holdings.`,alternates:{canonical:`https://gigainvestors.com${companyPath(ticker)}`}};
}
export default async function Page({params,searchParams}:{params:Promise<{ticker:string}>;searchParams?:Promise<{q?:string}>}){
 const ticker=companyTicker(decodeURIComponent((await params).ticker));
 const [dossier,stock,index]=await Promise.all([getDossier(dossierId(ticker)),getStock(ticker),getIndex()]);
 if(!dossier&&(!stock||!stock.quarters.length))notFound();
 const investors=Object.fromEntries((index?.investors??[]).map(i=>[i.code,{slug:i.slug,person:i.person,sketch:i.sketch}]));
 if(dossier){
  if(/[^\x00-\x7F]/.test(dossier.company.name)){
   const listing=await getSearchCompany(dossier.id);
   if(listing&&/^[\x00-\x7F]+$/.test(listing[1]))dossier.company={...dossier.company,name:listing[1]};
  }
  const [quote,history]=await Promise.all([getPrice(dossier.id,dossier.company.country),readStore<HistoryIndex>('history/index.json')]);
  const quarters=[...new Set([...(history?.quarters??[]),...(index?.quarters??[])].map(q=>q.replace(/\s/g,'')))].sort();
  const initialQuarter=(await searchParams)?.q?.replace(/\s/g,'');
  return <Company initialQuarter={initialQuarter} dossier={dossier} quote={quote} stock={stock} investors={investors} quarters={[...quarters,'Today']}/>;
 }
 return <><StockContent stock={stock!} people={Object.fromEntries(Object.entries(investors).map(([c,m])=>[c,m.person]))}/><Stock stock={stock!} investors={investors}/></>;
}
