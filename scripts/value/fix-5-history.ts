/** Rebuild affected quarterly rows in the private verification overlay. */
import {readFileSync,readdirSync,writeFileSync,mkdirSync,symlinkSync,unlinkSync,existsSync,statfsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import historySnapshots from './stages/history-snapshots';
import {summarizeSnapshots} from '../../lib/value/snapshots';
const stage=path.resolve('.fix5'),overlay=path.join(stage,'corpus'),source=path.join(os.homedir(),'value-corpus/history-v7');
async function main(){
 const s=statfsSync('/');if(s.bavail*s.bsize<6*1024**3)throw Error('DISK STOP below 6 GiB');
 const ids=JSON.parse(readFileSync(path.join(stage,'replay.json'),'utf8')).map((r:{id:string})=>r.id);
 const selected=new Set(ids);process.env.VALUE_CORPUS_DIR=overlay;process.env.VALUE_NO_EODHD='1';
 const fresh=await historySnapshots({only:ids,memoryOnly:true,asOf:'2026-10-02'});
 const root=path.join(overlay,'history-v7');
 const{lstatSync}=await import('node:fs');if(lstatSync(root).isSymbolicLink())unlinkSync(root);mkdirSync(root,{recursive:true});
 for(const dir of readdirSync(source))if(!existsSync(path.join(root,dir)))symlinkSync(path.join(source,dir),path.join(root,dir));
 const live='/Users/miki/value-corpus/staging/integrate-4/store/history';
 const index=JSON.parse(readFileSync(path.join(live,'index.json'),'utf8'));
 const out=path.join(root,'20261002T100000-fix5');mkdirSync(out,{recursive:true});
 let changed=0;
 for(const q of index.quarters){
  const old=JSON.parse(readFileSync(path.join(live,q+'.json'),'utf8'));
  const rows=[...old.filter((r:any)=>!selected.has(r[0])),...fresh.frames[q]].sort((a,b)=>a[0].localeCompare(b[0]));
  changed+=rows.filter(r=>JSON.stringify(r)!==JSON.stringify(old.find((v:any)=>v[0]===r[0]))).length;
  writeFileSync(path.join(out,q+'.json'),JSON.stringify(rows));index.perQuarter[q]=summarizeSnapshots(rows);
  if(q.endsWith('Q4')){writeFileSync(path.join(out,q.slice(0,4)+'.json'),JSON.stringify(rows));index.perYear[q.slice(0,4)]=index.perQuarter[q];}
 }
 index.scope='universe';index.asOf='2026-10-02';writeFileSync(path.join(out,'index.json'),JSON.stringify(index));
 console.log(JSON.stringify({companies:ids.length,quarters:index.quarters.length,changedRows:changed,failures:fresh.report.coverage.failed}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
