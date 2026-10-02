/** Small, resumable quote repair; writes only the private corpus, never publishes. */
import dotenv from 'dotenv';
import {readFileSync,readdirSync} from 'node:fs';
import {corpusPath,readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {readPrices} from '../../lib/value/price-files';
import {yahooPrice} from '../../lib/value/prices-yahoo';
import {freshPrice} from './stages/prices';
import {businessDiskGuard} from '../../lib/value/business/disk';
import {pool} from '../../lib/value/http';
import {eodhd} from '../../lib/value/eodhd';
import type {Dossier,PriceMap} from '../../lib/value/types';
dotenv.config({path:'.env.local',quiet:true});
async function main(){
 const root=process.argv[2]??'.memo-2/store';
 const dossiers:Record<string,Dossier>=Object.assign({},...readdirSync(`${root}/dossiers`).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(`${root}/dossiers/${f}`,'utf8'))));
 const prices={...readPrices(`${root}/prices`),...readPrices(corpusPath('prices'))};
 const ids=Object.keys(dossiers).filter(id=>!prices[id]).slice(0,100),results:Array<{id:string;ok:boolean;source?:string}>=[];
 await pool({items:ids,concurrency:3,run:async id=>{
  businessDiskGuard();const company=dossiers[id].company;let quote:PriceMap[string]|null=null,source='Yahoo';
  try{quote=await yahooPrice(company);}catch{/* Try the same dated EOD source used by the prices stage. */}
  if(!quote||!freshPrice(quote))try{const rows=await eodhd<Array<{close:number;date:string}>>(`eod/${id}`,{order:'d',limit:'1'});const r=rows[0];quote=r?[r.close,r.date]:null;source='EODHD';}catch{quote=null;}
  if(quote&&freshPrice(quote)){const file=`prices/${company.country}.json`;writeCorpusJson(file,{...readCorpusJson<PriceMap>(file),[id]:quote});results.push({id,ok:true,source});}
  else results.push({id,ok:false});
 }});
 writeCorpusJson('business-backfill/quote-repair.json',{asOf:new Date().toISOString(),results});
 console.log(JSON.stringify({attempted:ids.length,recovered:results.filter(r=>r.ok).length,remaining:results.filter(r=>!r.ok)},null,2));
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Price repair failed');process.exitCode=1;});
