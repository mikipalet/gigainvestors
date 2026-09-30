import { exchangeCountries } from '../../../lib/value/universe-config';
import type { SymbolRow } from '../../../lib/value/eodhd';
import reviewedAliases from '../../../lib/value/index-membership-aliases.json';
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

export default async function indexMembership(options:{force?:boolean}={}){
 const today=new Date().toISOString().slice(0,10),companies=readJsonl<Company>('universe.jsonl');
 if(!companies.length)throw new Error('Run universe first');
 const corpusCompanies=companies.length;
 let match=createConstituentMatcher(companies);
 const supplementalCompanies:Company[]=[], memberships:Record<string,string[]>={},reports=[];
 const symbolCaches=new Map<string,Map<string,SymbolRow>>();
 const listingFor=(row:Constituent)=>{
  if(!row.exchange||!row.code)return undefined;
  if(!symbolCaches.has(row.exchange)){
   const data=readCorpusJson<{data:SymbolRow[]}>(`raw/eodhd/universe/symbols-${row.exchange}.json`);
   symbolCaches.set(row.exchange,new Map((data?.data??[]).map(r=>[r.Code,r])));
  }
  return symbolCaches.get(row.exchange)!.get(row.code);
 };
 const reviewed:Record<string,{id:string;reason:string}>=reviewedAliases;
 // Resolve vendor codes from its directory before spending 10 calls on fundamentals.
 let directory=readCorpusJson<{retrievedAt:string;data:SymbolRow[]}>('index-membership/index-symbols.json');
 if(process.env.EODHD_API_KEY && (!directory || !directory.retrievedAt.startsWith(today)) && budgetUsage().used+11<=T.budget.dailyCalls){
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
  if(!eod && providerCode && budgetUsage().used+10<=T.budget.dailyCalls && process.env.EODHD_API_KEY){
   try{
    const data=await eodhd<{Components?:Record<string,{Code:string;Exchange:string;Name:string;ISIN?:string}>}>(`fundamentals/${encodeURIComponent(providerCode)}.INDX`,{}, {retries:0});
    const components=Object.values(data.Components??{}).map(c=>({name:c.Name,code:c.Code,exchange:c.Exchange,isin:c.ISIN}));
    if(components.length){eod={retrievedAt:new Date().toISOString(),url:`https://eodhd.com/api/fundamentals/${encodeURIComponent(providerCode)}.INDX`,components};writeCorpusJson(`index-membership/eodhd/${key}.json`,eod);}
   }catch(e){error=e instanceof Error?e.message:String(e);}
  }
  if(eod){rows=eod.components;provider='eodhd';}
  else{
   if(!source || options.force || !source.retrievedAt.startsWith(today)){
    try{source={...JSON.parse(execFileSync('python3',[path.resolve(__dirname,'../wiki-tables.py'),page],{encoding:'utf8',maxBuffer:10*1024*1024,timeout:60000})),retrievedAt:new Date().toISOString()};writeCorpusJson(`index-membership/raw/${key}.json`,source);}
    catch(e){error=e instanceof Error?e.message:String(e);}
   }
   if(source){rows=parseConstituentTables(source,exchange);provider=source.url.includes('wikipedia.org')?'wikipedia':'index-provider';}
  }
  rows=[...new Map(rows.map(row=>[JSON.stringify([row.code,row.exchange,row.isin,row.name]),row])).values()];
  const matched=[],unmatched=[];
  for(const row of rows){
   const override=reviewed[`${name}|${row.code??''}|${row.name}`];
   let result:ReturnType<typeof match>|{id:string;via:string;reason:string}=override&&companies.some(c=>c.id===override.id)?{id:override.id,via:'reviewed',reason:override.reason}:match(row);
   const listing=!result?listingFor(row):undefined;
   if(listing){
    result=match({...row,name:listing.Name,isin:listing.Isin??undefined});
    if(!result){
     const id=`${listing.Code}.${row.exchange}`;
     const country=exchangeCountries[row.exchange!]??(row.exchange==='MI'?'IT':null);
     if(country){
      const company:Company={id,name:listing.Name,code:listing.Code,exchange:row.exchange!,country,currency:listing.Currency,isin:listing.Isin,cik:null,lei:null,edinetCode:null,sector:null,industry:null,kind:'operating',listings:[id],listingExchange:listing.Exchange,marketCapUsd:null,description:null,source:'eodhd'};
      supplementalCompanies.push(company);companies.push(company);match=createConstituentMatcher(companies);
      result={id,via:'cached-listing',reason:'Identity absent from corpus universe; verified in cached EODHD exchange-symbol-list. No analysis fabricated.'};
     }
    }
   }
   if(!result){unmatched.push(row);continue;}
   matched.push({...row,...result});(memberships[result.id]??=[]).push(name);
  }
  const sourceComplete=rows.length>=expected && rows.length<=Math.ceil(expected*1.1);
  const report={name,provider,url:eod?.url??source?.url??null,retrievedAt:eod?.retrievedAt??source?.retrievedAt??null,revision:source?.revision??null,expected,total:rows.length,matched,unmatched,sourceComplete,error};reports.push(report);
  console.log(`${name}: ${matched.length}/${rows.length} mapped; ${unmatched.length} unmatched${sourceComplete?'':' INCOMPLETE SOURCE'}`);
 }
 for(const id of Object.keys(memberships))memberships[id]=[...new Set(memberships[id])];
 const complete=reports.every(r=>r.sourceComplete&&r.unmatched.length/r.total<0.01);
 const snapshot={asOf:today,complete,memberships,indexes:reports,companies:corpusCompanies,memberCompanies:Object.keys(memberships).length,supplementalCompanies};
 writeCorpusJson(`index-membership/snapshots/${today}.json`,snapshot);writeCorpusJson('index-membership/latest.json',snapshot);
 console.log(`index-membership: ${snapshot.memberCompanies} companies; complete=${complete}; EODHD ledger=${budgetUsage().used}`);
 if(!complete)throw new Error('Membership coverage incomplete; see index-membership/latest.json. Publication is blocked except local --out --force inspection.');
}
