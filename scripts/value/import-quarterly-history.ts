/** One-time, local-only promotion of an audited quarterly store into corpus state.
 * The index is written last: normal publish cannot see a partial import. */
import {readFileSync,mkdirSync,writeFileSync,existsSync,statfsSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {corpusPath} from '../../lib/value/corpus';
import type {HistoryIndex,SnapshotRow} from '../../lib/value/types';
const source=path.resolve(process.argv[2]??'');
if(!process.argv[2])throw Error('Usage: import-quarterly-history <audited-local-store>');
const read=(file:string)=>JSON.parse(readFileSync(path.join(source,file),'utf8'));
const index=read('history/index.json') as HistoryIndex;
const audit=read('quarterly-audit.json');
if(!index.asOf||index.scope!=='universe'||!index.quarters?.length||!Array.isArray(audit.coverage?.failed)||audit.coverage.failed.length)throw Error('Requires a complete audited universe');
const frames=index.quarters.map(q=>{
 if(!/^\d{4}Q[1-4]$/.test(q))throw Error('Invalid quarter');
 const rows=read(`history/${q}.json`) as SnapshotRow[];
 if(!Array.isArray(rows)||rows.some(r=>!Array.isArray(r)||!/^.{5}$/.test(r[1])))throw Error(`Invalid frame ${q}`);
 return [q,JSON.stringify(rows)+'\n'] as const;
});
const hash=createHash('sha256').update(JSON.stringify(index)).update(frames.map(([,s])=>s).join('')).digest('hex').slice(0,12);
const out=corpusPath('history-v7',`${index.asOf.replaceAll('-','')}T235959-import-${hash}`);
if(existsSync(path.join(out,'index.json')))throw Error('This audited history is already imported');
mkdirSync(out,{recursive:true});
for(const [q,text]of frames){
 const disk=statfsSync('/');if(disk.bavail*disk.bsize<6*1024**3)throw Error('DISK STOP: below 6 GiB');
 writeFileSync(path.join(out,`${q}.json`),text,{flag:'wx'});
}
writeFileSync(path.join(out,'report.json'),JSON.stringify({...audit,importedFrom:source,sha256:hash})+'\n',{flag:'wx'});
writeFileSync(path.join(out,'index.json'),JSON.stringify(index)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,quarters:frames.length}));
