import {issuerSearchNames} from '../value/issuer-search';
import type {SearchIndex} from '../types';
import type {IndexRow} from '../value/types';
import {companyTicker} from '../company-route';

export type SearchCompany = SearchIndex['stocks'][number] & {aliases?:string[]; names?:string[]; mc?:number|null};
export type UnifiedSearchIndex = Omit<SearchIndex,'stocks'> & {stocks:SearchCompany[]};

/** Listing punctuation is not issuer identity. Keep exchange suffixes intact. */
export function listingKey(ticker:string):string {
 return ticker.toUpperCase().replace(/\.US$/,'').replace(/-OLD(?:\d+)?$/,'').replace(/^([A-Z]+)[.-]([A-Z])$/, '$1-$2');
}
export function companyNameKey(name:string):string {
 return name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .replace(/\b(?:class|cl)\s+[a-z0-9]+\b/g,'').replace(/\b(?:sponsored|unsponsored|adr|ads|ordinary|shares)\b/g,'')
  .replace(/[^a-z0-9]/g,' ').replace(/\b(?:incorporated|inc|corporation|corp|limited|ltd|plc|company|co)\b/g,'').replace(/\s+/g,' ').trim();
}
// Names/venues absent from the provider's listing set; explicit issuer aliases,
// never fuzzy spelling matches (Plexus and Pluxee are different companies).
export const extraCompanyAliases:Record<string,string[]> = {
 'AAPL':['APC.DE','APC.F','APC.XETRA'],
 'GOOGL':['google','GOOG','GOOG.US','ABEA.DE','ABEC.DE'],
 'PETR3.SA':['PBR.A','PBR-A.US'],
};

export function buildCompanyIndex(holdings:SearchIndex, dossiers:Pick<IndexRow,'id'|'n'|'mc'|'h'|'nameEn'|'nameLocal'>[]=[], listingAliases:Record<string,string>={}):UnifiedSearchIndex {
 const rows = [
  ...dossiers.map(r=>({t:companyTicker(r.id),n:r.n,h:r.h,mc:r.mc,dossier:true,names:[r.n,r.nameEn,r.nameLocal].filter((name):name is string=>Boolean(name))})),
  ...holdings.stocks.map(r=>({...r,mc:null as number|null,dossier:false,names:[r.n]})),
 ];
 const parents=rows.map((_,i)=>i);
 const root=(i:number):number=>parents[i]===i?i:(parents[i]=root(parents[i]));
 const join=(a:number,b:number)=>{parents[root(b)]=root(a);};
 const keys=new Map<string,number>();
 rows.forEach((r,i)=>{
  const key=listingKey(r.t);
  if(keys.has(key))join(keys.get(key)!,i);else keys.set(key,i);
 });
 // Provider name matching conflates these distinct legal issuers.
 const rejectedAliases:Record<string,string>={'COMP.US':'CPG.LSE','AGX.US':'ARG.PA','NNBR.US':'NN.AS'};
 const aliases=Object.fromEntries(Object.entries(listingAliases).filter(([from,to])=>rejectedAliases[from]!==to));
 for(const [to,froms] of Object.entries(extraCompanyAliases))for(const from of froms)aliases[from]=to;
 for(const [from,to] of Object.entries(aliases)) {
  const a=keys.get(listingKey(from)),b=keys.get(listingKey(to));
  if(a!==undefined&&b!==undefined)join(b,a);
 }
 const groups=new Map<number,number[]>();
 rows.forEach((_,i)=>{const key=root(i);groups.set(key,[...(groups.get(key)??[]),i]);});
 const aliasTargets=new Set(Object.values(listingAliases).map(listingKey));
 const result=new Map<number,SearchCompany>();
 for(const [key,indices] of groups){
  indices.sort((a,b)=>Number(rows[b].dossier)-Number(rows[a].dossier)||Number(aliasTargets.has(listingKey(rows[b].t)))-Number(aliasTargets.has(listingKey(rows[a].t)))||(rows[b].mc??0)-(rows[a].mc??0)||rows[b].h-rows[a].h||rows[a].t.localeCompare(rows[b].t));
  const r=rows[indices[0]];
  result.set(key,{t:r.t.replace(/-OLD(?:\d+)?$/,''),n:r.n,h:Math.max(...indices.map(i=>rows[i].h)),mc:Math.max(0,...indices.map(i=>rows[i].mc??0)),aliases:[...new Set(indices.flatMap(i=>[rows[i].t,...(!/\.[A-Z]{2,5}$/.test(rows[i].t)?[`${rows[i].t}.US`]:[])]))],names:[...new Set(indices.flatMap(i=>rows[i].names))]});
 }
 for(const [from,to] of Object.entries(aliases)) {
  const i=keys.get(listingKey(to));
  if(i!==undefined)result.get(root(i))!.aliases!.push(from,companyTicker(from));
 }
 for(const row of result.values()) {
  row.aliases=[...new Set([...(row.aliases??[]),...(issuerSearchNames[row.t]??issuerSearchNames[`${row.t}.US`]??[]),row.t,...(row.aliases??[]).map(a=>a.replace(/\.[A-Z]{2,5}$/,'')).flatMap(a=>[a,a.replace(/^([A-Z]+)-([A-Z])$/,'$1.$2')])])];
 }
 return {investors:holdings.investors,stocks:[...result.values()]};
}
