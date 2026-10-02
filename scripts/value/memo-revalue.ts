/** Repair only yield-blocked analyses through the existing valuation pipeline. */
import dotenv from 'dotenv';
import {readdirSync,readFileSync} from 'node:fs';
import {corpusPath,readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import analyze from './stages/analyze';
import {bondObservation} from '../../lib/value/bond-yields';
import {businessDiskGuard} from '../../lib/value/business/disk';
import type {Analysis,Dossier} from '../../lib/value/types';
dotenv.config({path:'.env.local',quiet:true});
async function main(){
 const dossiers:Record<string,Dossier>=Object.assign({},...readdirSync(corpusPath('publish-repo/dossiers')).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(corpusPath('publish-repo/dossiers',f),'utf8'))));
 const ids=Object.keys(dossiers).filter(id=>/local government bond yield unavailable/i.test(readCorpusJson<Analysis>(`analysis/${id}.json`)?.valuationReason??''));
 const before=ids.map(id=>({id,country:dossiers[id].company.country,reason:readCorpusJson<Analysis>(`analysis/${id}.json`)?.valuationReason}));
 writeCorpusJson('business-backfill/yield-repair-before.json',before);
 for(const country of new Set(ids.map(id=>dossiers[id].company.country))){businessDiskGuard();await bondObservation(country);}
 // Reuse already recorded typed business answers; yield repair does not require new prose or raw filings.
 await analyze({only:ids,ask:async({id})=>Object.values(readCorpusJson<Analysis>(`analysis/${id}.json`)?.tests??{}).flatMap(t=>t.jev),evidence:async()=>null});
 const after=ids.map(id=>{const a=readCorpusJson<Analysis>(`analysis/${id}.json`)!;return {id,country:a.company.country,valued:!!a.valuation,reason:a.valuationReason,source:a.valuation?.bondSource};});
 writeCorpusJson('business-backfill/yield-repair.json',{asOf:new Date().toISOString(),before,after});
 console.log(JSON.stringify({attempted:ids.length,valued:after.filter(a=>a.valued).length,remaining:after.filter(a=>!a.valued)},null,2));
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Yield repair failed');process.exitCode=1;});
