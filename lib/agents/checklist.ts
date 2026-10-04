import {getDefaultIndex,getMeta,enrichRows,readStore} from '@/lib/value/store';
import {browserRow,unpackView,type BrowserPayload,type BrowserRow} from '@/lib/value/browser-view';
import type {PriceMap} from '@/lib/value/types';

export async function loadChecklist(frame?: string, deferred=false) {
 const meta=await getMeta();
 const key=frame&&/^\d{4}$/.test(frame)?`${frame}Q4`:frame;
 const file=key?meta?.views?.quarters?.[key]??(key.endsWith('Q4')?meta?.views?.years[key.slice(0,4)]:undefined):meta?.views?.current;
 if(key&&!file)return null;
 let rows:BrowserRow[];
 if(file){
  const files=[file,...(deferred?(key?meta?.views?.quarterDeferred?.[key]??(key.endsWith('Q4')?meta?.views?.yearDeferred?.[key.slice(0,4)]:[])??[]:meta?.views?.deferred??[]):[])];
  const parts=await Promise.all(files.map(f=>readStore<BrowserPayload>(f)));
  if(parts.some(p=>!p))return null;
  rows=[...new Map(parts.flatMap(p=>unpackView(p!)).map(r=>[r.id,r])).values()];
 }else{
  const source=await getDefaultIndex().then(enrichRows);
  const quotes=Object.assign({},...await Promise.all([...new Set(source.map(r=>r.c))].map(c=>readStore<PriceMap>(`prices/${c}.json`))));
  rows=source.map(r=>browserRow(r,quotes[r.id]??null));
 }
 return {meta,rows,frame:key};
}
export {checklistMarkdown} from './checklist-content';
