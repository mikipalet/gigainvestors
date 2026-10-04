import {isDeepStrictEqual} from 'node:util';
import type {readVerdictFreeze} from './verdict-freeze';

/** Existing relative ranks must survive even if current sorting logic changed. */
export function preserveAdditionBaseline(files:Record<string,any>,freeze:ReturnType<typeof readVerdictFreeze>):void{
 for(const [file,previous]of Object.entries(freeze.previous)){
  if(!/^index\//.test(file)||!Array.isArray(previous))continue;
  const oldIds=new Set(previous.map(r=>r.id));
  let offset=0;
  files[file]=(files[file]??[]).map((row:any)=>oldIds.has(row.id)?previous[offset++]:row);
  if(offset!==previous.length)throw Error(`Additions-only lost an existing index row: ${file}`);
 }
 for(const [file,previous]of Object.entries(freeze.previous)){
  if(/^dossiers\//.test(file))for(const [id,dossier]of Object.entries(previous)){
   // JSON equality includes property order: each serialized dossier stays byte-identical.
   if(JSON.stringify(files[file]?.[id])!==JSON.stringify(dossier))throw Error(`Additions-only changed dossier ${id}`);
  }
  if(/^index\//.test(file)&&Array.isArray(previous)){
   const oldIds=new Set(previous.map(r=>r.id));
   if(!isDeepStrictEqual((files[file]??[]).filter((r:any)=>oldIds.has(r.id)),previous))throw Error(`Additions-only changed ranks or numbers: ${file}`);
  }
  if(/^history\/(?:companies|\d{4}(?:Q[1-4])?)\.json$/.test(file)&&Array.isArray(previous)){
   const key=(r:any)=>Array.isArray(r)?r[0]:r.id;
   const current=new Map((files[file]??[]).map((r:any)=>[key(r),r]));
   for(const row of previous)if(!isDeepStrictEqual(current.get(key(row)),row))throw Error(`Additions-only changed historical row: ${file}/${key(row)}`);
  }
 }
}
