import { constituentName as normalizedName } from './cached-listings';
import { adrUnderlyingIsins, cdiUnderlyingIsins } from './universe-config';
import type { Company } from './types';
export type IndexCompany = Company & { indexes: string[] };
export interface Constituent { name: string; code?: string; exchange?: string; isin?: string; }
export interface Match { id: string; via: 'ticker'|'isin'|'name'|'reviewed'; }
const underlying=(isin:string)=>adrUnderlyingIsins[isin]??cdiUnderlyingIsins[isin]??isin;
const ticker=(code:string,exchange:string)=>`${(exchange==='MX'?code.replaceAll(' ',''):code).toUpperCase().replace(/[. /]/g,'-').replace(/-+$/,'')}.${exchange.toUpperCase()}`;
export function createConstituentMatcher(companies: Company[]) {
 const byId=new Map(companies.map(c=>[c.id,c]));
 const primaries=new Map(companies.map(c=>[ticker(c.code,c.exchange),c.id]));
 const tickers=new Map<string,Set<string>>(),isins=new Map<string,Set<string>>(),names=new Map<string,Set<string>>();
 const add=(map:Map<string,Set<string>>,key:string,id:string)=>{if(key)map.set(key,new Set([...(map.get(key)??[]),id]));};
 const addCompany=(c:Company)=>{
  byId.set(c.id,c);primaries.set(ticker(c.code,c.exchange),c.id);
  for(const id of new Set([c.id,...c.listings])){const dot=id.lastIndexOf('.');add(tickers,ticker(id.slice(0,dot),id.slice(dot+1)),c.id);}
  if(c.isin)add(isins,underlying(c.isin),c.id);
  for(const n of [c.name,c.nameEn,c.nameLocal,c.nativeName])if(n)add(names,normalizedName(n),c.id);
 }
 for(const c of companies)addCompany(c);
 const match=(row:Constituent):Match|null=>{
  const primary=row.code&&row.exchange?primaries.get(ticker(row.code,row.exchange)):undefined;
  if(primary){
   const direct=byId.get(primary)!;
   const homes=[...(tickers.get(ticker(row.code!,row.exchange!))??[])].filter(id=>{
    const home=byId.get(id)!;
    return direct.exchange==='US'&&home.exchange!=='US'&&Boolean(
     direct.isin&&underlying(direct.isin)!==direct.isin&&underlying(direct.isin)===home.isin
     || /\b(ADR|ADS)\b|depositary/i.test(direct.name)&&normalizedName(direct.name)===normalizedName(home.name));
   });
   return homes.length===1?{id:homes[0],via:'ticker'}:{id:primary,via:'ticker'};
  }
  for(const [via,hits] of [
   ['ticker',row.code&&row.exchange?tickers.get(ticker(row.code,row.exchange)):undefined],
   ['isin',row.isin?isins.get(underlying(row.isin)):undefined],
   ['name',names.get(normalizedName(row.name))],
  ] as const){if(hits?.size===1)return {id:[...hits][0],via};if(hits && hits.size>1)return null;}
  return null;
 };
 return Object.assign(match,{addCompany});
}
export function applyMembership(companies:Company[],memberships:Record<string,string[]>):IndexCompany[]{
 return companies.map(c=>({...c,indexes:[...new Set(memberships[c.id]??[])]}));
}
