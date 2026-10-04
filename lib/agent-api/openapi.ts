import {z} from 'zod';
import {ROUTES,PRICES} from './config';
import {schemas} from './schemas';
const json=(schema:unknown)=>({'application/json':{schema}});
const error={description:'Request rejected; no new payment is settled. For payment_pending, retry the original signed request.',content:json({type:'object',required:['apiVersion','error'],properties:{apiVersion:{const:'v1'},error:{type:'object',properties:{code:{type:'string'},message:{type:'string'}},required:['code','message']}}})};
export function openapi(origin:string) {
 const paths:Record<string,unknown>={};
 for(const route of ROUTES){
  const parameters:Array<Record<string,unknown>>=[{in:'header',name:'PAYMENT-SIGNATURE',required:false,description:'Base64 x402 v2 signed USDC payment payload. Not an API key. Obtain requirements from a 402 response.',schema:{type:'string'}}];
  for(const match of route.path.matchAll(/\{([^}]+)\}/g))parameters.push({in:'path',name:match[1],required:true,schema:{type:'string',...(match[1]==='quarter'?{pattern:'^\\d{4}Q[1-4]$'}:{})}});
  const add=(name:string,schema:unknown,description:string,required=false)=>parameters.push({in:'query',name,required,schema,description});
  if(['search','investors','companies','checklists','export','quarter'].includes(route.id)){
   add('q',{type:'string',maxLength:100},'Search text.',route.id==='search');
   add('limit',{type:'integer',minimum:1,maximum:route.id==='export'?10000:200,default:route.id==='export'?10000:50},'Maximum items per response. Search limit applies independently to investors and companies.');
   if(route.id!=='search')add('offset',{type:'integer',minimum:0,maximum:100000,default:0},'Pagination offset. A new page is a new paid call.');
  }
  if(['holdings','ownership'].includes(route.id))add('quarter',{type:'string',pattern:'^\\d{4}Q[1-4]$'},'Reported quarter; defaults to latest available.');
  if(['companies','checklists','export','quarter','history'].includes(route.id))add('markets',{type:'string',enum:['western','all'],default:'western'},'Western-accessible listings by default.');
  if(['companies','checklists','export','quarter'].includes(route.id)){
   add('list',{type:'string',enum:['buy-now','next-closest','all'],default:'all'},'Checklist selection. Uses the same buy and next-closest calculations as the website.');
   add('country',{type:'string',pattern:'^[A-Z]{2}$'},'Country code.');add('sector',{type:'string',maxLength:100},'Exact sector label.');
   add('held',{type:'string',enum:['0','1']},'1 selects companies held by tracked investors.');add('tags',{type:'string',maxLength:200},'Comma-separated published tag IDs; all must match.');
   for(const name of ['understandable','moat','economics','management','accounting'])add(name,{type:'string',enum:['pass','fail']},'Filter quality-test result.');
   add('near',{type:'string',enum:['0','1']},'Include a single failed quality test.');add('awaiting',{type:'string',enum:['0','1']},'Select quality tests awaiting completion.');add('gate',{type:'string',pattern:'^[0-6]$'},'Website funnel: first N quality tests; 6 also requires buy now.');
  }
  const dataSchema=z.toJSONSchema(schemas[route.id],{target:'draft-2020-12'});
  paths[route.path]={get:{operationId:route.id,summary:route.description,parameters,'x-x402':{version:2,scheme:'exact',currency:'USDC',amount:String(PRICES[route.price]),usd:PRICES[route.price]/1e6},responses:{
   '200':{description:'Derived research; payment settled. Replay the exact signed request to retrieve the saved response without another settlement.',headers:{ETag:{schema:{type:'string'}},'PAYMENT-RESPONSE':{description:'Base64 x402 settlement receipt including transaction hash.',schema:{type:'string'}},'Cache-Control':{schema:{const:'private, no-store'}}},content:json({type:'object',required:['apiVersion','data'],properties:{apiVersion:{const:'v1'},data:dataSchema}})},
   '400':error,'404':error,'409':error,'503':error,
   '402':{description:'Payment required or rejected. Decode PAYMENT-REQUIRED as base64 JSON to choose a payment.',headers:{'PAYMENT-REQUIRED':{required:true,schema:{type:'string'}}},content:json({type:'object',required:['x402Version','resource','accepts'],properties:{x402Version:{const:2},resource:{type:'object'},accepts:{type:'array',items:{type:'object',required:['scheme','network','asset','amount','payTo','maxTimeoutSeconds'],properties:{scheme:{const:'exact'},network:{enum:['eip155:84532','eip155:8453']},asset:{type:'string'},amount:{type:'string'},payTo:{type:'string'},maxTimeoutSeconds:{type:'integer'},extra:{type:'object'}}}},extensions:{type:'object'}}})},
  }}};
 }
 for(const [path,description] of [['','API index'],['/pricing','USDC price table and configured network'],['/openapi.json','OpenAPI 3.1 specification'],['/guide','Agent payment guide']])paths[path||'/']={get:{operationId:path?path.slice(1).replace('.','_'):'index',summary:description,security:[],responses:{'200':{description,content:path==='/guide'?{'text/markdown':{schema:{type:'string'}}}:json({type:'object'})}}}};
 return {openapi:'3.1.0',jsonSchemaDialect:'https://json-schema.org/draft/2020-12/schema',info:{title:'GigaInvestors Agent API',version:'1.0.0',description:'Derived investment research. Pay each call via x402 v2 exact USDC. No signup, account, API key, or Stripe. Raw vendor series and raw Dataroma tables are excluded.'},servers:[{url:origin+'/api/v1'}],paths};
}
