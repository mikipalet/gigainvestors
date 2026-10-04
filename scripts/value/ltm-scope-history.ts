/** Stage only attributable LTM changes over the released historical record.
 * Cached annual revisions are outside this release; they must not ride along
 * with the LTM method change. No live store files are written. */
import {readFileSync,readdirSync,writeFileSync,realpathSync,statfsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type {SnapshotRow} from '../../lib/value/types';
const stage=path.resolve('.ttm-1'),out=path.join(stage,'corpus/history-v7/ltm-1');
const live=path.join(os.homedir(),'value-corpus/publish-repo/history');
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
function same(a:unknown,b:unknown):boolean{
 if(typeof a==='number'&&typeof b==='number')return Math.abs(a-b)<=1e-6*Math.max(1,Math.abs(a));
 if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((x,i)=>same(x,b[i]));
 if(a&&b&&typeof a==='object'&&typeof b==='object'){const x=a as Record<string,unknown>,y=b as Record<string,unknown>;return Object.keys(x).length===Object.keys(y).length&&Object.keys(x).every(k=>same(x[k],y[k]));}
 return a===b;
}
function losesNumber(a:unknown,b:unknown):boolean{
 if(typeof a==='number')return typeof b!=='number'||!Number.isFinite(b);
 if(Array.isArray(a))return !Array.isArray(b)||a.some((x,i)=>losesNumber(x,b[i]));
 if(a&&typeof a==='object')return !b||typeof b!=='object'||Object.entries(a).some(([k,v])=>losesNumber(v,(b as Record<string,unknown>)[k]));
 return false;
}
const comparable=(r:SnapshotRow)=>r.slice(0,8).map((v,i)=>i===4?null:v);
function main(){
 const disk=statfsSync('/');if(disk.bavail*disk.bsize<4*1024**3)throw Error('DISK STOP');
 if(realpathSync(out)!==out)throw Error('Private history output required');
 const report=read(path.join(stage,'history-report.json'));
 if(!Array.isArray(report.ltmSnapshots))throw Error('Missing annual-control attribution replay');
 const snapshots=new Map<string,{annual:SnapshotRow;ltm:SnapshotRow;periods:Record<string,unknown>}>(report.ltmSnapshots.map((s:any)=>[`${s.quarter}/${s.id}`,s]));
 const changes:unknown[]=[],held:unknown[]=[];let retained=0,updated=0;
 for(const file of readdirSync(live).filter(f=>/^\d{4}(?:Q[1-4])?\.json$/.test(f))){
  const period=file.slice(0,-5),quarter=period.length===4?period+'Q4':period;
  const rows=(read(path.join(live,file)) as SnapshotRow[]).map(old=>{
   const observation=snapshots.get(`${quarter}/${old[0]}`);
   if(!observation||same(comparable(observation.annual),comparable(observation.ltm))){retained++;return old;}
   const reason=!same(comparable(old),comparable(observation.annual))?'current annual inputs differ from released baseline':losesNumber(old.slice(0,8),observation.ltm.slice(0,8))?'LTM row would remove a published number':null;
   if(reason){held.push({file,id:old[0],reason});retained++;return old;}
   const next=structuredClone(observation.ltm);next[4]=old[4];if(old[8])next[8]=old[8];
   if(next[7]&&Object.keys(observation.periods).length)next[7]={...next[7],qualityLtm:observation.periods as NonNullable<SnapshotRow[7]>['qualityLtm']};
   updated++;
   for(const [i,test]of ['understandable','moat','economics','management','accounting'].entries())if(old[1][i]!==next[1][i])changes.push({file,id:old[0],test,old:old[1][i],new:next[1][i],period:observation.periods[test]});
   if(!same(old[2],next[2])||!same(old[5],next[5]))changes.push({file,id:old[0],test:'price-check',old:{margin:old[2],price:old[5]},new:{margin:next[2],price:next[5]},periods:observation.periods});
   if(old[3]!==next[3])changes.push({file,id:old[0],test:'buy',old:old[3],new:next[3],periods:observation.periods});
   return next;
  });
  writeFileSync(path.join(out,file),JSON.stringify(rows)+'\n');
 }
 writeFileSync(path.join(stage,'history-scope.json'),JSON.stringify({retained,updated,held,changes},null,2)+'\n');
 console.log(JSON.stringify({retained,updated,held:held.length,verdictChanges:changes.length}));
}
main();
