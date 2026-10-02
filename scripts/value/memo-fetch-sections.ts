/** Bounded home-filing retrieval; only compressed topical text is retained. */
import dotenv from 'dotenv';
import {readdirSync,readFileSync} from 'node:fs';
import {businessSources,hasBusinessText} from '../../lib/value/business/sources';
import {businessDiskGuard} from '../../lib/value/business/disk';
import {corpusPath,readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {pool} from '../../lib/value/http';
import type {Analysis,Dossier} from '../../lib/value/types';
dotenv.config({path:'.env.local',quiet:true});
async function main(){
 const limit=Number(process.argv[2]??60);if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('Limit must be 1–100');
 const published:Record<string,Dossier>=Object.assign({},...readdirSync(corpusPath('publish-repo/dossiers')).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(corpusPath('publish-repo/dossiers',f),'utf8'))));
 const rows=Object.keys(published).map(id=>readCorpusJson<Analysis>(`analysis/${id}.json`)??published[id]).filter(a=>!hasBusinessText(a));
 rows.sort((a,b)=>Number(!!b.report.url)-Number(!!a.report.url)||Number(!!b.company.lei)-Number(!!a.company.lei)||a.id.localeCompare(b.id));
 const results:Array<{id:string;status:string;sections:number;urls:string[]}>=[],asOf=new Date().toISOString();
 const save=()=>writeCorpusJson('business-backfill/memo-2-fetch.json',{asOf,queueBefore:rows.length,attempted:results.length,results});
 try{await pool({items:rows.slice(0,limit),concurrency:2,run:async a=>{
  businessDiskGuard();try{const result=await businessSources(a);results.push({id:a.id,status:result.status,sections:result.sources.length,urls:[...new Set(result.sources.map(s=>s.url))]});}
  catch(e){if(String(e).includes('DISK STOP'))throw e;results.push({id:a.id,status:e instanceof Error?e.message:'fetch failed',sections:0,urls:[]});}
  save();if(results.length%10===0)console.log(`memo sections: ${results.length}/${Math.min(limit,rows.length)}, ${results.filter(r=>r.sections).length} recovered`);
 }});}finally{save();}
 console.log(JSON.stringify({attempted:results.length,recovered:results.filter(r=>r.sections).length,remaining:rows.length-results.filter(r=>r.sections).length}));
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Section retrieval failed');process.exitCode=1;});
