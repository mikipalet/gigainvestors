import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { put } from '@vercel/blob';
export type Usage={date:string;route:string;amount:string;network:string;transaction:string;requestId:string};
/** No payer, query string, signature, credentials, or raw upstream data. */
export async function logUsage(usage:Usage) {
 if(process.env.VERCEL||process.env.X402_USAGE_STORE==='blob'){
  await put(`agent-api/usage/${usage.network}/${usage.date.slice(0,10)}/${usage.requestId}.json`,JSON.stringify(usage),{
   access:process.env.X402_BLOB_ACCESS==='private'?'private':'public',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json',cacheControlMaxAge:60,
  });
 }else{
  const directory=process.env.X402_USAGE_DIR??path.join(process.cwd(),'.agent-api');
  await mkdir(directory,{recursive:true});await appendFile(path.join(directory,'usage.jsonl'),JSON.stringify(usage)+'\n',{mode:0o600});
 }
}
