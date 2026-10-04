import {llmsText} from '@/lib/agents/llms';
import {requestSite} from '@/lib/agents/urls';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
 return new Response(await llmsText(requestSite(request)),{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=0, must-revalidate'}});
}
