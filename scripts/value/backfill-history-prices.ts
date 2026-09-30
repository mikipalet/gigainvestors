/** Local staging migration. No network/publish: preserve each original cohort and return.
 * Recompute from cached inputs, attach prices only when the original quality, price/value
 * and buy decision agree. A mismatch remains unavailable rather than borrowing today's value.
 * Usage: npx tsx scripts/value/backfill-history-prices.ts <local staging directory>
 */
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import historySnapshots from './stages/history-snapshots';
import { corpusPath, readCorpusJson } from '../../lib/value/corpus';
import type { HistoryIndex, SnapshotRow } from '../../lib/value/types';
async function main(){
 const target=process.argv[2];
 if(!target||!path.resolve(target).includes('/staging/'))throw new Error('Provide a local staging directory');
 const index=JSON.parse(readFileSync(path.join(target,'history/index.json'),'utf8')) as HistoryIndex;
 const years=Object.fromEntries(index.years.map(year=>[year,JSON.parse(readFileSync(path.join(target,`history/${year}.json`),'utf8')) as SnapshotRow[]]));
 const only=[...new Set(Object.values(years).flat().filter(r=>r[1]==='PPPPP').map(r=>r[0]))];
 const {report}=await historySnapshots({only});
 try {
 const stats=[];
 for(const year of index.years){
  const rebuilt=new Map((readCorpusJson<SnapshotRow[]>(`${report.root}/${year}.json`)??[]).map(r=>[r[0],r]));
  let added=0;const mismatches:string[]=[];
  for(const row of years[year]){
   if(row[1]!=='PPPPP')continue;
   const fresh=rebuilt.get(row[0]);
   if(fresh&&fresh[1]===row[1]&&fresh[2]===row[2]&&fresh[3]===row[3]){row[5]=fresh[5];added++;}
   else mismatches.push(row[0]);
  }
  writeFileSync(path.join(target,`history/${year}.json`),JSON.stringify(years[year])+'\n');
  stats.push({year,added,mismatches});
 }
 console.log(JSON.stringify({target,stats},null,2));
 } finally {
  rmSync(corpusPath(report.root),{recursive:true,force:true});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
