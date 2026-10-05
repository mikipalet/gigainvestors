import type {Dossier} from './types';

export interface IssuerIdentity {id:string;name?:string;isin?:string|null;lei?:string|null;cik?:string|null;figi?:string|null;primary?:string|null}
/** Only security/legal-entity identifiers join companies. Names are audit hints. */
export function issuerGroups(records:IssuerIdentity[],reviewed:string[][]=[],rejected:string[][]=[]):string[][]{
 const parents=new Map(records.map(r=>[r.id,r.id]));
 const root=(id:string):string=>{const p=parents.get(id)!;if(p===id)return id;const r=root(p);parents.set(id,r);return r;};
 const join=(a:string,b:string)=>{if(parents.has(a)&&parents.has(b))parents.set(root(b),root(a));};
 const keys=new Map<string,string>();
 for(const r of records){
  for(const field of ['isin','lei','cik','figi'] as const){
   const value=r[field]?.trim();if(!value||/^(?:0+|null|none|n\/a)$/i.test(value))continue;
   const key=`${field}:${field==='cik'?value.replace(/^0+/,''):value}`;
   if(keys.has(key))join(r.id,keys.get(key)!);else keys.set(key,r.id);
  }
  if(r.primary)join(r.id,r.primary);
 }
 for(const ids of reviewed){const anchor=ids.find(id=>parents.has(id));if(anchor)for(const id of ids)join(anchor,id);}
 for(const ids of rejected)for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)
  if(parents.has(ids[i])&&parents.has(ids[j])&&root(ids[i])===root(ids[j]))throw Error(`Issuer identity conflict: ${ids[i]} / ${ids[j]}`);
 const groups=new Map<string,string[]>();
 for(const id of parents.keys()){const key=root(id);groups.set(key,[...groups.get(key)??[],id]);}
 return [...groups.values()].filter(g=>g.length>1).map(g=>g.sort()).sort((a,b)=>a[0].localeCompare(b[0]));
}

export function chooseCanonical(dossiers:Dossier[],frozen:ReadonlySet<string>):string{
 const protectedRows=dossiers.filter(d=>frozen.has(d.id));
 if(protectedRows.length>1)throw Error(`Multiple frozen dossiers for one issuer: ${protectedRows.map(d=>d.id).join(', ')}`);
 if(protectedRows.length)return protectedRows[0].id;
 const years=(d:Dossier)=>d.historyCoverage?.years??d.tests?.understandable?.metrics.historyYears??0;
 const score=(d:Dossier)=>[
  Number(years(d)>=10),Number(Boolean(d.report&&d.report.kind!=='description')),
  Number(Boolean(d.company.indexes?.length)),
  Number(!d.id.endsWith('.US')||d.company.isin?.startsWith('US')===true),years(d),
 ];
 return [...dossiers].sort((a,b)=>{const x=score(a),y=score(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return y[i]-x[i];return a.id.localeCompare(b.id);})[0].id;
}

/** Holders live beside immutable analyses, so even frozen dossiers remain byte-identical. */
export function applyIssuerAliases(files:Record<string,any>,removed:Record<string,string>,holdersByTicker:Record<string,string[]>,investorNames:Record<string,string>):void{
 const dossiers:Record<string,Dossier>=Object.assign({},...Object.entries(files).filter(([f])=>f.startsWith('dossiers/')).map(([,v])=>v));
 for(const [id,target] of Object.entries(removed))if(!dossiers[target]||removed[target])throw Error(`Alias ${id}: missing or non-canonical target ${target}`);
 const resolve=(id:string)=>removed[id]??id;
 const aliases:Record<string,string>={};
 for(const [id,to]of Object.entries({...files['aliases.json'],...removed}) as [string,string][]){
  const target=resolve(to);if((id!==target&&!dossiers[id])||removed[id])aliases[id]=target;
 }
 const merged:Record<string,Dossier['holders']>={...files['issuer-holders.json']};
 for(const canonical of new Set(Object.values(removed))){
  const members=[canonical,...Object.keys(removed).filter(id=>removed[id]===canonical)];
  const names=new Map<string,string>((merged[canonical]??[]).map(h=>[h.code,h.name]));
  for(const id of members)for(const holder of dossiers[id]?.holders??[])names.set(holder.code,holder.name);
  const listings=new Set([...members,...members.flatMap(id=>dossiers[id]?.company.listings??[]),...Object.keys(aliases).filter(id=>aliases[id]===canonical)]);
  for(const id of listings)if(id.endsWith('.US'))for(const code of holdersByTicker[id.slice(0,-3).replaceAll('-','.')]??[])names.set(code,investorNames[code]??names.get(code)??code);
  merged[canonical]=[...names].sort(([a],[b])=>a.localeCompare(b)).map(([code,name])=>({code,name}));
 }
 for(const [file,data]of Object.entries(files)){
  if(file.startsWith('dossiers/')){for(const id of Object.keys(data))if(removed[id])delete data[id];}
  if(/^index\//.test(file)&&Array.isArray(data))files[file]=data.filter(row=>!removed[row.id]).map(row=>merged[row.id]?{...row,h:merged[row.id].length}:row);
  if(/^history\/(?:companies|\d{4}(?:Q[1-4])?)\.json$/.test(file)&&Array.isArray(data))files[file]=data.filter(row=>!removed[Array.isArray(row)?row[0]:row.id]);
 }
 if(files['top.json'])files['top.json']=[...new Set(files['top.json'].map(resolve))];
 files['aliases.json']=aliases;
 files['issuer-holders.json']=merged;
}
