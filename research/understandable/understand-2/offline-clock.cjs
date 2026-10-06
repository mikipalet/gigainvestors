// Deterministic nightly comparison. Market data and publication traffic are blocked.
// Explicit analyzer recovery may read filings through the existing Jev endpoint.
const fs=require('node:fs');
const RealDate=Date;
const timestamp=RealDate.parse('2026-10-06T03:00:00.000Z');
globalThis.Date=class extends RealDate {
 constructor(...args){super(...(args.length?args:[timestamp]));}
 static now(){return timestamp;}
};
let blocked=0,jevRequests=0;
function deny(){blocked++;throw new Error('Understand-2 offline proof forbids network requests');}
const originalFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 if(process.env.UNDERSTAND_ALLOW_JEV==='1'&&url==='https://api.typesafe.ai/v1/systemone'){
  jevRequests++;return originalFetch(input,init);
 }
 return deny();
};
for(const mod of ['node:http','node:https']){const api=require(mod);api.request=api.get=deny;}
process.on('exit',()=>{if(process.env.UNDERSTAND_NETWORK_RECEIPT)fs.writeFileSync(process.env.UNDERSTAND_NETWORK_RECEIPT,JSON.stringify({blockedRequests:blocked,jevRequests,fixedTime:new Date().toISOString()})+'\n');});
