import {statfsSync,existsSync,mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {corpusPath} from '../corpus';
let checked=0;
/** Persisted baseline spans resumptions, not just a single process. Only compact
 * research artifacts and the local staging output count toward this job's cap. */
export function businessDiskGuard(){
 const d=statfsSync('/');if(d.bavail*d.bsize<6*1024**3)throw Error('DISK STOP: below 6 GiB');
 if(Date.now()-checked<30000)return;
 checked=Date.now();
 const paths=[corpusPath('business-backfill'),path.resolve('.memo-2')].filter(existsSync);
 const bytes=paths.length?execFileSync('du',['-sk',...paths],{encoding:'utf8'}).trim().split('\n').reduce((sum,line)=>sum+Number(line.split(/\s/)[0])*1024,0):0;
 const file=corpusPath('business-backfill/memo-2-disk-budget.json');
 const budget=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{baselineBytes:bytes,startedAt:new Date().toISOString()};
 if(bytes-budget.baselineBytes>3_000_000_000)throw Error('DISK STOP: 3 GB new-artifact budget reached');
 mkdirSync(path.dirname(file),{recursive:true});const temporary=`${file}.${process.pid}.tmp`;writeFileSync(temporary,JSON.stringify({...budget,currentBytes:bytes,newBytes:Math.max(0,bytes-budget.baselineBytes),freeBytes:d.bavail*d.bsize,checkedAt:new Date().toISOString()}));renameSync(temporary,file);
}
