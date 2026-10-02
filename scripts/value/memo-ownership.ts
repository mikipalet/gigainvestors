/** Fill the compact memo-only vendor cache; never retain another full fundamentals copy. */
import dotenv from 'dotenv';
import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {corpusPath,readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {factsFromVendor} from '../../lib/value/business/memo-facts';
import {getFundamentals} from '../../lib/value/eodhd';
import {businessDiskGuard} from '../../lib/value/business/disk';
import {pool} from '../../lib/value/http';
import type {Dossier} from '../../lib/value/types';
dotenv.config({path:'.env.local',quiet:true});
async function main(){
 const store=corpusPath('publish-repo/dossiers');
 const dossiers:Record<string,Dossier>=Object.assign({},...readdirSync(store).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(`${store}/${f}`,'utf8'))));
 let attempted=0,filled=0,failed=0;
 const missing=Object.values(dossiers).filter(d=>![...new Set([d.id,...d.company.listings])].some(id=>factsFromVendor(readCorpusJson(`raw/eodhd/${id}.json`)??readCorpusJson(`business-backfill/vendor/${id}.json`),id,'').insiderPercent!==undefined));
 console.log(`Missing ownership: ${missing.length}`);
 await pool({items:missing,concurrency:2,run:async d=>{
  businessDiskGuard();
  for(const id of [...new Set([d.id,...d.company.listings])]){
   const file=`business-backfill/vendor/${id}.json`;
   if(existsSync(corpusPath(file)))continue;
   try{const raw=await getFundamentals(id) as Record<string,unknown>;businessDiskGuard();
    const compact={General:raw.General,SharesStats:raw.SharesStats,fetchedAt:new Date().toISOString()};writeCorpusJson(file,compact);attempted++;
    if(factsFromVendor(compact,id,'').insiderPercent!==undefined){filled++;break;}
   }catch(e){if(String(e).includes('DISK STOP')||String(e).includes('budget'))throw e;failed++;}
  }
 }});
 console.log(JSON.stringify({missing:missing.length,attempted,filled,failed}));
}
main().catch(e=>{console.error(e instanceof Error?e.message:'failed');process.exitCode=1;});
