import {handleAPI,cors} from '@/lib/agent-api/handler';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=120;
export async function GET(request:Request){return cors(await handleAPI(request));}
// Never let Next's implicit HEAD handler execute and charge a paid GET.
export async function HEAD(){return new Response(null,{status:405,headers:{Allow:'GET, OPTIONS','Cache-Control':'no-store'}});}
export async function OPTIONS(){return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'PAYMENT-SIGNATURE, Content-Type, If-None-Match','Access-Control-Max-Age':'86400'}});}
