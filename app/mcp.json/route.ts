import {mcpDiscovery} from '@/lib/agents/mcp';
import {requestSite} from '@/lib/agents/urls';
export async function GET(request:Request){return Response.json(mcpDiscovery(requestSite(request)),{headers:{'Cache-Control':'public, max-age=3600'}});}
