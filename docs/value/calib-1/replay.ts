import {readFileSync,writeFileSync} from 'node:fs';
import analyze from '/Users/miki/GitHub/superinvestors-wt/value-calib/scripts/value/stages/analyze';
const base='/Users/miki/data/calib';
const ids=['CB.US','DPZ.US'];
const baseline=new Map(ids.map(id=>[id,JSON.parse(readFileSync(`${base}/today/${id}.json`,'utf8'))]));
(async()=>{
 await analyze({only:ids,force:true,ask:async({id})=>Object.values(baseline.get(id)?.tests??{}).flatMap((t:any)=>t.jev??[]),evidence:async()=>null});
 writeFileSync(base+'/target-replay-complete.json',JSON.stringify({count:ids.length,at:new Date().toISOString(),network:'blocked',corpus:'read-only guard',outputs:base+'/replay/analysis'}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
