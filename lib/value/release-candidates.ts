import {companyExclusion} from './fund-exclusion';
import {meetsCapFloor} from './held-universe';
import type {Company} from './types';
import {isGlobalDepositary,normalizedName} from './universe';

export interface ReleaseCandidate {id:string;reasons:string[]}

const secondaryInstrument=/\b(ADR|ADS|DRC|CDI|Reg S|REGS|144A|PRF|PREF|Preference|Non-?Cum(?:ulative)?)\b|\(HK Reg\)|\bH[- ]?Shares?\b|-H$|Depositary|New York Registry/i;
/** Depositary receipts carry a US ISIN away from US venues or a five-letter Y/F ticker on them; -P codes are preferred lines; mainland B shares use 200/900 codes. */
function isSecondaryInstrument(c:Company):boolean{
 if(isGlobalDepositary(c.name)||secondaryInstrument.test(c.name))return true;
 if(c.exchange!=='US'&&c.isin?.startsWith('US'))return true;
 if(c.exchange==='US'&&(/^[A-Z]{4}[YF]$/.test(c.code)||/-P[A-Z]?$/.test(c.code)))return true;
 return ['SHE','SHG'].includes(c.exchange)&&/^(?:200|900)\d{3}$/.test(c.code);
}
const identityKeys=(c:Company):string[]=>[c.cik&&`cik:${c.cik}`,c.isin&&`isin:${c.isin}`,c.lei&&`lei:${c.lei}`,`name:${normalizedName(c.name,c)}`].filter((k):k is string=>Boolean(k)&&k!=='name:');
const MIN_SHARED_STEM=16;
/** Vendor names truncate mid-word ("...Co., Limite"), so a long shared stem still names one issuer. */
function sharedStemOwner(c:Company,owners:Map<string,string>,rank:Map<string,number>):string|undefined{
 const stem=normalizedName(c.name,c);
 if(stem.length<MIN_SHARED_STEM)return undefined;
 for(const [key,id] of owners){
  if(!key.startsWith('name:')||id===c.id||rank.get(id)!>rank.get(c.id)!)continue;
  const other=key.slice(5);
  if(other.length>=MIN_SHARED_STEM&&(other.startsWith(stem)||stem.startsWith(other)))return id;
 }
 return undefined;
}

/** Cap-floor companies join publication through the same reviewed release as held additions; a reason here holds the id. */
export function capFloorCandidates({companies,baselineIds,exclusion=companyExclusion}:{companies:Company[];baselineIds:Iterable<string>;exclusion?:(company:Company)=>string|null}):ReleaseCandidate[]{
 const baseline=new Set(baselineIds);
 const candidates=companies.filter(c=>meetsCapFloor(c)&&!c.indexes?.length&&!c.heldBySuperinvestors&&!baseline.has(c.id));
 // The published listing owns every identity it shares; among new candidates the largest listing does.
 const ranked=[...companies.filter(c=>baseline.has(c.id)),...[...candidates].sort((a,b)=>(b.marketCapUsd??0)-(a.marketCapUsd??0)||a.id.localeCompare(b.id))];
 const rank=new Map(ranked.map((c,i)=>[c.id,i]));
 const issuerOf=new Map<string,string>();
 for(const c of ranked)for(const key of identityKeys(c))if(!issuerOf.has(key))issuerOf.set(key,c.id);
 return candidates.map(c=>{
  const reasons:string[]=[];
  const excluded=exclusion(c);
  if(excluded)reasons.push(`excluded: ${excluded}`);
  if(isSecondaryInstrument(c))reasons.push('secondary instrument');
  const issuer=identityKeys(c).map(key=>issuerOf.get(key)).find(id=>id&&id!==c.id)??sharedStemOwner(c,issuerOf,rank);
  if(issuer)reasons.push(`same issuer as ${issuer}`);
  return {id:c.id,reasons};
 }).sort((a,b)=>a.id.localeCompare(b.id));
}
