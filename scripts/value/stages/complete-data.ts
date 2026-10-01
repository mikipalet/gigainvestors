import { completeCachedYears,completeCachedSplits } from '../../../lib/value/completeness/cached-years';
import { readPriceHistory } from '../../../lib/value/price-history';
import { universeCompanies, validCompanyId } from '../../../lib/value/companies';
import { completionYears } from '../../../lib/value/completeness/needs';
import { existsSync, readdirSync } from 'node:fs';
import { corpusPath, readCorpusJson, writeCorpusJson } from '../../../lib/value/corpus';
import { normalizeEodhd } from '../../../lib/value/normalize-eodhd';
import { deriveYears, cachedProvenance } from '../../../lib/value/derive';
import { checkIntegrity } from '../../../lib/value/integrity';
import { FIELD_TAGS, YAHOO_FIELDS, fillYears, yearsFromCompanyFacts, yearsFromYahoo } from '../../../lib/value/completeness/second-sources';
import { annualReportDocuments, downloadCsv, type DocumentDay, type EdinetDocument } from '../../../lib/value/japan/edinet';
import { parseEdinetCsv, yearsFromEdinet } from '../../../lib/value/japan/xbrl-csv';
import { allEsefFilings, italyFetch, resolveItalianLei } from '../../../lib/value/italy/client';
import { yearsFromEsef } from '../../../lib/value/italy/facts';
import { createLimiter, pool } from '../../../lib/value/http';
import { yahooSymbol } from '../../../lib/value/price-history';
import type { Company, Fundamentals, Year } from '../../../lib/value/types';

