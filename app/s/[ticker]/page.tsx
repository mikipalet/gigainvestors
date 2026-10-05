import {companyAlternates} from '@/lib/agents/urls';
import {notFound} from 'next/navigation';
import {getDossier,getPrice,getSearchCompany,getCompanyStock} from '@/lib/value/store';
import {getIndex,getStock} from '@/lib/data';
import {companyTicker,companyPath,dossierId} from '@/lib/company-route';
import {StockContent} from '@/components/AgentContent';
import {Company} from '@/components/company/Company';
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
 return {title:`${name} · GigaInvestors`,description:`${name}: business quality, price, and superinvestor holdings.`,alternates:companyAlternates(ticker)};
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
  const quote=await getPrice(dossier.id,dossier.company.country);
  return <Company dossier={dossier} quote={quote} stock={await getCompanyStock(dossier)} investors={investors}/>;
 }
 return <><Stock stock={stock!} investors={investors}/></>;
}
