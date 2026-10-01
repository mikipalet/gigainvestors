/** Local-only history publication. Reuses today's immutable assets by symlink; no corpus copies. */
import {existsSync,mkdirSync,readdirSync,readFileSync,writeFileSync,symlinkSync,statfsSync,renameSync,lstatSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {readCorpusJson,corpusPath} from '../../lib/value/corpus';
import historySnapshots from './stages/history-snapshots';
import {publishViews} from '../../lib/value/publish-views';
import {summarizeSnapshots} from '../../lib/value/snapshots';
import type {IndexRow,StoreMeta,HistoryIndex,SnapshotRow} from '../../lib/value/types';
async function main(){
const [baseArg,outArg,reuse]=process.argv.slice(2);
if(reuse&&reuse!=='--reuse-history')throw Error('Unknown option');
if(!baseArg||!outArg)throw Error('Usage: stage-quarterly <existing-store> <local-staging-directory>');
const base=path.resolve(baseArg),out=path.resolve(outArg);
if(!out.includes('/staging/')||out===base||existsSync(path.join(out,'.git')))throw Error('Local staging directory required');
const guard=()=>{const s=statfsSync('/');if(s.bavail*s.bsize<5e9)throw Error('Disk guard: under 5GB free');};
guard();
const read=<T>(file:string):T=>JSON.parse(readFileSync(path.join(base,file),'utf8'));
const meta=read<StoreMeta>('meta.json');
const identities=[...new Map(readdirSync(path.join(base,'index')).filter(f=>/^[A-Z]{2}\.json$/.test(f)).flatMap(f=>read<IndexRow[]>(`index/${f}`)).map(r=>[r.id,r])).values()];
for(const row of identities)if(!row.lg){const logo=readCorpusJson<{logo?:string}>(`enrichment-v7/logos/${row.id}.json`);if(logo?.logo)row.lg=logo.logo;}
const ids=new Set(identities.map(r=>r.id)),western=new Set(identities.filter(r=>r.w).map(r=>r.id));
const result= reuse ? (()=>{
 const index=JSON.parse(readFileSync(path.join(out,'history/index.json'),'utf8')) as HistoryIndex;
 const frames=Object.fromEntries(index.quarters!.map(q=>[q,JSON.parse(readFileSync(path.join(out,`history/${q}.json`),'utf8')) as SnapshotRow[]]));
 const report=JSON.parse(readFileSync(path.join(out,'quarterly-audit.json'),'utf8')) as Awaited<ReturnType<typeof historySnapshots>>['report'];
 return {index,frames,report};
})() : await historySnapshots({memoryOnly:true});
const index={...result.index,perQuarter:{},perYear:{},western:{perYear:{},perQuarter:{}}} as typeof result.index;
const files:Record<string,unknown>={'meta.json':{...meta},'history/companies.json':identities};
for(const q of index.quarters!){
 const rows=result.frames[q].filter(r=>ids.has(r[0])&&/^[PF]{5}$/.test(r[1]));
 files[`history/${q}.json`]=rows;
 index.perQuarter![q]=summarizeSnapshots(rows);
 index.western!.perQuarter![q]=summarizeSnapshots(rows.filter(r=>western.has(r[0])));
 if(q.endsWith('Q4')){const y=q.slice(0,4);index.perYear[y]=index.perQuarter![q];index.western!.perYear[y]=index.western!.perQuarter![q];}
}
files['history/index.json']=index;
const views=publishViews(files);
(meta as StoreMeta).views={...meta.views!,quarters:views.quarters,quarterDeferred:views.quarterDeferred,years:views.years,yearDeferred:views.yearDeferred};
files['meta.json']=meta;
mkdirSync(out,{recursive:true});
for(const entry of readdirSync(base))if(!['history','views','logos','meta.json'].includes(entry)&&!existsSync(path.join(out,entry)))symlinkSync(path.join(base,entry),path.join(out,entry));
const logoDir=path.join(out,'logos');
if(existsSync(logoDir)&&lstatSync(logoDir).isSymbolicLink())unlinkSync(logoDir);
mkdirSync(logoDir,{recursive:true});
for(const entry of readdirSync(path.join(base,'logos')))if(!existsSync(path.join(logoDir,entry)))symlinkSync(path.join(base,'logos',entry),path.join(logoDir,entry));
for(const row of identities){
 const asset=row.lg?.match(/^\/api\/value\/logo\?asset=([a-f0-9]{64})$/)?.[1];
 if(asset&&!existsSync(path.join(logoDir,asset+'.json'))){
  const source=corpusPath(`enrichment-v7/logos/assets/${asset}.json`);
  if(!existsSync(source))throw Error(`Missing cached historical logo for ${row.id}`);
  symlinkSync(source,path.join(logoDir,asset+'.json'));
 }
}
mkdirSync(path.join(out,'views'),{recursive:true});
for(const entry of readdirSync(path.join(base,'views')))if(!existsSync(path.join(out,'views',entry)))symlinkSync(path.join(base,'views',entry),path.join(out,'views',entry));
for(const [file,data] of Object.entries(files)){
 if(file==='meta.json')continue;
 guard();const dest=path.join(out,file);mkdirSync(path.dirname(dest),{recursive:true});
 // Reused current-view assets are immutable; never follow a symlink to overwrite them.
 if(file.startsWith('views/')&&existsSync(dest))continue;
 writeFileSync(dest,JSON.stringify(data)+'\n');
}
for(const q of index.quarters!.filter(q=>q.endsWith('Q4'))){const dest=path.join(out,'history',q.slice(0,4)+'.json');if(!existsSync(dest))symlinkSync(q+'.json',dest);}
writeFileSync(path.join(out,'meta.json.tmp'),JSON.stringify(meta)+'\n');
renameSync(path.join(out,'meta.json.tmp'),path.join(out,'meta.json'));
writeFileSync(path.join(out,'quarterly-audit.json'),JSON.stringify(result.report)+'\n');
console.log(JSON.stringify({out,quarters:index.quarters!.length,companies:ids.size,failed:result.report.coverage.failed.length}));

}
main().catch(error=>{console.error(error instanceof Error?error.message:"Quarterly staging failed");process.exitCode=1;});
