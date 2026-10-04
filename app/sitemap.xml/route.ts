import {sitemapIndex,xmlResponse} from '@/lib/agents/sitemap';
import {requestSite} from '@/lib/agents/urls';
export const dynamic='force-dynamic';
export async function GET(request:Request){return xmlResponse(sitemapIndex(requestSite(request)));}
