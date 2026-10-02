/** Actual filing regression checks; deliberately not advertised as a holdout. */
import dotenv from 'dotenv';
import inputs from './memo-review-inputs.json';
import {askJev} from '../../lib/value/jev/client';
import {writeCorpusJson} from '../../lib/value/corpus';
import {businessDiskGuard} from '../../lib/value/business/disk';
import {recordBusinessReading} from '../../lib/value/business/recordings';
import {readMemoClaims,type MemoClaim} from '../../lib/value/business/memo-claims';
dotenv.config({path:'.env.local',quiet:true});
const negatives:Record<string,string[]>={
 'LULU.US':['Selective price increases; gross margin rose 260 basis points to 56.6%.','Tariffs and de minimis changes improve margins in 2026.'],
 'GOOGL.US':['Search price per click rose 6%; paid clicks rose 7% in 2025.','EC fine accrued in 2025: $1.4 billion.'],
 'KO.US':['2025 unit case volume rose 4%; worldwide price/mix was flat.','IRS transfer-pricing litigation was resolved for $3.3bn for 2007–09, including interest.'],
 'MSFT.US':['Microsoft 365 commercial revenue per user declined; seats rose 6%.'],
 'JPM.US':['Apple Card repaid $2.2 billion of lending-related commitments.'],
 'RACE.MI':['US tariffs: 28% of total company revenues came from America.'],
 'ASML.AS':['China represented 36.1% of 2025 sales amid export-control restrictions.'],
 'CBG.LSE':['Motor-finance commissions: £165 million cash redress paid.'],
};
async function main(){
 const results:Array<{id:string;answer:string;expected:boolean;score:number;accepted:boolean;correct:boolean}>=[];
 for(const [id,input]of Object.entries(inputs))for(const [i,c]of input.claims.entries()){
  businessDiskGuard();const positive=c as MemoClaim,negative={...positive,answer:negatives[id][i]};
  for(const [claim,expected]of [[positive,true],[negative,false]] as const){
   let score=0;
   await readMemoClaims([claim],async args=>{const result=await askJev({...args,usageFile:'business-backfill/memo-claims-calibration-usage.jsonl'});recordBusinessReading('memo-claims-calibration',{id,expected,...args,...result});const a=result.answers.c0;score=a?.type==='noul'?a.noul:0;return result;});
   results.push({id,answer:claim.answer,expected,score,accepted:score>.5,correct:(score>.5)===expected});
  }
 }
 const report={version:'1',accuracy:results.filter(r=>r.correct).length/results.length,n:results.length,positive:results.filter(r=>r.expected).length,negative:results.filter(r=>!r.expected).length,threshold:.5,scope:'Manually source-checked filing regression set; not an independent holdout.',results};
 writeCorpusJson('business-backfill/memo-claims-calibration.json',report);console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e instanceof Error?e.message:'failed');process.exitCode=1;});
