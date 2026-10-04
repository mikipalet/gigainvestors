import { describe, it, expect } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { paidResponse, paymentRequirements } from '@/lib/agent-api/payment';
import { LocalJournal } from '@/lib/agent-api/journal';
import { resolveRoute, PRICES, paymentConfig } from '@/lib/agent-api/config';

const payTo='0x1111111111111111111111111111111111111111';
const config={payTo,network:'eip155:84532' as const,facilitatorUrl:'https://x402.org/facilitator'};
const route=()=>resolveRoute('/api/v1/search')!;
function request(paid=true,q='coke',id='pay_1234567890abcdef') {
 const url=`https://example.com/api/v1/search?q=${q}`;
 const payload={x402Version:2,resource:{url},accepted:paymentRequirements(route(),config),payload:{signature:'0x1234',authorization:{from:'0x2222222222222222222222222222222222222222',to:payTo,value:'2000',validAfter:'0',validBefore:'9999999999',nonce:'0x'+'ab'.repeat(32)}},extensions:{'payment-identifier':{info:{required:false,id}}}};
 return new Request(url,{headers:paid?{'PAYMENT-SIGNATURE':Buffer.from(JSON.stringify(payload)).toString('base64')}:{}});
}
async function setup(options:{verify?:boolean;settle?:boolean;throwSettle?:boolean}={}) {
 let settlements=0, executions=0;
 const logs:unknown[]=[];
 const journal=new LocalJournal(await mkdtemp(join(tmpdir(),'agent-api-')));
 const deps={config,journal,facilitator:{verify:async()=>({isValid:options.verify!==false,payer:'0x2222222222222222222222222222222222222222'}),settle:async()=>{settlements++;if(options.throwSettle)throw Error('uncertain');return {success:options.settle!==false,transaction:'0x'+'cd'.repeat(32),network:config.network,payer:'0x2222222222222222222222222222222222222222'};}},log:async(entry:unknown)=>{logs.push(entry);}};
 const handler=async()=>{executions++;return Response.json({data:{ok:true}});};
 return {deps,handler,logs,counts:()=>({settlements,executions})};
}
describe('pricing and configuration',()=>{
 it('covers paid routes in exact USDC units',()=>{expect(PRICES).toEqual({basic:2000,detail:10000,bulk:50000});expect(resolveRoute('/api/v1/companies/KO.US')?.price).toBe('detail');expect(resolveRoute('/api/v1/time-travel/2020Q1')?.price).toBe('bulk');expect(resolveRoute('/api/v1/companies/KO.US/verdict')?.price).toBe('basic');});
 it('defaults to Sepolia and requires an explicit public receiver',()=>{expect(paymentConfig({X402_PAY_TO:payTo}).network).toBe('eip155:84532');expect(()=>paymentConfig({})).toThrow();expect(()=>paymentConfig({X402_PAY_TO:payTo,X402_NETWORK:'ethereum'})).toThrow();expect(()=>paymentConfig({X402_PAY_TO:'0x'+'0'.repeat(40)})).toThrow();});
});
describe('x402 middleware',()=>{
 it('returns v2 402 requirements without running the data handler',async()=>{const s=await setup();const r=await paidResponse(request(false),route(),s.handler,s.deps);expect(r.status).toBe(402);const p=JSON.parse(Buffer.from(r.headers.get('PAYMENT-REQUIRED')!,'base64').toString());expect(p.accepts[0]).toMatchObject({amount:'2000',payTo,network:'eip155:84532'});expect(s.counts()).toEqual({settlements:0,executions:0});});
 it('settles once and returns the identical receipt and response on retry',async()=>{const s=await setup();const a=await paidResponse(request(),route(),s.handler,s.deps);const b=await paidResponse(request(),route(),s.handler,s.deps);expect(a.status).toBe(200);expect(b.status).toBe(200);expect(a.headers.get('PAYMENT-RESPONSE')).toBeTruthy();expect(a.headers.get('PAYMENT-RESPONSE')).toBe(b.headers.get('PAYMENT-RESPONSE'));expect(await a.text()).toBe(await b.text());expect(s.counts()).toEqual({settlements:1,executions:1});expect(b.headers.get('Cache-Control')).toContain('private');expect(s.logs).toHaveLength(1);expect(s.logs[0]).toMatchObject({route:'/search',amount:'2000',network:'eip155:84532'});});
 it('does not settle rejected signatures or failed data responses',async()=>{const a=await setup({verify:false});expect((await paidResponse(request(),route(),a.handler,a.deps)).status).toBe(402);expect(a.counts().settlements).toBe(0);const b=await setup();expect((await paidResponse(request(),route(),async()=>Response.json({error:'missing'},{status:404}),b.deps)).status).toBe(404);expect(b.counts().settlements).toBe(0);});
 it('never releases data on settlement failure or retries an uncertain settlement',async()=>{const a=await setup({settle:false});expect((await paidResponse(request(),route(),a.handler,a.deps)).status).toBe(402);const b=await setup({throwSettle:true});expect((await paidResponse(request(),route(),b.handler,b.deps)).status).toBe(503);expect((await paidResponse(request(),route(),b.handler,b.deps)).status).toBe(409);expect(b.counts().settlements).toBe(1);});
 it('binds retry to the resource and refuses changed queries',async()=>{const s=await setup();await paidResponse(request(),route(),s.handler,s.deps);expect((await paidResponse(request(true,'other'),route(),s.handler,s.deps)).status).toBe(409);expect(s.counts().settlements).toBe(1);});
 it('serializes concurrent payment attempts',async()=>{const s=await setup();const out=await Promise.all([paidResponse(request(),route(),s.handler,s.deps),paidResponse(request(),route(),s.handler,s.deps)]);expect(out.map(x=>x.status)).toContain(200);expect(out.every(x=>[200,409].includes(x.status))).toBe(true);expect(s.counts().settlements).toBe(1);});
 it('rejects malformed payments and incorrect amounts',async()=>{const s=await setup();const r=request();r.headers.set('PAYMENT-SIGNATURE','garbage');expect((await paidResponse(r,route(),s.handler,s.deps)).status).toBe(400);const other=request();const p=JSON.parse(Buffer.from(other.headers.get('PAYMENT-SIGNATURE')!,'base64').toString());p.accepted.amount='1';other.headers.set('PAYMENT-SIGNATURE',Buffer.from(JSON.stringify(p)).toString('base64'));expect((await paidResponse(other,route(),s.handler,s.deps)).status).toBe(402);expect(s.counts().settlements).toBe(0);});
});
