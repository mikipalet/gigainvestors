import {existsSync,readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import type {IndexRow,SnapshotRow} from '../../lib/value/types';
import type {HistoryIndex} from '../../lib/value/time-travel';

/** A newer run can contain complete quarters without the previously released
 * annual frame. Omission is not a retraction of a historical prediction. Keep
 * missing rows and their identities; incoming observations still win by ID. */
export function retainPublishedHistory(files:Record<string,unknown>,previousRepo:string) {
 const directory=path.join(previousRepo,'history'),retained:Array<{file:string;id:string}>=[];
 if(!existsSync(directory))return retained;
 const read=(file:string)=>JSON.parse(readFileSync(path.join(directory,file),'utf8'));
 const periods=readdirSync(directory).filter(file=>/^\d{4}(?:Q[1-4])?\.json$/.test(file));
 for(const file of periods){
  const key=`history/${file}`,current=(files[key]??[]) as SnapshotRow[],seen=new Set(current.map(row=>row[0]));
  const missing=(read(file) as SnapshotRow[]).filter(row=>!seen.has(row[0]));
  if(!missing.length)continue;
  files[key]=[...current,...missing];retained.push(...missing.map(row=>({file:key,id:row[0]})));
 }
 if(!retained.length)return retained;
 const indexFile=path.join(directory,'index.json');
 const index=(files['history/index.json']??(existsSync(indexFile)?read('index.json'):{years:[],perYear:{}})) as HistoryIndex;
 index.years=[...new Set([...index.years,...Object.keys(files).flatMap(f=>/^history\/(\d{4})\.json$/.exec(f)?.slice(1).map(Number)??[])])].sort((a,b)=>a-b);
 index.quarters=[...new Set([...(index.quarters??[]),...Object.keys(files).flatMap(f=>/^history\/(\d{4}Q[1-4])\.json$/.exec(f)?.slice(1)??[])])].sort();
 files['history/index.json']=index;
 const hadIdentities=files['history/companies.json']!==undefined||existsSync(path.join(directory,'companies.json'));
 const identities=(files['history/companies.json']??[]) as IndexRow[],seen=new Set(identities.map(row=>row.id));
 const needed=new Set(retained.map(row=>row.id));
 const append=(rows:IndexRow[])=>{for(const row of rows)if(needed.has(row.id)&&!seen.has(row.id)){identities.push(row);seen.add(row.id);}};
 if(existsSync(path.join(directory,'companies.json')))append(read('companies.json'));
 // Legacy snapshots may have only the ordinary index identity.
 const indexDirectory=path.join(previousRepo,'index');
 if([...needed].some(id=>!seen.has(id))&&existsSync(indexDirectory))for(const file of readdirSync(indexDirectory).filter(f=>/^[A-Z]{2}\.json$/.test(f)))append(JSON.parse(readFileSync(path.join(indexDirectory,file),'utf8')));
 // Preserve the legacy absence: browser views then use the current index,
 // including exact identities restored by the full-company freeze.
 if(hadIdentities)files['history/companies.json']=identities;
 return retained;
}
