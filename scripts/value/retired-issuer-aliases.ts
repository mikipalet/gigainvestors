import registry from '../../lib/value/issuer-registry.json';
import {existsSync,readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
/** Reviewed retirements survive a reset to a snapshot predating aliases.json. */
export const reviewedIssuerAliases:Readonly<Record<string,string>>=Object.fromEntries(
 registry.groups.flatMap(group=>group.ids.filter(id=>id!==group.canonical).map(id=>[id,group.canonical])),
);
export function retiredIssuerAliases(aliases:Record<string,string>,published:ReadonlySet<string>):Record<string,string>{
 const retired:Record<string,string>={};
 for(const [id,target]of Object.entries(aliases)){
  if(aliases[target])throw Error(`Issuer alias must be direct: ${id}`);
  if(!published.has(target))throw Error(`Issuer alias target missing: ${id}`);
  if(!published.has(id))retired[id]=target;
 }
 return retired;
}
export function readRetiredIssuerAliases(repo:string):Record<string,string>{
 const file=path.join(repo,'aliases.json');if(!existsSync(file))return {};
 const aliases=JSON.parse(readFileSync(file,'utf8'));
 const ids=new Set<string>();
 const dir=path.join(repo,'dossiers');
 if(existsSync(dir))for(const f of readdirSync(dir).filter(f=>/^\d{3}\.json$/.test(f)))for(const id of Object.keys(JSON.parse(readFileSync(path.join(dir,f),'utf8'))))ids.add(id);
 return retiredIssuerAliases(aliases,ids);
}

/** Release membership follows the already-published issuer identity, including
 * reviewed dynamic aliases which do not belong to the static registry. */
export function releaseCanonicalIds(ids:string[], retired:Readonly<Record<string,string>>):Set<string> {
 return new Set(ids.map(id=>retired[id]??reviewedIssuerAliases[id]??id));
}
