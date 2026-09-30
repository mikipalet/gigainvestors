import { figiListings } from '../../../lib/value/figi-listings';
import { cachedListings, constituentName } from '../../../lib/value/cached-listings';
import { nonOperatingReason, companyExclusion } from '../../../lib/value/fund-exclusion';
import { exchangeCountries } from '../../../lib/value/universe-config';
import type { SymbolRow } from '../../../lib/value/eodhd';
import reviewedAliases from '../../../lib/value/index-membership-aliases.json';
import reviewedSources from '../../../lib/value/reviewed-index-sources.json';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { statfsSync } from 'node:fs';
import definitions from '../../../lib/value/major-indexes.json';
import { budgetUsage } from '../../../lib/value/budget';
import { T } from '../../../lib/value/config';
import { readCorpusJson, readJsonl, writeCorpusJson } from '../../../lib/value/corpus';
import { eodhd } from '../../../lib/value/eodhd';
import { createConstituentMatcher, type Constituent } from '../../../lib/value/index-membership';
import { parseConstituentTables, type TableSource } from '../../../lib/value/index-constituents';
import type { Company } from '../../../lib/value/types';

export default async function indexMembership(options:{force?:boolean;offline?:boolean}={}){
 const today=new Date().toISOString().slice(0,10),companies=readJsonl<Company>('universe.jsonl');
 if(!companies.length)throw new Error('Run universe first');
 const corpusCompanies=companies.length;
 const corpusIds=new Set(companies.map(c=>c.id));
 const verified=readCorpusJson<Company[]>('index-membership/verified-identities.json')??reviewedSources.identities as Company[];
 for(const c of verified)if(!companies.some(row=>row.id===c.id))companies.push(c);
 let match=createConstituentMatcher(companies);
 const supplementalCompanies:Company[]=verified.filter(c=>!corpusIds.has(c.id)), memberships:Record<string,string[]>={},reports=[];
 const catalog=cachedListings(),figi=figiListings(catalog.listings);
 const reviewed:Record<string,{id:string;reason:string}>=reviewedAliases;
 // Resolve vendor codes from its directory before spending 10 calls on fundamentals.
 let directory=readCorpusJson<{retrievedAt:string;data:SymbolRow[]}>('index-membership/index-symbols.json');
 if(!options.offline && process.env.EODHD_API_KEY && (!directory || !directory.retrievedAt.startsWith(today)) && budgetUsage().used+11<=T.budget.dailyCalls){
  try{directory={retrievedAt:new Date().toISOString(),data:await eodhd<SymbolRow[]>('exchange-symbol-list/INDX',{}, {retries:0})};writeCorpusJson('index-membership/index-symbols.json',directory);}
  catch{directory=null;}
 }
 const indexName=(value:string)=>value.toLowerCase().replace(/index|indices|\W/g,'');
 for(const [name,page,exchange,expected,symbol] of definitions as [string,string,string,number,string][]){
  const disk=statfsSync('/');if(disk.bavail*disk.bsize<5e9)throw new Error('Disk below 5 GB; stopping');
  const key=name.replaceAll('/','-');let source=readCorpusJson<TableSource>(`index-membership/raw/${key}.json`);
  let rows:Constituent[]=[],provider='wikipedia',error:string|undefined;
  const cached=readCorpusJson<{retrievedAt:string;url:string;components:Constituent[]}>(`index-membership/eodhd/${key}.json`);
  let eod=cached?.retrievedAt.startsWith(today)?cached:null;
  const providerCode=directory?.data.find(r=>r.Code===symbol)?.Code
   ?? directory?.data.find(r=>indexName(r.Name)===indexName(name))?.Code;
  if(!options.offline && !eod && providerCode && budgetUsage().used+10<=T.budget.dailyCalls && process.env.EODHD_API_KEY){
   try{
    const data=await eodhd<{Components?:Record<string,{Code:string;Exchange:string;Name:string;ISIN?:string}>}>(`fundamentals/${encodeURIComponent(providerCode)}.INDX`,{}, {retries:0});
    const components=Object.values(data.Components??{}).map(c=>({name:c.Name,code:c.Code,exchange:c.Exchange,isin:c.ISIN}));
    if(components.length){eod={retrievedAt:new Date().toISOString(),url:`https://eodhd.com/api/fundamentals/${encodeURIComponent(providerCode)}.INDX`,components};writeCorpusJson(`index-membership/eodhd/${key}.json`,eod);}
   }catch(e){error=e instanceof Error?e.message:String(e);}
  }
  type ReviewedSource={retrievedAt:string;url:string;components:Constituent[];expected?:number;asOf?:string;provider?:string;method?:string;identityUrl?:string;corroborationUrl?:string};
  const candidate=readCorpusJson<ReviewedSource>(`index-membership/official/${key}.json`)??(reviewedSources.sources as Record<string,ReviewedSource>)[key];
  // Dated research is a bootstrap, not a permanent replacement for source refresh.
  const official=candidate&&Date.now()-Date.parse(candidate.retrievedAt)<30*86400000?candidate:null;
  if(official){rows=official.components;provider=official.provider??(official.url.includes('wikipedia.org')?'wikipedia':'index-provider');}
  else if(eod){rows=eod.components;provider='eodhd';}
  else{
   if(!source || options.force || !source.retrievedAt.startsWith(today)){
    try{source={...JSON.parse(execFileSync('python3',[path.resolve(__dirname,'../wiki-tables.py'),page],{encoding:'utf8',maxBuffer:10*1024*1024,timeout:60000})),retrievedAt:new Date().toISOString()};writeCorpusJson(`index-membership/raw/${key}.json`,source);}
    catch(e){error=e instanceof Error?e.message:String(e);}
   }
   if(source){rows=parseConstituentTables(source,exchange);provider=source.url.includes('wikipedia.org')?'wikipedia':'index-provider';}
  }
  rows=[...new Map(rows.map(row=>[JSON.stringify([row.code,row.exchange,row.isin,row.name]),row])).values()];
  const matched=[],unmatched=[],excluded=[];
  for(const row of rows){
   const override=reviewed[`${name}|${row.code??''}|${row.name}`];
   let result:ReturnType<typeof match>|{id:string;via:string;reason:string}=override&&companies.some(c=>c.id===override.id)?{id:override.id,via:'reviewed',reason:override.reason}:match(row);
   const candidates=[...catalog.find(row),...(!result?figi(row):[])];
   if(!result) for(const candidate of candidates){const hit=match({name:candidate.Name,code:candidate.Code,exchange:candidate.exchange,isin:candidate.Isin??undefined});if(hit){result=hit;break;}}
   const resolvedId=result?.id;
   const resolvedCompany=resolvedId?companies.find(c=>c.id===resolvedId):undefined;
   // Vendor mnemonics can collide with leveraged ETFs (e.g. BAES vs BAE Systems).
   // Never borrow classification from a different security after resolving the issuer.
   const listing=candidates.find(c=>!resolvedCompany||resolvedCompany.listings.includes(`${c.Code}.${c.exchange}`)||Boolean(c.Isin&&c.Isin===resolvedCompany.isin)||constituentName(c.Name)===constituentName(resolvedCompany.name));
   const excludedReason=nonOperatingReason({name:row.name,industry:resolvedCompany?.industry},listing);
   if(excludedReason){excluded.push({...row,reason:excludedReason,...(result?{id:result.id}:{})});continue;}
   if(!result && listing){
    result=match({...row,name:listing.Name,isin:listing.Isin??undefined});
    if(!result){
     const id=`${listing.Code}.${listing.exchange}`;
     const country=exchangeCountries[row.exchange??'']??exchangeCountries[listing.exchange]??null;
     if(country){
      const company:Company={id,name:listing.Name,code:listing.Code,exchange:listing.exchange,country,currency:listing.Currency,isin:listing.Isin,cik:null,lei:null,edinetCode:null,sector:null,industry:null,kind:'operating',listings:[id],listingExchange:listing.Exchange,marketCapUsd:null,description:null,source:'eodhd'};
      supplementalCompanies.push(company);companies.push(company);match.addCompany(company);
      result={id,via:'cached-listing',reason:'Identity absent from corpus universe; verified in cached EODHD exchange-symbol-list. No analysis fabricated.'};
     }
    }
   }
   if(!result){unmatched.push(row);continue;}
   const company=companies.find(c=>c.id===result!.id)!;
   const reason=companyExclusion(company);
   if(reason){excluded.push({...row,id:company.id,reason});continue;}
   matched.push({...row,...result});(memberships[result.id]??=[]).push(name);
  }
  const expectedCount=official?.expected??expected;
  const sourceComplete=rows.length>=expectedCount && rows.length<=Math.ceil(expectedCount*1.1);
  const report={name,provider,url:official?.url??eod?.url??source?.url??null,retrievedAt:official?.retrievedAt??eod?.retrievedAt??source?.retrievedAt??null,asOf:official?.asOf,method:official?.method,identityUrl:official?.identityUrl,corroborationUrl:official?.corroborationUrl,revision:source?.revision??null,expected:expectedCount,total:rows.length,matched,unmatched,excluded,sourceComplete,error};reports.push(report);
  console.log(`${name}: ${matched.length}/${rows.length} mapped; ${excluded.length} excluded; ${unmatched.length} unmatched${sourceComplete?'':' INCOMPLETE SOURCE'}`);
 }
 const excludedIds=new Set(reports.flatMap(r=>r.excluded.map(e=>'id' in e?e.id:undefined)).filter(Boolean));
 for(const id of Object.keys(memberships)){
  if(excludedIds.has(id))delete memberships[id];
  else memberships[id]=[...new Set(memberships[id])];
 }
 // A fund identified through any source must not leak through another index.
 for(const report of reports)for(const row of [...report.matched])if(excludedIds.has(row.id)){
  report.matched.splice(report.matched.indexOf(row),1);report.excluded.push({...row,reason:'Fund excluded in another index source'});
 }
 const complete=reports.every(r=>r.sourceComplete&&r.unmatched.length/r.total<0.01);
 const snapshot={asOf:today,complete,memberships,indexes:reports,companies:corpusCompanies,memberCompanies:Object.keys(memberships).length,supplementalCompanies:supplementalCompanies.filter(c=>memberships[c.id])};
 writeCorpusJson(`index-membership/snapshots/${today}.json`,snapshot);writeCorpusJson('index-membership/latest.json',snapshot);
 console.log(`index-membership: ${snapshot.memberCompanies} companies; complete=${complete}; EODHD ledger=${budgetUsage().used}`);
 if(!complete)throw new Error('Membership coverage incomplete; see index-membership/latest.json. Publication is blocked except local --out --force inspection.');
}
