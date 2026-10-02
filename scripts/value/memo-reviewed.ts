/** Resumable typed support checks for the manually reconciled review excerpts. */
import dotenv from 'dotenv';
import {createHash} from 'node:crypto';
import inputs from './memo-review-inputs.json';
import {readMemoClaims,MEMO_CLAIM_VERSION,type MemoClaim} from '../../lib/value/business/memo-claims';
import {readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {askJev} from '../../lib/value/jev/client';
import {recordBusinessReading} from '../../lib/value/business/recordings';
import {businessDiskGuard} from '../../lib/value/business/disk';
dotenv.config({path:'.env.local',quiet:true});
async function main(){
 const calibration=readCorpusJson<{version:string;accuracy:number;n:number;positive:number;negative:number}>('business-backfill/memo-claims-calibration.json');
 if(calibration?.version!==MEMO_CLAIM_VERSION||calibration.accuracy<.9||calibration.n<20||calibration.positive<5||calibration.negative<5)throw Error('Memo claim calibration gate failed');
 for(const [id,input]of Object.entries(inputs)){
  businessDiskGuard();const claims=input.claims as MemoClaim[];
  const inputHash=createHash('sha256').update(JSON.stringify(claims)).digest('hex');
  const file=`business-backfill/reviewed/${id}.json`;
  const cached=readCorpusJson<{inputHash:string;calibrated?:boolean;readerVersion?:string}>(file);
  if(cached?.inputHash===inputHash&&cached.calibrated&&cached.readerVersion===MEMO_CLAIM_VERSION)continue;
  const lines=await readMemoClaims(claims,async args=>{const result=await askJev({...args,usageFile:'business-backfill/memo-claims-usage.jsonl'});recordBusinessReading('memo-claims',{id,...args,...result});return result;});
  writeCorpusJson(file,{inputHash,lines,readerVersion:MEMO_CLAIM_VERSION,calibrated:true,asOf:new Date().toISOString()});
  console.log(`${id}: ${lines.length}/${claims.length} supported claims`);
 }
}
main().catch(e=>{console.error(e instanceof Error?e.message:'failed');process.exitCode=1;});
