/** Attach a previously audited local quarterly snapshot to a publish --out store.
 * Current dossiers, quotes and views remain those produced by publish. */
import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync,statfsSync,copyFileSync} from 'node:fs';
import path from 'node:path';
import {publishViews} from '../../lib/value/publish-views';
import {summarizeSnapshots} from '../../lib/value/snapshots';
import type {IndexRow,StoreMeta,HistoryIndex,SnapshotRow} from '../../lib/value/types';
const [sourceArg,outArg]=process.argv.slice(2);
if(!sourceArg||!outArg)throw Error('Usage: integrate-quarterly <audited-local-quarter-store> <publish-out-store>');
const source=path.resolve(sourceArg),out=path.resolve(outArg);
if(source===out||existsSync(path.join(out,'.git')))throw Error('Requires distinct local publish --out directory');
const guard=()=>{const s=statfsSync('/');if(s.bavail*s.bsize<6*1024**3)throw Error('DISK STOP: below 6 GiB');};
guard();
const read=<T>(root:string,file:string):T=>JSON.parse(readFileSync(path.join(root,file),'utf8'));
const meta=read<StoreMeta>(out,'meta.json'),original=read<HistoryIndex>(source,'history/index.json');
if(!original.quarters?.length)throw Error('Source has no quarters');
const identities=[...new Map(readdirSync(path.join(out,'index')).filter(f=>/^[A-Z]{2}\.json$/.test(f)).flatMap(f=>read<IndexRow[]>(out,`index/${f}`)).map(r=>[r.id,r])).values()];
const ids=new Set(identities.map(r=>r.id)),western=new Set(identities.filter(r=>r.w).map(r=>r.id));
const index={...original,perYear:{},perQuarter:{},western:{perYear:{},perQuarter:{}}} as HistoryIndex;
const files:Record<string,unknown>={'meta.json':{...meta},'history/companies.json':identities};
for(const q of original.quarters){
 const rows=read<SnapshotRow[]>(source,`history/${q}.json`).filter(r=>ids.has(r[0])&&/^[PF]{5}$/.test(r[1]));
 files[`history/${q}.json`]=rows;
 index.perQuarter![q]=summarizeSnapshots(rows);index.western!.perQuarter![q]=summarizeSnapshots(rows.filter(r=>western.has(r[0])));
 if(q.endsWith('Q4')){files[`history/${q.slice(0,4)}.json`]=rows;index.perYear[q.slice(0,4)]=index.perQuarter![q];index.western!.perYear[q.slice(0,4)]=index.western!.perQuarter![q];}
}
files['history/index.json']=index;
const views=publishViews(files);
files['meta.json']={...meta,views:{...meta.views,quarters:views.quarters,quarterDeferred:views.quarterDeferred,years:views.years,yearDeferred:views.yearDeferred}};
for(const [file,data] of Object.entries(files)){
 guard();const target=path.join(out,file);mkdirSync(path.dirname(target),{recursive:true});writeFileSync(target,JSON.stringify(data)+'\n');
}
copyFileSync(path.join(source,'quarterly-audit.json'),path.join(out,'quarterly-audit.json'));
console.log(JSON.stringify({out,quarters:original.quarters.length,companies:ids.size,sourceAsOf:original.asOf}));
