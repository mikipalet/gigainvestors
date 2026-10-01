import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, statfsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { corpusPath, readCorpusJson, writeCorpusJson } from '../corpus';
import { universeCompanies } from '../companies';
import { checkIntegrity } from '../integrity';
import { T } from '../config';
import { createLimiter, fetchWithRetry, pool } from '../http';
import { fetchYahooFundamentals, normalizeYahooFundamentals } from '../fundamentals-yahoo';
import type { Company, Fundamentals, Year } from '../types';
import { detailUrl, filingUrl, historicalIndiaSymbols, integratedAnnualFiling, indiaDate, indiaSymbol, mergeIndiaYahoo, parseIndiaDetail, parseIndiaLegacy, parseIndiaXbrl, selectIndiaFilings, type IndiaFiling } from './filings';

export function assertIndiaDisk(available?:number): void {
  const disk=available===undefined?statfsSync('/'):null;
  if((available??disk!.bavail*disk!.bsize)<5*1024**3)throw new Error('Disk below 5 GiB; stopping India import');
}
export function indiaSplits(raw:any):NonNullable<Fundamentals['splits']>{
  const rows=Object.values(raw?.chart?.result?.[0]?.events?.splits??{}) as Array<{date:number;numerator:number;denominator:number}>;
  return rows.filter(x=>Number.isFinite(x.date)&&x.numerator>0&&x.denominator>0).map(x=>({date:new Date(x.date*1000).toISOString().slice(0,10),factor:x.numerator/x.denominator})).sort((a,b)=>a.date.localeCompare(b.date));
}
export function mergeIndiaActions(splits:NonNullable<Fundamentals['splits']>,rows:Array<{symbol:string;exDate:string;subject:string}>,symbol:string):NonNullable<Fundamentals['splits']>{
  const groups=new Map<string,Set<string>>();
  for(const row of rows){
    if(row.symbol!==symbol||!/bonus|split|sub-division/i.test(row.subject))continue;
    const date=indiaDate(row.exDate);const subjects=groups.get(date)??new Set<string>();subjects.add(row.subject);groups.set(date,subjects);
  }
  const byDate=new Map(splits.map(s=>[s.date,s.factor]));
  for(const [date,subjects]of groups){
    let factor=1,complete=true;
    for(const subject of subjects){
      const bonus=/^Bonus\s+(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)/i.exec(subject);
      const split=/Split.*From\s+Rs?\.?\s*(\d+(?:\.\d+)?).*To\s+R(?:s|e)\.?\s*(\d+(?:\.\d+)?)/i.exec(subject);
      if(bonus&&Number(bonus[2])>0)factor*=1+Number(bonus[1])/Number(bonus[2]);
      else if(split&&Number(split[2])>0)factor*=Number(split[1])/Number(split[2]);
      else complete=false;
    }
    if(complete&&Number.isFinite(factor)&&factor>0)byDate.set(date,factor);
  }
  return [...byDate].map(([date,factor])=>({date,factor})).sort((a,b)=>a.date.localeCompare(b.date));
}
const limit=createLimiter({perSecond:3});
const cachePath=(name:string)=>corpusPath('raw/india',name);
function cacheWrite(name:string,data:string|Buffer):void {
  assertIndiaDisk();
  const file=cachePath(name);mkdirSync(path.dirname(file),{recursive:true});
  const temp=`${file}.${process.pid}.tmp`;writeFileSync(temp,data);renameSync(temp,file);
}
async function cachedRequest(url:string,name:string,force=false):Promise<string>{
  assertIndiaDisk();
  if(!force&&existsSync(cachePath(name)))return readFileSync(cachePath(name),'utf8');
  const response=await fetchWithRetry(url,{beforeAttempt:()=>limit(async()=>{}),headers:{'User-Agent':'Mozilla/5.0','Referer':'https://www.nseindia.com/'},retries:1,signal:AbortSignal.timeout(20_000)});
  if(!response.ok)throw new Error(`NSE HTTP ${response.status}: ${url}`);
  const reader=response.body?.getReader();if(!reader)throw new Error('Empty NSE body');
  const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4*1024**2){await reader.cancel();throw new Error('NSE response exceeds 4 MiB');}chunks.push(value);}
  const text=Buffer.concat(chunks).toString();
  if(/Access Denied|captcha|Request Rejected/i.test(text.slice(0,2000)))throw new Error(`NSE access blocked: ${url}`);
  cacheWrite(name,text);return text;
}

