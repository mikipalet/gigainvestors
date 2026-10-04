import {getDossier,getPrice,readStore} from '@/lib/value/store';
import {companyMarkdown} from '@/lib/agents/company';
import {holderObservations} from '@/lib/agents/holder-observations';
import {companyUrl} from '@/lib/agents/urls';
import {companyTicker,dossierId} from '@/lib/company-route';
import {getIndex,getStock} from '@/lib/data';
import {md,stockMarkdown} from '@/lib/agent-content';
import type {SnapshotRow} from '@/lib/value/types';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{ticker:string}>}){
 const ticker=companyTicker(decodeURIComponent((await params).ticker));
 const [dossier,stock,index]=await Promise.all([getDossier(dossierId(ticker)),getStock(ticker),getIndex()]);
 if(!dossier&&!stock)return md('# Not found',404);
 const q=new URL(request.url).searchParams.get('q')?.replace(/\s/g,'');
 if(q&&!/^\d{4}Q[1-4]$/.test(q))return md('# Invalid quarter',400);
 let content='';
 if(dossier){
  if(q){
   const row=(await readStore<SnapshotRow[]>(`history/${q}.json`))?.find(r=>r[0]===dossier.id);
   if(!row)return md('# Quarter not found',404);
   content=`# ${dossier.company.name} (${ticker})\n\nCanonical: ${companyUrl(dossier.id)}?q=${q}\n\nQuarter: ${q}\n\nQuality tests (understandable, moat, economics, management, accounting): ${row[1]}\n\nPublished buy qualification: ${row[3]?'yes':'no'}\n\nQuarter-end observations:\n\n${JSON.stringify(row[5]??{})}\n\nQuality observation periods:\n\n${JSON.stringify(row[7]?.qualityLtm??{})}`;
  }else content=companyMarkdown(dossier,await getPrice(dossier.id,dossier.company.country))+'\n\n## Reported holder observations\n\n'+await holderObservations(dossier);
 }
 if(stock&&index){
  const quarter=q?stock.quarters.find(row=>row.q.replace(/\s/g,'')===q)?.q:undefined;
  if(!q||quarter){const selected=quarter?{...stock,quarters:stock.quarters.filter(row=>row.q<=quarter)}:stock;content+='\n\n'+stockMarkdown(selected,Object.fromEntries(index.investors.map(i=>[i.code,i.person])),quarter);}
  else if(!dossier)return md('# Quarter not found',404);
 }
 const response=md(content);response.headers.set('Link',`<${companyUrl(ticker)}${q?'?q='+q:''}>; rel="canonical"`);return response;
}
