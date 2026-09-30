/** Local staging migration. No network/publish: preserve each original cohort and return.
 * Recompute from cached inputs, attach prices only when the original quality, price/value
 * and buy decision agree. A mismatch remains unavailable rather than borrowing today's value.
 * Usage: npx tsx scripts/value/backfill-history-prices.ts <local staging directory>
 */
import { mkdirSync,readdirSync,readFileSync,rmSync,writeFileSync } from 'node:fs';
import path from 'node:path';
import { publishViews } from '../../lib/value/publish-views';
import type { HistoryIndex,SnapshotRow } from '../../lib/value/types';
import historySnapshots from './stages/history-snapshots';
async function main(){
 const target=process.argv[2];
 if(!target||!path.resolve(target).includes('/staging/'))throw new Error('Provide a local staging directory');
 const index=JSON.parse(readFileSync(path.join(target,'history/index.json'),'utf8')) as HistoryIndex;
 const years=Object.fromEntries(index.years.map(year=>[year,JSON.parse(readFileSync(path.join(target,`history/${year}.json`),'utf8')) as SnapshotRow[]]));
 const only=[...new Set(Object.values(years).flat().filter(r=>r[1]==='PPPPP').map(r=>r[0]))];
 const {years:rebuiltYears}=await historySnapshots({only,memoryOnly:true});
 const stats=[];
 for(const year of index.years){
  const rebuilt=new Map((rebuiltYears[year]??[]).map(r=>[r[0],r]));
  let added=0;const mismatches:string[]=[];
  for(const row of years[year]){
   // Keep earlier non-passing years for the same quality companies: annual charts
   // must not invent a continuous line or borrow today's discount.
   const fresh=rebuilt.get(row[0]);
   if(fresh&&fresh[1]===row[1]&&fresh[2]===row[2]&&fresh[3]===row[3]){row[5]=fresh[5];row[6]=fresh[6];added++;}
   else if(row[1]==='PPPPP')mismatches.push(row[0]);
  }
  writeFileSync(path.join(target,`history/${year}.json`),JSON.stringify(years[year])+'\n');
  stats.push({year,added,mismatches});
 }
 // Regenerate compact browser views in the same staging directory.
 const files:Record<string,unknown>={};
 for(const dir of ['index','prices','dossiers','history'])for(const file of readdirSync(path.join(target,dir)).filter(f=>f.endsWith('.json'))){
  files[`${dir}/${file}`]=JSON.parse(readFileSync(path.join(target,dir,file),'utf8'));
 }
 files['meta.json']=JSON.parse(readFileSync(path.join(target,'meta.json'),'utf8'));
 publishViews(files);
 rmSync(path.join(target,'views'),{recursive:true,force:true});
 mkdirSync(path.join(target,'views'),{recursive:true});
 for(const [file,data]of Object.entries(files))if(file==='meta.json'||file.startsWith('views/'))writeFileSync(path.join(target,file),JSON.stringify(data)+'\n');
 console.log(JSON.stringify({target,stats},null,2));

}
main().catch(e=>{console.error(e);process.exitCode=1;});