export interface IndiaResult {
  id:string;symbol:string;listed:number;downloaded:number;obtained:number[];retained:number[];
  balanceYears:number[];cashFlowYears:number[];written:boolean;integrity:Fundamentals['integrity']|null;
  notes:string[];failures:Array<{url:string;error:string}>;before:number[];
}
export function selectNiftyCompanies(companies:Company[],only?:string[]):Company[]{
  const nifty=companies.filter(c=>c.indexes?.includes('Nifty 50'));
  if(only?.some(id=>!nifty.some(c=>c.id===id||`${indiaSymbol(c.id)}.NSE`===id)))throw new Error('India import only accepts Nifty 50 company ids');
  return nifty.filter(c=>!only||only.includes(c.id)||only.includes(`${indiaSymbol(c.id)}.NSE`));
}
async function importCompany(company:Company,write:boolean,force:boolean):Promise<IndiaResult>{
  assertIndiaDisk();
  const symbol=indiaSymbol(company.id);
  const before=readCorpusJson<Fundamentals>(`fundamentals/${company.id}.json`);
  // A single immutable pre-import snapshot keeps this reversible, in the sole raw cache.
  const backup=`before-${company.id}.json`;
  if(!existsSync(cachePath(backup)))cacheWrite(backup,JSON.stringify(before));
  const result:IndiaResult={id:company.id,symbol,listed:0,downloaded:0,obtained:[],retained:[],balanceYears:[],cashFlowYears:[],written:false,integrity:null,notes:[],failures:[],before:before?.years.map(y=>y.fy)??[]};
  const listUrl=`https://www.nseindia.com/api/corporates-financial-results?index=equities&symbol=${encodeURIComponent(symbol)}&period=Annual`;
  let rows:IndiaFiling[];
  try{
    const raw=JSON.parse(await cachedRequest(listUrl,`${symbol}-annual.json`,force));
    if(!Array.isArray(raw))throw new Error('Invalid NSE filing list');
    rows=selectIndiaFilings(raw,symbol);result.listed=rows.length;
  }catch(e){assertIndiaDisk();result.failures.push({url:listUrl,error:String(e)});return result;}
  const byEnd=new Map<string,Year>();
  for(const row of rows.filter(r=>Number(indiaDate(r.toDate).slice(0,4))>=2012)){
    assertIndiaDisk();const url=filingUrl(row)!;
    const alternatives=[url,...(url.endsWith('.html')?(historicalIndiaSymbols[symbol]??[]).map(old=>url.replace(`financial_res_${symbol}_`,`financial_res_${old}_`)):[]),...(row.params&&url!==detailUrl(row)?[detailUrl(row)]:[])];
    const errors:Array<{url:string;error:string}>=[];
    for(const attempt of alternatives){
      try{
        const detail=attempt.includes('/api/');
        const name=detail?`${symbol}-${row.seqNumber}-detail.json`:path.basename(new URL(attempt).pathname);
        const text=await cachedRequest(attempt,name);
        const years=detail?[parseIndiaDetail(JSON.parse(text),row)]:attempt.endsWith('.xml')?parseIndiaXbrl(text,row):[parseIndiaLegacy(text,{...row,resultDetailedDataLink:attempt})];
        for(const y of years)byEnd.set(y.end,y);
        result.downloaded++;
        if(errors.length)result.notes.push(`Recovered ${row.toDate} through ${attempt}; first source failed: ${errors[0].error}`);
        errors.length=0;break;
      }catch(e){assertIndiaDisk();errors.push({url:attempt,error:String(e)});}
    }
    result.failures.push(...errors);
  }
  // Some audited annual columns are indexed only under the fourth-quarter filing.
  // Read the explicit annual column; never add quarterly observations together.
  const ends=[...byEnd.keys()].sort();
  const missing=ends.length>1&&Number(ends.at(-1)!.slice(0,4))-Number(ends[0].slice(0,4))+1>ends.length;
  if(missing){
    try{
      const url=`https://www.nseindia.com/api/corporates-financial-results?index=equities&symbol=${encodeURIComponent(symbol)}&period=Quarterly`;
      const raw=JSON.parse(await cachedRequest(url,`${symbol}-quarterly.json`,force));
      if(!Array.isArray(raw))throw new Error('Invalid quarterly filing list');
      const fiscalMonthDays=new Set(ends.map(end=>end.slice(5)));
      for(const row of raw.filter((r:IndiaFiling)=>r.symbol===symbol&&r.consolidated==='Consolidated'&&r.xbrl?.endsWith('.xml')).reverse()){
        const end=indiaDate(row.toDate);
        if(!fiscalMonthDays.has(end.slice(5))||byEnd.has(end)||end<ends[0]||end>ends.at(-1)!||!filingUrl(row))continue;
        try{
          const xml=await cachedRequest(row.xbrl,path.basename(new URL(row.xbrl).pathname));
          const f=integratedAnnualFiling(xml,{...row,qe_Date:row.toDate,seq_Id:row.seqNumber});
          if(!f)continue;
          for(const y of parseIndiaXbrl(xml,f))byEnd.set(y.end,y);
          result.downloaded++;result.notes.push(`Recovered audited annual column for ${end} from quarterly-indexed filing ${row.xbrl}`);
        }catch(e){assertIndiaDisk();result.failures.push({url:row.xbrl,error:String(e)});}
      }
    }catch(e){assertIndiaDisk();result.notes.push(`Quarterly-indexed annual recovery unavailable: ${String(e)}`);}
  }
  // Since 2025 NSE publishes annual results in the paginated integrated feed.
  try{
    for(let page=1;page<=10;page++){
      const url=`https://www.nseindia.com/api/integrated-filing-results?index=equities&symbol=${encodeURIComponent(symbol)}&page=${page}&size=100`;
      const raw=JSON.parse(await cachedRequest(url,`${symbol}-integrated-${page}.json`,force));
      if(!Array.isArray(raw.data))throw new Error('Invalid integrated filing list');
      for(const row of raw.data.filter((r:any)=>r.symbol===symbol&&r.type==='Integrated Filing- Financials'&&r.consolidated==='Consolidated'&&/^31-(MAR|DEC)-/.test(r.qe_Date)).reverse()){
        try{
          if(!filingUrl({xbrl:row.xbrl,resultDetailedDataLink:null} as IndiaFiling))continue;
          const xml=await cachedRequest(row.xbrl,path.basename(new URL(row.xbrl).pathname));
          const filing=integratedAnnualFiling(xml,row);if(!filing)continue;
          for(const y of parseIndiaXbrl(xml,filing))byEnd.set(y.end,y);
          result.downloaded++;
        }catch(e){assertIndiaDisk();result.failures.push({url:row.xbrl,error:String(e)});}
      }
      if(page*100>=raw.totalCount||raw.data.length<100)break;
    }
  }catch(e){assertIndiaDisk();result.notes.push(`Integrated feed unavailable: ${String(e)}`);}
  let years=[...byEnd.values()].sort((a,b)=>a.end.localeCompare(b.end));
  if(!years.length){cacheWrite(`result-${company.id}.json`,JSON.stringify({result,fundamentals:null}));return result;}
  // Fetch home shares in INR even when the canonical company is an ADR/GDR.
  const home={...company,id:`${symbol}.NSE`,code:symbol,exchange:'NSE',currency:'INR'};
  try{
    const file=cachePath(`${symbol}-yahoo.json`);
    const raw=existsSync(file)&&!force?JSON.parse(readFileSync(file,'utf8')):await fetchYahooFundamentals(home);
    cacheWrite(`${symbol}-yahoo.json`,JSON.stringify(raw));
    const yahoo=normalizeYahooFundamentals(raw,home);
    for(const y of yahoo.years)for(const p of Object.values(y.provenance??{}))p.source=`raw/india/${symbol}-yahoo.json#${y.end}`;
    const merged=mergeIndiaYahoo(years,yahoo.years);years=merged.years;result.notes.push(...merged.notes);
  }catch(e){assertIndiaDisk();result.notes.push(`Yahoo unavailable: ${String(e)}`);}
  result.obtained=years.map(y=>y.fy);
  for(const y of years)for(const warning of y.sourceWarnings??[])result.notes.push(`${y.fy}: ${warning}`);
  result.balanceYears=years.filter(y=>y.totalAssets!==null&&y.equity!==null).map(y=>y.fy);
  result.cashFlowYears=years.filter(y=>y.ocf!==null&&y.capex!==null).map(y=>y.fy);
  result.notes.push('Official shares/EPS are ordinary issuer shares; no depositary-share conversion is inferred.');
  const fundamentals:Fundamentals={id:company.id,currency:'INR',years,fetchedAt:new Date().toISOString(),integrity:{ok:false,reasons:[],notes:result.notes}};
  try{
    const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}.NS?range=20y&interval=1mo&events=splits`;
    const raw=JSON.parse(await cachedRequest(url,`${symbol}-splits.json`,force));
    if(raw?.chart?.result?.[0]?.meta?.symbol!==`${symbol}.NS`)throw new Error('Yahoo split symbol mismatch');
    fundamentals.splits=indiaSplits(raw);
  }catch(e){assertIndiaDisk();result.notes.push(`Split corroboration unavailable: ${String(e)}`);}
  const shareJump=years.some((y,i)=>{const a=years[i-1]?.dilutedShares,b=y.dilutedShares;return a!=null&&a>0&&b!=null&&(b/a>=T.integrity.maxShareRatio||b/a<=T.integrity.minShareRatio);});
  if(shareJump){
    const url=`https://www.nseindia.com/api/corporates-corporateActions?index=equities&symbol=${encodeURIComponent(symbol)}&from_date=01-01-2012&to_date=${new Date().toISOString().slice(0,10).split('-').reverse().join('-')}`;
    try{
      const rows=JSON.parse(await cachedRequest(url,`${symbol}-actions-2012.json`,force));
      if(!Array.isArray(rows))throw new Error('Invalid NSE corporate actions');
      fundamentals.splits=mergeIndiaActions(fundamentals.splits??[],rows,symbol);
      result.notes.push(`Split/bonus factors corroborated with NSE corporate actions: ${url}`);
    }catch(e){assertIndiaDisk();result.notes.push(`NSE split/bonus corroboration unavailable: ${String(e)}`);}
  }
  fundamentals.integrity=checkIntegrity(fundamentals);
  result.integrity=fundamentals.integrity;result.retained=fundamentals.years.map(y=>y.fy);
  cacheWrite(`result-${company.id}.json`,JSON.stringify({result,fundamentals}));
  // Do not destroy a longer cached history or change a depositary share/currency basis.
  // The official candidate and exact reason remain reviewable in raw/india.
  const depositary=!company.id.endsWith('.NSE');
  if(depositary&&before?.years.length){
    result.notes.push(`Preserved canonical ${company.id} existing ${before.currency} history; official INR ordinary-share candidate requires explicit depositary-basis reconciliation.`);
  }else if(before&&before.years.length>fundamentals.years.length){
    result.notes.push('Preserved existing longer history; official candidate retained in raw/india.');
  }else if(write){
    assertIndiaDisk();writeCorpusJson(`fundamentals/${company.id}.json`,fundamentals);result.written=true;
  }
  cacheWrite(`result-${company.id}.json`,JSON.stringify({result,fundamentals}));
  return result;
}

export async function importIndia({only,write=true,force=false}:{only?:string[];write?:boolean;force?:boolean}={}):Promise<IndiaResult[]>{
  assertIndiaDisk();
  const companies=selectNiftyCompanies(universeCompanies(),only);
  if(!companies.length)throw new Error('No Nifty 50 members in the local universe');
  // Two in-flight companies, three requests/second, no extraction directory or web build.
  const results=await pool({items:companies,concurrency:2,run:async company=>{
    const result=await importCompany(company,write,force);
    console.log(`${result.id}: obtained=${result.obtained.length}, retained=${result.retained.length}, balance=${result.balanceYears.length}, cashFlow=${result.cashFlowYears.length}, written=${result.written}, failures=${result.failures.length}`);
    return result;
  }});
  cacheWrite(`run-${createHash('sha256').update(companies.map(c=>c.id).sort().join(',')).digest('hex').slice(0,12)}.json`,JSON.stringify({at:new Date().toISOString(),write,results}));
  return results;
}
