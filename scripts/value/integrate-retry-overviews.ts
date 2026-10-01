import dotenv from 'dotenv';
import {readFileSync,writeFileSync} from 'node:fs';
import {corpusPath,readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {pool} from '../../lib/value/http';
import {diskGuard} from '../../lib/value/thesis/sources';
import businessFit from './stages/business-fit';
import flags from './stages/flags';
dotenv.config({path:'.env.local',quiet:true});dotenv.config({path:corpusPath('.env.local'),quiet:true});process.env.VALUE_NO_EODHD='1';
async function main(){
 const selected:string[]=JSON.parse(readFileSync('.integrate/staging/inventory.json','utf8')).entries.map((r:any)=>r.id);
 for(const id of selected){const previous=readCorpusJson<any>(`flags/${id}.json`);if(!previous?.gaps.some((g:string)=>/^(signal|relationship):/.test(g)))continue;
  diskGuard();await flags({only:[id]});const next=readCorpusJson<any>(`flags/${id}.json`);next.usdRates=previous.usdRates;writeCorpusJson(`flags/${id}.json`,next);
  if(next.gaps.some((g:string)=>/^(signal|relationship):/.test(g)))throw Error(`Extraction retry still has a gap: ${id}`);
 }
 const ids=selected.filter(id=>!readCorpusJson<any[]>(`business-fit/overview/${id}.json`)?.length);
 for(let i=0;i<ids.length;i+=12){diskGuard();await pool({items:ids.slice(i,i+12),concurrency:6,run:async id=>businessFit({only:[id],force:true})});}
 const remaining=ids.filter(id=>!readCorpusJson<any[]>(`business-fit/overview/${id}.json`)?.length);
 const result={attempted:ids.length,recovered:ids.length-remaining.length,remaining};writeFileSync('.integrate/staging/overview-retries.json',JSON.stringify(result,null,2));console.log(result);
}main().catch(e=>{console.error(e.message);process.exitCode=1;});
