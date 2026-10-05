import {getDossier} from '@/lib/value/store';
import {permanentRedirect} from 'next/navigation';
import {companyPath} from '@/lib/company-route';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]>>}){
 const query=new URLSearchParams();for(const [key,value] of Object.entries(await searchParams)){for(const item of Array.isArray(value)?value:[value])query.append(key,item);}
 const id=(await params).id;const dossier=await getDossier(id);
 permanentRedirect(`${companyPath(dossier?.id??id)}${query.size?'?'+query:''}`);
}