const workers=Number(process.env.VALUE_SOURCE_WORKERS)||1;
const secLimit=createLimiter({perSecond:6/workers}), yahooLimit=createLimiter({perSecond:4/workers});
const EU=new Set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE GB NO CH'.split(' '));
const inconsistent=(f:Fundamentals)=>f.integrity.reasons.some(r=>r.includes('balance sheet off'));
const missing=(f:Fundamentals,c:Company)=>inconsistent(f)||f.years.length<7||completionYears(f,c.kind).size>0;
type Attempt={source:string;status:string;added:number};
const count=(ys:Year[])=>ys.reduce((s,y)=>s+Object.keys(FIELD_TAGS).filter(k=>typeof y[k as keyof Year]==='number').length,0);
export default async function completeData({only,limit,force}:{only?:string[];limit?:number;force?:boolean}){
 const companies=universeCompanies().filter(c=>!only||only.includes(c.id)).filter(c=>validCompanyId(c.id,'complete-data')).slice(0,limit);
 // Phase one is corpus-wide and offline. Fresh source normalization fills cached holes.
 let derived=0;
 const checkpoint=readCorpusJson<{values:number}>('completeness/derived.json');
 for(const c of checkpoint&&!force?companies.filter(c=>!existsSync(corpusPath(`fundamentals/${c.id}.json`))):companies){
  const raw=readCorpusJson<any>(`raw/eodhd/${c.id}.json`);
  const n=raw?normalizeEodhd(raw,c.id).fundamentals:null;
  const f=readCorpusJson<Fundamentals>(`fundamentals/${c.id}.json`)??n??{id:c.id,currency:'',years:[],integrity:{ok:false,reasons:['No annual periods']},fetchedAt:new Date().toISOString()};
  const before=count(f.years);
  f.years=deriveYears(n?fillYears(f.years,n.years):f.years);
  derived+=count(f.years)-before;
  writeCorpusJson(`fundamentals/${c.id}.json`,f);
 }
 if(!checkpoint&&!only&&!limit)writeCorpusJson('completeness/derived.json',{values:derived,companies:companies.length});
 console.log(`complete-data: offline derivations filled ${derived} values across ${companies.length} companies`);
 const documents=new Map<string,EdinetDocument[]>();
 const days=corpusPath('raw/edinet/days');
 for(const file of existsSync(days)?readdirSync(days):[]){
  if(!file.endsWith('.json'))continue;const d=readCorpusJson<DocumentDay>(`raw/edinet/days/${file}`);
  if(!d?.results)continue;
  for(const doc of annualReportDocuments(d)){const id=`${doc.secCode.slice(0,4)}.JP`;const a=documents.get(id)??[];a.push(doc);documents.set(id,a);}
 }
 const tickers=readCorpusJson<any>('sec/company-tickers-exchange.json')?.data;
 const cikMap=new Map<string,string>();
 if(tickers?.fields&&tickers?.data){const ti=tickers.fields.indexOf('ticker'),ci=tickers.fields.indexOf('cik');for(const row of tickers.data)cikMap.set(String(row[ti]).toUpperCase(),String(row[ci]));}
 let finished=0, yahooBlocked=false, fills=0;
 const jobs=companies.sort((a,b)=>Number(!['HVID.CO','6048.JP','ADBE.US','NCLH.US'].includes(a.id))-Number(!['HVID.CO','6048.JP','ADBE.US','NCLH.US'].includes(b.id)));
 await pool({items:jobs,concurrency:16,run:async row=>{
  const c={...row,...readCorpusJson<Partial<Company>>(`companies/${row.id}.json`)};
  const auditFile=`completeness/attempts/${c.id}.json`;
  const previous=readCorpusJson<{attempts:Attempt[]}>(auditFile);
  if(!force&&previous){finished++;return;}
  const f=readCorpusJson<Fundamentals>(`fundamentals/${c.id}.json`)!;
  const attempts:Attempt[]=[];
  const merge=(ys:Year[],source:string)=>{const before=count(f.years);f.years=fillYears(f.years,ys);const added=count(f.years)-before;fills+=added;attempts.push({source,status:ys.length?'read':'no annual observations',added});};
  const source=async(name:string,fn:()=>Promise<Year[]>)=>{try{merge(await fn(),name);}catch(e){attempts.push({source:name,status:e instanceof Error?e.message:'source failed',added:0});}};
  if(missing(f,c)){
   const cik=c.cik??(c.exchange==='US'?cikMap.get(c.code.toUpperCase().replaceAll('.','-')):null);
   if(cik)await source('SEC companyfacts',async()=>{
    const file=`completeness/sec/${cik}.json`,cache=readCorpusJson<Year[]>(file);if(cache&&!inconsistent(f))return cache;
    const url=`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10,'0')}.json`;
    const response=await secLimit(()=>fetch(url,{headers:{'User-Agent':'GigaInvestors value hello@gigainvestors.com'},signal:AbortSignal.timeout(25000)}));
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const ys=yearsFromCompanyFacts(await response.json(),f.currency,url);writeCorpusJson(file,ys);return ys;
   });
   if(c.country==='JP')await source('EDINET XBRL',async()=>{
    let ys:Year[]=[];const docs=[...new Map((documents.get(c.id)??[]).map(d=>[d.docID,d])).values()].sort((a,b)=>a.submitDateTime.localeCompare(b.submitDateTime));
    for(const doc of docs){const parsed=yearsFromEdinet((await downloadCsv(doc.docID)).flatMap(parseEdinetCsv));
     for(const y of parsed)for(const p of Object.values(y.provenance??{}))p.source=`https://disclosure2.edinet-fsa.go.jp/WEEK0010.aspx?docId=${doc.docID}`;
     ys=fillYears(ys,parsed);
    }writeCorpusJson(`completeness/edinet/${c.id}.json`,ys);return ys;
   });
   if(EU.has(c.country))await source('ESEF XBRL',async()=>{
    const lei=c.lei??await resolveItalianLei(c);if(!lei)throw new Error('No matching LEI');
    let ys:Year[]=[];
    const filings=[...new Map((await allEsefFilings(lei)).map(f=>[f.attributes.period_end,f])).values()];
    for(const filing of filings){
     const normalizedFile=`completeness/esef/${filing.id}.json`;
     const cached=readCorpusJson<Year[]>(normalizedFile);
     const raw=readCorpusJson<{data:import('../../../lib/value/italy/facts').XbrlReport}>(`raw/esef/facts/${filing.id}.json`);
     const parsed=cached??yearsFromEsef({raw:raw?.data??await (await italyFetch(new URL(filing.attributes.json_url,'https://filings.xbrl.org').href)).json(),lei});
     for(const y of parsed)for(const p of Object.values(y.provenance??{}))p.source=new URL(filing.attributes.json_url,'https://filings.xbrl.org').href;
     writeCorpusJson(normalizedFile,parsed);
     ys=fillYears(ys,parsed);
    }return ys;
   });
   if(inconsistent(f)||!f.years.length||[...completionYears(f,c.kind)].some(fy=>fy>=new Date().getUTCFullYear()-5))await source('Yahoo annual timeseries',async()=>{
    const file=`completeness/yahoo/${c.id}.json`,cache=readCorpusJson<Year[]>(file);
    const fullRequestRecorded=previous?.attempts.some(a=>a.source==='Yahoo annual timeseries'&&['read','no annual observations'].includes(a.status));
    if(cache&&fullRequestRecorded)return cache;
    if(yahooBlocked)throw new Error('Provider rate limit; circuit open');
    const symbol=yahooSymbol(c);
    const url=`https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?${new URLSearchParams({type:Object.keys(YAHOO_FIELDS).map(k=>'annual'+k).join(','),period1:'1262304000',period2:String(Math.floor(Date.now()/1000))})}`;
    const response=await yahooLimit(()=>fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(20000)}));
    if(response.status===429){yahooBlocked=true;throw new Error('HTTP 429; provider rate limit');}
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const ys=yearsFromYahoo(await response.json(),f.currency,url);writeCorpusJson(file,ys);return ys;
   });
  }
  if(force&&previous)for(const prior of [...new Map(previous.attempts.map(a=>[a.source,a])).values()]){
   const stillNeeded=missing(f,c)&&(prior.source!=='Yahoo annual timeseries'||inconsistent(f)||!f.years.length||[...completionYears(f,c.kind)].some(fy=>fy>=new Date().getUTCFullYear()-5));
   if(!stillNeeded&&!attempts.some(a=>a.source===prior.source))attempts.push({source:prior.source,status:'not required after derivations',added:0});
  }
  f.splits=completeCachedSplits(c.id,f.splits,readCorpusJson);
  f.years=cachedProvenance(completeCachedYears(c,f.years,readCorpusJson),`fundamentals/${c.id}.json (${c.source})`);f.integrity=checkIntegrity(f,{source:c.source,priceHistory:readPriceHistory(c.id)});writeCorpusJson(`fundamentals/${c.id}.json`,f);
  writeCorpusJson(auditFile,{id:c.id,asOf:new Date().toISOString(),attempts:[...(force?previous?.attempts??[]:[]),...attempts],remainingFields:[...new Set(f.years.slice(-10).flatMap(y=>Object.keys(FIELD_TAGS).filter(k=>y[k as keyof Year]==null)))]});
  if(++finished%100===0)console.log(`complete-data: ${finished}/${jobs.length}; second-source values ${fills}`);
 }});
 console.log(`complete-data: ${finished} companies; ${derived} derived values; ${fills} second-source values`);
}
