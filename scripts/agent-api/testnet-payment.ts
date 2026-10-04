import {config} from 'dotenv';
import {privateKeyToAccount} from 'viem/accounts';
import {x402Client,wrapFetchWithPayment} from '@x402/fetch';
import {ExactEvmScheme} from '@x402/evm/exact/client';
import {generatePaymentId,appendPaymentIdentifierToExtensions} from '@x402/extensions/payment-identifier';
config({path:'.env.local',quiet:true});
async function main(){
 if(!process.env.TEST_PAYER_KEY){console.log('SKIP: TEST_PAYER_KEY is absent; no wallet created and no payment attempted.');return;}
 const origin=process.argv[2];if(!origin||!origin.startsWith('https://'))throw Error('Preview HTTPS URL required');
 const url=new URL('/api/v1/investors?limit=1',origin).toString();
 const probe=await fetch(url);if(probe.status!==402)throw Error('Expected a payment challenge');
 const required=JSON.parse(Buffer.from(probe.headers.get('PAYMENT-REQUIRED')!,'base64').toString());
 if(required.accepts.length!==1||required.accepts[0].network!=='eip155:84532'||required.accepts[0].amount!=='2000')throw Error('Unexpected network or cost');
 // Existing buyer test key only. This script never generates or stores a receiving key.
 const account=privateKeyToAccount(process.env.TEST_PAYER_KEY as `0x${string}`);
 const client=new x402Client().register('eip155:84532',new ExactEvmScheme(account));
 const id=generatePaymentId();
 client.onBeforePaymentCreation(async({paymentRequired})=>{if(paymentRequired.extensions)appendPaymentIdentifierToExtensions(paymentRequired.extensions,id);});
 let signed:Headers|undefined;
 const transport:typeof fetch=async(input,init)=>{const headers=new Headers(init?.headers);if(headers.has('PAYMENT-SIGNATURE'))signed=headers;return fetch(input,init);};
 const response=await wrapFetchWithPayment(transport,client)(url);
 if(response.status!==200||!signed)throw Error('Testnet payment failed');
 const body=await response.text(),receipt=response.headers.get('PAYMENT-RESPONSE');
 const replay=await fetch(url,{headers:signed});
 if(replay.status!==200||await replay.text()!==body||replay.headers.get('PAYMENT-RESPONSE')!==receipt)throw Error('Paid replay mismatch');
 const settled=JSON.parse(Buffer.from(receipt!,'base64').toString());
 console.log(JSON.stringify({network:settled.network,transaction:settled.transaction,status:200,replay:'identical',amount:'0.002 USDC'}));
}
main().catch(()=>{console.error('Testnet check failed. No secret or signed authorization was logged. Inspect configuration and preview availability.');process.exitCode=1;});
