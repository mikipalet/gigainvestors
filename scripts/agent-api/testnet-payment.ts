import {readFile,stat} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {config} from 'dotenv';
import {createPublicClient,http,parseAbi,parseEventLogs} from 'viem';
import {baseSepolia} from 'viem/chains';
import {privateKeyToAccount} from 'viem/accounts';
import {x402Client,wrapFetchWithPayment} from '@x402/fetch';
import {ExactEvmScheme} from '@x402/evm/exact/client';
import {generatePaymentId,appendPaymentIdentifierToExtensions} from '@x402/extensions/payment-identifier';
import {list,get} from '@vercel/blob';

// Explicit temporary env path only; never writes or loads .env.local.
if(process.env.X402_TEST_ENV_FILE)config({path:process.env.X402_TEST_ENV_FILE,quiet:true});
const network='eip155:84532';
const usdc='0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const abi=parseAbi(['function balanceOf(address) view returns (uint256)','event Transfer(address indexed from,address indexed to,uint256 value)']);
class CheckFailure extends Error {}
function check(condition:unknown,message:string):asserts condition {if(!condition)throw new CheckFailure(message);}

// CLI supplies x-vercel-protection-bypass using existing Vercel authentication.
// Signed headers travel through stdin, never shell arguments or printed output.
function vercelFetch(origin:string):typeof fetch {
 return async(input,init)=>{
  const request=new Request(input,init),url=new URL(request.url);
  check(url.origin===origin&&request.method==='GET','Preview GET requests only');
  return new Promise<Response>((resolve,reject)=>{
   const child=spawn('vercel',['curl',url.pathname+url.search,'--deployment',origin,'--','--silent','--include','--max-time','120','--config','-'],{stdio:['pipe','pipe','pipe']});
   let output='';
   child.stdout.on('data',chunk=>output+=chunk);
   child.stderr.resume();
   child.on('error',()=>reject(new CheckFailure('Vercel transport failed')));
   child.on('close',code=>{
    if(code!==0)return reject(new CheckFailure('Vercel transport failed'));
    const start=output.indexOf('HTTP/'),end=output.indexOf('\r\n\r\n',start);
    if(start<0||end<0)return reject(new CheckFailure('Invalid HTTP response from Vercel CLI'));
    const lines=output.slice(start,end).split('\r\n'),status=Number(lines.shift()!.split(' ')[1]),headers=new Headers();
    for(const line of lines){const colon=line.indexOf(':');if(colon>0)headers.append(line.slice(0,colon),line.slice(colon+1).trim());}
    resolve(new Response(output.slice(end+4),{status,headers}));
   });
   const lines=[...request.headers].map(([key,value])=>`header = "${key}: ${value.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"`);
   child.stdin.end(lines.join('\n')+'\n');
  });
 };
}
async function main(){
 const keyFile=process.env.TEST_PAYER_KEY_FILE;
 if(!keyFile){console.log('SKIP: TEST_PAYER_KEY_FILE is absent; no payment attempted.');return;}
 check(((await stat(keyFile)).mode&0o777)===0o600,'Test payer file must be chmod 600');
 const origin=new URL(process.argv[2]).origin;
 check(origin.startsWith('https://'),'Preview HTTPS URL required');
 const account=privateKeyToAccount((await readFile(keyFile,'utf8')).trim() as `0x${string}`);
 const rpc=createPublicClient({chain:baseSepolia,transport:http(process.env.X402_TEST_RPC_URL??'https://sepolia.base.org')});
 check(await rpc.getChainId()===84532,'RPC must be Base Sepolia');
 const balance=()=>rpc.readContract({address:usdc,abi,functionName:'balanceOf',args:[account.address]});
 const transport=process.env.X402_TEST_VERCEL==='1'?vercelFetch(origin):fetch;
 const tiers=[{path:'/api/v1/investors?limit=1',amount:'2000',route:'/investors'},{path:'/api/v1/investors/BRK/holdings?quarter=2020Q1',amount:'10000',route:'/investors/{id}/holdings'},{path:'/api/v1/export?limit=1',amount:'50000',route:'/export'}];
 // Resume only fully verified tiers recorded before an unrelated later failure.
 const completed=process.env.X402_TEST_RESUME_FILE?(await readFile(process.env.X402_TEST_RESUME_FILE,'utf8')).split('\n').filter(line=>line.startsWith('{')).map(line=>JSON.parse(line)).filter(row=>row.paid===200):[];
 check(completed.length<=tiers.length&&completed.every((row,index)=>row.path===tiers[index].path&&row.amount===tiers[index].amount&&row.network===network&&row.replay==='identical'&&row.retries===2&&/^0x[\da-f]{64}$/i.test(row.transaction)),'Invalid completed-tier evidence');
 const transactions:string[]=completed.map(row=>row.transaction);
 for(const row of completed)console.log(JSON.stringify(row));
 for(const tier of tiers.slice(completed.length)){
  const url=origin+tier.path,probe=await transport(url);
  check(probe.status===402,`Expected 402 for ${tier.route}; got ${probe.status}`);
  const required=JSON.parse(Buffer.from(probe.headers.get('PAYMENT-REQUIRED')!,'base64').toString());
  const accepted=required.accepts?.[0];
  check(required.accepts.length===1&&accepted.network===network&&accepted.amount===tier.amount&&accepted.asset.toLowerCase()===usdc.toLowerCase(),'Unexpected network, asset or cost');
  const buyer=new x402Client().register(network,new ExactEvmScheme(account));
  const id=generatePaymentId();
  buyer.onBeforePaymentCreation(async({paymentRequired})=>{
   check(paymentRequired.accepts.length===1&&paymentRequired.accepts[0].network===network&&paymentRequired.accepts[0].amount===tier.amount&&paymentRequired.accepts[0].payTo===accepted.payTo,'Challenge changed before signing');
   if(paymentRequired.extensions)appendPaymentIdentifierToExtensions(paymentRequired.extensions,id);
  });
  let signed:Headers|undefined;
  const capture:typeof fetch=async(input,init)=>{const request=new Request(input,init);if(request.headers.has('PAYMENT-SIGNATURE'))signed=new Headers(request.headers);return transport(request);};
  const before=await balance();
  check(before>=BigInt(tier.amount),'Insufficient test USDC');
  const response=await wrapFetchWithPayment(capture,buyer)(url);
  if(response.status!==200){
   const failed=await response.clone().json().catch(()=>({}));
   const code=typeof failed.error==='string'?failed.error:failed.error?.code;
   if(typeof code==='string'&&/^[a-z_]+$/.test(code))console.log(JSON.stringify({route:tier.route,status:response.status,error:code}));
  }
  check(response.status===200&&signed,`Payment failed for ${tier.route}; HTTP ${response.status}`);
  const body=await response.text(),receipt=response.headers.get('PAYMENT-RESPONSE');
  check(receipt,'Missing settlement receipt');
  const settled=JSON.parse(Buffer.from(receipt,'base64').toString());
  check(settled.success&&settled.network===network&&/^0x[\da-f]{64}$/i.test(settled.transaction),'Invalid settlement receipt');
  const chainReceipt=await rpc.waitForTransactionReceipt({hash:settled.transaction,confirmations:2});
  check(chainReceipt.status==='success','Onchain settlement failed');
  const transfers=parseEventLogs({abi,eventName:'Transfer',logs:chainReceipt.logs}).filter(log=>log.address.toLowerCase()===usdc.toLowerCase()&&log.args.from.toLowerCase()===account.address.toLowerCase());
  check(transfers.length===1&&transfers[0].args.to.toLowerCase()===accepted.payTo.toLowerCase()&&transfers[0].args.value===BigInt(tier.amount),'USDC transfer does not match advertised payment');
  const after=await balance();
  check(before-after===BigInt(tier.amount),'Payer balance delta differs from price');
  for(let attempt=0;attempt<2;attempt++){
   const replay=await transport(url,{headers:signed});
   check(replay.status===200&&await replay.text()===body&&replay.headers.get('PAYMENT-RESPONSE')===receipt,'Paid replay mismatch');
  }
  check(await balance()===after,'Replay charged the payer again');
  transactions.push(settled.transaction);
  console.log(JSON.stringify({route:tier.route,path:tier.path,network,payTo:accepted.payTo,amount:tier.amount,challenge:402,paid:200,retries:2,replay:'identical',balanceBefore:before.toString(),balanceAfter:after.toString(),transaction:settled.transaction,block:chainReceipt.blockNumber.toString(),bodySha256:createHash('sha256').update(body).digest('hex')}));
 }
 check(process.env.BLOB_READ_WRITE_TOKEN,'Usage verification requires Blob access');
 const usage:Record<string,unknown>[]=[];
 let cursor:string|undefined;
 do {
  const page=await list({prefix:`agent-api/usage/${network}/${new Date().toISOString().slice(0,10)}/`,cursor,limit:1000});
  for(const blob of page.blobs){
   const response=process.env.X402_BLOB_ACCESS==='private'?await get(blob.url,{access:'private'}):undefined;
   const row=response?.statusCode===200?await new Response(response.stream).json():await (await fetch(blob.url)).json();
   if(transactions.includes(row.transaction))usage.push(row);
  }
  cursor=page.hasMore?page.cursor:undefined;
 }while(cursor);
 for(let i=0;i<tiers.length;i++){
  const rows=usage.filter(row=>row.transaction===transactions[i]);
  check(rows.length===1&&rows[0].amount===tiers[i].amount&&rows[0].route===tiers[i].route,'Expected exactly one matching usage entry per paid call');
 }
 console.log(JSON.stringify({usage,settledCalls:3,transactions:3,totalAtomic:'62000',replayCharges:0}));
}
// Only our fixed assertion messages are safe; upstream errors can contain signatures.
main().catch(error=>{console.error('Testnet check failed:',error instanceof CheckFailure?error.message:'RPC, SDK or storage error (details suppressed)');process.exitCode=1;});
