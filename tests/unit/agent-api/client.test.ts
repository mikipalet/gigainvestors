import {it,expect,vi} from 'vitest';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {x402Client,wrapFetchWithPayment} from '@x402/fetch';
import {ExactEvmScheme} from '@x402/evm/exact/client';
import {HTTPFacilitatorClient} from '@x402/core/server';
import {paidResponse} from '@/lib/agent-api/payment';
import {LocalJournal} from '@/lib/agent-api/journal';
import {resolveRoute} from '@/lib/agent-api/config';
import {AGENT_GUIDE} from '@/lib/agent-api/guide';
import {generatePaymentId,appendPaymentIdentifierToExtensions} from '@x402/extensions/payment-identifier';
import {transpile,ScriptTarget} from 'typescript';
it('interoperates with the maintained buyer and HTTP facilitator SDKs',async()=>{
 const receiver='0x1111111111111111111111111111111111111111';
 const payer='0x2222222222222222222222222222222222222222' as const;
 // Mock signing interface, NOT a generated or held private key.
 const signer={address:payer,signTypedData:async()=>('0x'+'ab'.repeat(65)) as `0x${string}`};
 const buyer=new x402Client().register('eip155:84532',new ExactEvmScheme(signer));
 const calls:string[]=[];
 const facilitatorFetch:typeof fetch=async(input,init)=>{
  const url=String(input),body=JSON.parse(String(init?.body));calls.push(new URL(url).pathname);
  expect(body.paymentRequirements.amount).toBe('2000');expect(body.paymentRequirements.payTo).toBe(receiver);
  expect(body.paymentPayload.payload.authorization.to.toLowerCase()).toBe(receiver);
  return Response.json(url.endsWith('/verify')?{isValid:true,payer}:{success:true,network:'eip155:84532',transaction:'0x'+'cd'.repeat(32),payer});
 };
 vi.stubGlobal('fetch',facilitatorFetch);
 try{
  const deps={config:{payTo:receiver,network:'eip155:84532' as const,facilitatorUrl:'https://facilitator.test'},journal:new LocalJournal(await mkdtemp(join(tmpdir(),'agent-sdk-'))),facilitator:new HTTPFacilitatorClient({url:'https://facilitator.test'}),log:async()=>{}};
  let signature:string|undefined;
  const transport:typeof fetch=async(input,init)=>{const request=new Request(input,init);signature=request.headers.get('PAYMENT-SIGNATURE')??signature;return paidResponse(request,resolveRoute('/api/v1/search')!,async()=>Response.json({data:'research'}),deps);};
  const response=await wrapFetchWithPayment(transport,buyer)('https://example.com/api/v1/search?q=KO');
  expect(response.status,await response.clone().text()).toBe(200);expect(await response.json()).toEqual({data:'research'});expect(signature).toBeTruthy();expect(calls).toEqual(['/verify','/settle']);
  const retry=await transport('https://example.com/api/v1/search?q=KO',{headers:{'PAYMENT-SIGNATURE':signature!}});
  expect(retry.status).toBe(200);expect(calls).toHaveLength(2);
  // Execute the public guide example: the SDK sends a Request, not init.headers.
  const example=transpile(AGENT_GUIDE.split('```ts\n')[1].split('```')[0].replace(/^import .*;\n/gm,''),{target:ScriptTarget.ES2022});
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  const runGuide=new AsyncFunction('x402Client','wrapFetchWithPayment','ExactEvmScheme','generatePaymentId','appendPaymentIdentifierToExtensions','payerSigner','origin','fetch',example+'\nreturn {response,signedHeaders};');
  const guided=await runGuide(x402Client,wrapFetchWithPayment,ExactEvmScheme,generatePaymentId,appendPaymentIdentifierToExtensions,signer,'https://example.com',transport);
  expect(guided.response.status).toBe(200);
  expect(guided.signedHeaders?.get('PAYMENT-SIGNATURE')).toBeTruthy();
  const beforeRetry=calls.length;
  const guideRetry=await transport('https://example.com/api/v1/companies/KO.US/verdict',{headers:guided.signedHeaders});
  expect(guideRetry.status).toBe(200);expect(calls).toHaveLength(beforeRetry);
 }finally{vi.unstubAllGlobals();}
});
