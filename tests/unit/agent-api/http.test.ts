import {it,expect,afterEach} from 'vitest';
import {handleAPI,cors} from '@/lib/agent-api/handler';
import {openapi} from '@/lib/agent-api/openapi';
import {ROUTES} from '@/lib/agent-api/config';
import {HEAD} from '@/app/api/v1/[[...path]]/route';
const old=process.env.X402_PAY_TO;
afterEach(()=>{if(old)process.env.X402_PAY_TO=old;else delete process.env.X402_PAY_TO;});
it('all free docs are available without payment setup and JSON supports ETag',async()=>{
 delete process.env.X402_PAY_TO;
 for(const path of ['/api/v1','/api/v1/pricing','/api/v1/openapi.json','/.well-known/x402','/api/v1/guide']){
  const response=await handleAPI(new Request('https://example.com'+path));expect(response.status).toBe(200);
  if(path.endsWith('guide'))expect(await response.text()).toContain('```ts');
  else{expect(response.headers.get('ETag')).toBeTruthy();const again=await handleAPI(new Request('https://example.com'+path,{headers:{'If-None-Match':response.headers.get('ETag')!}}));expect(again.status).toBe(304);}
 }
});
it('every paid endpoint is protected and has a schema and matching price in OpenAPI',async()=>{
 process.env.X402_PAY_TO='0x1111111111111111111111111111111111111111';
 const doc=openapi('https://example.com');expect(doc.openapi).toBe('3.1.0');
 for(const route of ROUTES){const path='/api/v1'+route.path.replace('{id}','KO.US').replace('{quarter}','2020Q1')+(route.id==='search'?'?q=KO':'');const res=cors(await handleAPI(new Request('https://example.com'+path)));expect(res.status,route.id).toBe(402);expect(res.headers.get('Access-Control-Expose-Headers')).toContain('PAYMENT-REQUIRED');expect(doc.paths[route.path]).toBeTruthy();}
});
it('invalid input, missing configuration and HEAD cannot cause charges',async()=>{
 delete process.env.X402_PAY_TO;
 expect((await handleAPI(new Request('https://example.com/api/v1/search?q=KO'))).status).toBe(503);
 expect((await handleAPI(new Request('https://example.com/api/v1/search'))).status).toBe(400);
 expect((await handleAPI(new Request('https://example.com/api/v1/no-route'))).status).toBe(404);
 expect((await HEAD()).status).toBe(405);
});
