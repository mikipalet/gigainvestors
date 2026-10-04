import {sitemapPart,sitemapParts,xmlResponse} from '@/lib/agents/sitemap';
import {requestSite} from '@/lib/agents/urls';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{part:string}>}){
 const part=(await params).part.replace(/\.xml$/,'');
 if(!sitemapParts.some(p=>p===part))return new Response('Not found',{status:404});
 return xmlResponse(await sitemapPart(requestSite(request),part));
}
