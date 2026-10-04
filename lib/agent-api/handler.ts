import {resolveRoute,ROUTES,pricing} from './config';
import {paidResponse,apiError,hash} from './payment';
import {executeEndpoint,parseQuery,DataError} from './data';
import {schemas} from './schemas';
import {openapi} from './openapi';
import {AGENT_GUIDE} from './guide';
export function discovery(origin:string){return {x402Version:2,name:'GigaInvestors',description:'Derived investment research, paid per call in USDC',api:origin+'/api/v1',openapi:origin+'/api/v1/openapi.json',pricing:origin+'/api/v1/pricing',guide:origin+'/api/v1/guide',...pricing()};}
function freeJSON(request:Request,data:unknown){
 const body=JSON.stringify(data),etag='"'+hash(body)+'"',headers={'Content-Type':'application/json','Cache-Control':'public, max-age=60','ETag':etag};
 return request.headers.get('If-None-Match')===etag?new Response(null,{status:304,headers}):new Response(body,{headers});
}
export async function handleAPI(request:Request):Promise<Response>{
 const url=new URL(request.url),path=url.pathname.replace(/\/$/,'');
 if(path==='/api/v1')return freeJSON(request,{apiVersion:'v1',name:'GigaInvestors Agent API',payment:'x402 v2 exact USDC',links:{openapi:'/api/v1/openapi.json',pricing:'/api/v1/pricing',guide:'/api/v1/guide',discovery:'/.well-known/x402'},routes:ROUTES.map(r=>({path:'/api/v1'+r.path,description:r.description}))});
 if(path==='/api/v1/openapi.json')return freeJSON(request,openapi(url.origin));
 if(path==='/api/v1/pricing')return freeJSON(request,pricing());
 if(path==='/.well-known/x402')return freeJSON(request,discovery(url.origin));
 if(path==='/api/v1/guide')return new Response(AGENT_GUIDE,{headers:{'Content-Type':'text/markdown; charset=utf-8','Cache-Control':'public, max-age=60'}});
 const route=resolveRoute(path);if(!route)return apiError(404,'route_not_found','See /api/v1 for available routes.');
 try{
  const q=parseQuery(url.searchParams,route);
  return paidResponse(request,route,async()=>{
   try{
    const result=await executeEndpoint(route,path,q);
    const validated=schemas[route.id].safeParse(result);
    if(!validated.success)return apiError(503,'invalid_publication','Published research does not match this API contract. No payment was settled.');
    return Response.json({apiVersion:'v1',data:validated.data});
   }catch(e){if(e instanceof DataError)return apiError(e.status,e.code,e.message);return apiError(503,'data_unavailable','Published research is temporarily unavailable. No payment was settled.');}
  });
 }catch(e){if(e instanceof DataError)return apiError(e.status,e.code,e.message);return apiError(503,'service_unavailable','API temporarily unavailable.');}
}
export function cors(response:Response){
 response.headers.set('Access-Control-Allow-Origin','*');response.headers.set('Access-Control-Expose-Headers','PAYMENT-REQUIRED, PAYMENT-RESPONSE, ETag');return response;
}
