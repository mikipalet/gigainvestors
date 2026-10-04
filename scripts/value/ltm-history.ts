/** Rebuild all published issuers' historical frames in an isolated corpus. */
import {existsSync,mkdirSync,readdirSync,readFileSync,writeFileSync,lstatSync,unlinkSync,statfsSync,realpathSync} from 'node:fs';
import path from 'node:path';
import historySnapshots from './stages/history-snapshots';
const stage=path.resolve('.ttm-1'),corpus=path.join(stage,'corpus');
process.env.VALUE_CORPUS_DIR=corpus;process.env.VALUE_NO_EODHD='1';
globalThis.fetch=async()=>{throw Error('Offline LTM history: network forbidden');};
const guard=()=>{const s=statfsSync('/');if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP: commit work and stop (less than 4 GiB free)');};
async function main(){
 guard();if(realpathSync(corpus)!==corpus)throw Error('Private staging corpus required');const ids=readdirSync(path.join(corpus,'analysis')).filter(f=>f.endsWith('.json')).map(f=>f.slice(0,-5));
 const result=await historySnapshots({only:ids,memoryOnly:true,asOf:'2026-10-04',auditQualityLtm:true});
 if(result.report.coverage.failed.length)throw Error('Historical replay failures: '+result.report.coverage.failed.join(','));
 const history=path.join(corpus,'history-v7');
 if(existsSync(history)&&lstatSync(history).isSymbolicLink())unlinkSync(history);
 const out=path.join(history,'ltm-1');mkdirSync(out,{recursive:true});if(realpathSync(out)!==out)throw Error('Private history output required');
 for(const [q,rows] of Object.entries(result.frames)){guard();writeFileSync(path.join(out,q+'.json'),JSON.stringify(rows)+'\n');}
 // This is a complete replay of the published universe, not a sample. The
 // publisher retains older historical identities absent from today's universe.
 writeFileSync(path.join(out,'index.json'),JSON.stringify({...result.index,scope:'universe'})+'\n');
 writeFileSync(path.join(stage,'history-report.json'),JSON.stringify(result.report,null,2)+'\n');
 console.log(JSON.stringify({out,companies:ids.length,quarters:result.index.quarters?.length,failed:result.report.coverage.failed.length}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
