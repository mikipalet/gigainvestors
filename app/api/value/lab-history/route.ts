import {readStore} from '@/lib/value/store';
import {historyRatio,type LabHistory} from '@/lib/value/viz-lab-three';
import type {HistoryIndex,SnapshotRow} from '@/lib/value/time-travel';
export const revalidate=86400;
/** Annual observations retain the snapshot's original discount and decision. */
export async function GET(){
 const index=await readStore<HistoryIndex>('history/index.json');
 if(!index)return Response.json({}, {status:404});
 const years=await Promise.all(index.years.map(y=>readStore<SnapshotRow[]>(`history/${y}.json`)));
 const result:LabHistory={};
 years.forEach((rows,i)=>rows?.forEach(row=>{
  const ratio=historyRatio(row);
  (result[row[0]]??=[]).push({year:index.years[i],ratio,buy:row[3]});
 }));
 return Response.json(result,{headers:{'Cache-Control':'public, max-age=300'}});
}
