import { createHash } from 'node:crypto';
import { HTTPFacilitatorClient, type FacilitatorClient } from '@x402/core/server';
import { PaymentPayloadV2Schema } from '@x402/core/schemas';
import type { PaymentPayload, PaymentRequirements } from '@x402/core/types';
import { declarePaymentIdentifierExtension, extractPaymentIdentifier } from '@x402/extensions/payment-identifier';
import { createFacilitatorConfig } from '@coinbase/x402';
import { PRICES, paymentConfig, type PaymentConfig, type Route } from './config';
import { paymentJournal, type Journal, type JournalEntry } from './journal';
import { logUsage, type Usage } from './usage';
export const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
function canonical(value:unknown):string {
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
 return JSON.stringify(value);
}
export function paymentRequirements(route:Route,config:PaymentConfig):PaymentRequirements {
 return {scheme:'exact',network:config.network,asset:config.network==='eip155:8453'?'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913':'0x036CbD53842c5426634e7929541eC2318f3dCF7e',amount:String(PRICES[route.price]),payTo:config.payTo,maxTimeoutSeconds:300,extra:{name:'USD Coin',version:'2'}};
}
export function apiError(status:number,code:string,message:string) {
 return Response.json({apiVersion:'v1',error:{code,message}},{status,headers:{'Cache-Control':'private, no-store','Vary':'PAYMENT-SIGNATURE'}});
}
function challenge(request:Request,route:Route,config:PaymentConfig,error?:string){
 const body={x402Version:2,...(error?{error}:{}),resource:{url:request.url,description:route.description,mimeType:'application/json'},accepts:[paymentRequirements(route,config)],extensions:{'payment-identifier':declarePaymentIdentifierExtension(false)}};
 return Response.json(body,{status:402,headers:{'PAYMENT-REQUIRED':Buffer.from(JSON.stringify(body)).toString('base64'),'Cache-Control':'private, no-store','Vary':'PAYMENT-SIGNATURE'}});
}
interface Dependencies {config:PaymentConfig;journal:Journal;facilitator:Pick<FacilitatorClient,'verify'|'settle'>;log:(entry:Usage)=>Promise<void>}
export function facilitatorClient(config:PaymentConfig) {
 const cdp=config.facilitatorUrl==='https://api.cdp.coinbase.com/platform/v2/x402';
 if(cdp&&(!process.env.CDP_API_KEY_ID||!process.env.CDP_API_KEY_SECRET))throw Error('CDP facilitator credentials are not configured');
 return new HTTPFacilitatorClient(cdp?{...createFacilitatorConfig(process.env.CDP_API_KEY_ID,process.env.CDP_API_KEY_SECRET),timeoutMs:45_000}:{url:config.facilitatorUrl,timeoutMs:45_000});
}
/** Payment middleware for App Router handlers. Settle only a successfully prepared response. */
export async function paidResponse(request:Request,route:Route,handler:()=>Promise<Response>,deps?:Dependencies):Promise<Response> {
 let config:PaymentConfig;
 try{config=deps?.config??paymentConfig();}catch{return apiError(503,'payments_unconfigured','The owner must configure the receiving address and network.');}
 const header=request.headers.get('PAYMENT-SIGNATURE');
 if(!header)return challenge(request,route,config);
 let payload:PaymentPayload;
 try{if(header.length>24_000)throw Error();payload=PaymentPayloadV2Schema.parse(JSON.parse(Buffer.from(header,'base64').toString('utf8'))) as PaymentPayload;}catch{return apiError(400,'invalid_payment','Malformed x402 v2 PAYMENT-SIGNATURE.');}
 const requirements=paymentRequirements(route,config);
 if(canonical(payload.accepted)!==canonical(requirements))return challenge(request,route,config,'payment_requirements_mismatch');
 if(payload.resource?.url!==request.url)return apiError(400,'resource_mismatch','Payment resource must match the complete request URL.');
 // Support only USDC EIP-3009 authorization, not an alternate unadvertised transfer flow.
 const auth=payload.payload.authorization as {from?:string;nonce?:string}|undefined;
 if(!auth?.from||!/^0x[\da-f]{40}$/i.test(auth.from)||!auth.nonce||!/^0x[\da-f]{64}$/i.test(auth.nonce)||typeof payload.payload.signature!=='string')return apiError(400,'invalid_authorization','An EIP-3009 USDC authorization is required.');
 const id=extractPaymentIdentifier(payload);
 const idExtension=payload.extensions?.['payment-identifier'] as {info?:{id?:unknown}}|undefined;
 if(idExtension?.info?.id!==undefined&&!id)return apiError(400,'invalid_payment_id','Payment identifier must be 16–128 letters, digits, hyphens or underscores.');
 const key=hash([config.network,config.payTo.toLowerCase(),auth.from.toLowerCase(),id??auth.nonce.toLowerCase()].join(':'));
 const fingerprint=hash(canonical({url:request.url,payment:payload}));
 let journal:Journal,facilitator:Dependencies['facilitator'];
 try{journal=deps?.journal??paymentJournal();facilitator=deps?.facilitator??facilitatorClient(config);}catch{return apiError(503,'payments_unavailable','Payment storage or facilitator configuration is unavailable.');}
 const replay=async(entry:JournalEntry|null)=>{
  if(entry?.fingerprint!==fingerprint)return apiError(409,'payment_conflict','This payment identifier belongs to a different request or signed payment. Reuse the original PAYMENT-SIGNATURE.');
  if(entry.state==='complete'&&entry.response){
   if(entry.usage&&!entry.logged)try{await (deps?.log??logUsage)(entry.usage);await journal.save(key,{...entry,logged:true});}catch{/* Durable event remains in journal for the next retry. */}
   return new Response(entry.response.body,{status:entry.response.status,headers:entry.response.headers});
  }
  return apiError(409,'payment_pending','Payment is processing or its settlement is uncertain. Retry the same signed request; do not create another payment.');
 };
 try{
  const saved=await journal.read(key);if(saved)return replay(saved);
  const verified=await facilitator.verify(payload,requirements);
  if(!verified.isValid)return challenge(request,route,config,'payment_verification_failed');
  if(!await journal.claim(key,{fingerprint,state:'pending'}))return replay(await journal.read(key));
  let response:Response;
  try{response=await handler();}catch{await journal.release(key);return apiError(503,'data_unavailable','Research data is temporarily unavailable. No payment was settled.');}
  if(response.status>=400){await journal.release(key);return response;}
  // Materialize body BEFORE settlement. A serialization/stream failure must not charge.
  let body:string;
  try{body=await response.text();}catch{await journal.release(key);return apiError(503,'response_unavailable','Could not prepare the response. No payment was settled.');}
  let settlement;
  try{settlement=await facilitator.settle(payload,requirements);}catch{
   await journal.save(key,{fingerprint,state:'uncertain'});
   return apiError(503,'settlement_uncertain','Settlement outcome is uncertain. Retry this signed request only; operator reconciliation may be needed.');
  }
  if(!settlement.success){const failed=challenge(request,route,config,'payment_settlement_failed');await journal.save(key,{fingerprint,state:'complete',response:{status:failed.status,body:await failed.clone().text(),headers:Object.fromEntries(failed.headers)}});return failed;}
  const headers=new Headers(response.headers);
  headers.set('PAYMENT-RESPONSE',Buffer.from(JSON.stringify(settlement)).toString('base64'));
  headers.set('Cache-Control','private, no-store');headers.set('Vary','PAYMENT-SIGNATURE');
  headers.set('ETag','"'+hash(body)+'"');
  const stored={status:response.status,body,headers:Object.fromEntries(headers)};
  const usage={date:new Date().toISOString(),route:route.path,amount:requirements.amount,network:config.network,transaction:settlement.transaction,requestId:key};
  await journal.save(key,{fingerprint,state:'complete',response:stored,usage,logged:false});
  try{await (deps?.log??logUsage)(usage);await journal.save(key,{fingerprint,state:'complete',response:stored,usage,logged:true});}catch{console.error('agent-api: usage log write failed; receipt retained in payment journal');}
  return new Response(body,{status:stored.status,headers});
 }catch{return apiError(503,'payment_service_unavailable','Payment service unavailable. Retry the same signed request.');}
}
