import {handleAPI,cors} from '@/lib/agent-api/handler';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return cors(await handleAPI(request));}
