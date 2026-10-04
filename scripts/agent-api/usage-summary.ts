import {config} from 'dotenv';
import {readFile} from 'node:fs/promises';
import {list,get} from '@vercel/blob';
import type {Usage} from '../../lib/agent-api/usage';
config({path:'.env.local',quiet:true});
async function main(){
 const rows:Usage[]=[];
 if(process.argv.includes('--blob')){
  let cursor:string|undefined;
  do{const page=await list({prefix:'agent-api/usage/',cursor,limit:1000});
   for(const blob of page.blobs){
    if(process.env.X402_BLOB_ACCESS==='private'){const response=await get(blob.url,{access:'private'});if(response?.statusCode===200)rows.push(await new Response(response.stream).json());}
    else{const response=await fetch(blob.url);if(!response.ok)throw Error('Usage object unavailable');rows.push(await response.json());}
   }
   cursor=page.hasMore?page.cursor:undefined;
  }while(cursor);
 }else{
  const file=process.argv[2]??'.agent-api/usage.jsonl';
  const input=await readFile(file,'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
  for(const line of input.split('\n').filter(Boolean))rows.push(JSON.parse(line));
 }
 const unique=[...new Map(rows.map(r=>[r.requestId,r])).values()],summary=new Map<string,{calls:number;atomic:bigint}>();
 for(const row of unique){const key=`${row.network} ${row.route}`,prior=summary.get(key)??{calls:0,atomic:BigInt(0)};prior.calls++;prior.atomic+=BigInt(row.amount);summary.set(key,prior);}
 console.table([...summary].map(([route,s])=>({route,calls:s.calls,USDC:Number(s.atomic)/1e6})));
 console.log(`${unique.length} settled calls; ${new Set(unique.map(r=>r.transaction)).size} transactions.`);
}
main().catch(()=>{console.error('Usage summary failed. Check the log path or Blob configuration.');process.exitCode=1;});
