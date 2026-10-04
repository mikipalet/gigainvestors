import {createAuthHeader} from '@coinbase/x402';
import {paymentConfig} from '../../lib/agent-api/config';

// Opt-in build check: secrets stay inside Vercel. Never runs on production.
async function main() {
  const address=process.env.X402_TEST_PAYER_ADDRESS;
  if(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_GIT_COMMIT_REF!=='value-zv-api'||!address)return;
  if(!/^0x[0-9a-fA-F]{40}$/.test(address))throw Error('Invalid public test payer address');
  const config=paymentConfig();
  if(config.network!=='eip155:84532')throw Error('Readiness funding requires Base Sepolia');
  const id=process.env.CDP_API_KEY_ID,secret=process.env.CDP_API_KEY_SECRET;
  if(!id||!secret)throw Error('CDP credentials unavailable in build');
  const request=async(method:string,path:string,body?:unknown)=>fetch(`https://api.cdp.coinbase.com${path}`,{
    method,headers:{Authorization:await createAuthHeader(id,secret,method,'api.cdp.coinbase.com',path),'Content-Type':'application/json'},
    body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30_000),
  });
  const supported=await request('GET','/platform/v2/x402/supported');
  const data=await supported.json();
  const mainnet=supported.ok&&data.kinds?.some((k:{x402Version:number;scheme:string;network:string})=>k.x402Version===2&&k.scheme==='exact'&&k.network==='eip155:8453');
  console.log('X402_READINESS '+JSON.stringify({supportedStatus:supported.status,mainnetExactV2:!!mainnet,previewNetwork:config.network,payTo:config.payTo}));
  if(!mainnet)throw Error('Authenticated mainnet support check failed');
  const faucet=await request('POST','/platform/v2/evm/faucet',{network:'base-sepolia',token:'usdc',address});
  const funded=await faucet.json();
  console.log('X402_FAUCET '+JSON.stringify({status:faucet.status,network:'base-sepolia',address,transactionHash:/^0x[0-9a-fA-F]{64}$/.test(funded.transactionHash)?funded.transactionHash:undefined}));
  if(!faucet.ok)throw Error('Testnet faucet request failed');
}
// Never print upstream exceptions, request headers, or environment values.
main().catch(()=>{console.error('X402_READINESS failed; inspect the sanitized status lines above.');process.exitCode=1;});
