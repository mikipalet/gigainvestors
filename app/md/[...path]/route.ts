import {forwardMarkdown} from '@/lib/agents/forward';
import {listIssues} from '@/lib/newsletter/store';
import {NOTHING,ZINGERS} from '@/lib/munger-content';
import {holderObservations} from '@/lib/agents/holder-observations';
import {getDossier,getPrice,getForwardRecord} from '@/lib/value/store';
import {methodMarkdown} from '@/lib/agents/method';
import {companyMarkdown} from '@/lib/agents/company';
import {loadChecklist,checklistMarkdown} from '@/lib/agents/checklist';
import {searchMarkdown} from '@/lib/agents/catalog';
import {md} from '@/lib/agent-content';
import {siteUrl,companyUrl} from '@/lib/agents/urls';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{path:string[]}>}) {
 const {path}=await params, url=new URL(request.url);
 let content:string|null=null,canonical=siteUrl('value');
 if(path.join('/')==='search') {const q=url.searchParams.get('q')??'';if(!q.trim()||q.length>100)return md('# Search\n\nUse ?q= with 1–100 characters.',400);content=await searchMarkdown(q);canonical=siteUrl('main',`/search.md?q=${encodeURIComponent(q)}`);}
 else if(path.join('/')==='munger'){content=['# Charlie Munger',NOTHING,...ZINGERS.map(q=>`- ${q}`)].join('\n\n');canonical=siteUrl('main','/munger');}
 else if(path.join('/')==='newsletter'){content=['# The quarter, by email',...listIssues().map(i=>`- [${i.quarter}: ${i.headline}](${siteUrl('main',`/newsletter/${i.slug}.md`)}); published ${i.builtAt}.`)].join('\n\n');canonical=siteUrl('main','/newsletter');}
 else if(path[0]==='value'){
  if(path.length===1||path[1]==='year'&&path.length===3){
   const frame=path[1]==='year'?`${path[2]}Q4`:url.searchParams.get('q')??(url.searchParams.has('year')?`${url.searchParams.get('year')}Q4`:undefined);
   if(frame&&!/^\d{4}Q[1-4]$/.test(frame))return md('# Invalid quarter',400);
   const filter=Object.fromEntries(url.searchParams);
   const data=await loadChecklist(frame,true);
   if(data){content=checklistMarkdown(data.rows,data.meta,frame,filter);canonical=siteUrl('value',frame?`/?q=${frame}`:'/');}
  }else if(path.join('/')==='value/method'){content=methodMarkdown();canonical=siteUrl('value','/method');}
  else if(path.join('/')==='value/forward'){content=forwardMarkdown(await getForwardRecord());canonical=siteUrl('value','/forward');}
  else if(path.length===2&&/^[a-z0-9&.-]{1,24}\.[a-z]{1,5}$/i.test(path[1])){
   const dossier=await getDossier(path[1].toUpperCase());
   if(dossier){content=companyMarkdown(dossier,await getPrice(dossier.id,dossier.company.country))+'\n\n## Reported holder observations\n\n'+await holderObservations(dossier);canonical=companyUrl(dossier.id);}
  }
 }
 if(content===null)return md('# Not found',404);
 const response=md(content);response.headers.set('Link',`<${canonical}>; rel="canonical", <${siteUrl('value','/llms.txt')}>; rel="describedby"`);return response;
}
