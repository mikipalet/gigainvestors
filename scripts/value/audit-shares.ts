/** Local evidence audit. Never publishes, pushes, or changes source analyses. */
import 'dotenv/config';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {corpusPath,readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {reconcileShares,edinetShareObservation,type ShareObservation} from '../../lib/value/share-check';
import {yahooSymbol,readPriceHistory} from '../../lib/value/price-history';
import {pool,createLimiter} from '../../lib/value/http';
import type {Analysis,Dossier,Fundamentals} from '../../lib/value/types';

export async function auditShares(root=corpusPath('publish-repo'),options:{only?:string[];limit?:number}={}) {
 const published=path.join(root,'dossiers');
 const candidates=new Map<string,Analysis>((existsSync(published)?readdirSync(published).filter(file=>file.endsWith('.json')).flatMap(file=>Object.values(JSON.parse(readFileSync(path.join(published,file),'utf8')) as Record<string,Dossier>)):[]).map(d=>[d.id,d]));
 // The daily runner audits after analysis and before publication. New companies
 // and new quality passes must not wait for an older published dossier to exist.
 const analyses=corpusPath('analysis');
 if(existsSync(analyses))for(const file of readdirSync(analyses).filter(file=>file.endsWith('.json'))){
  const current=readCorpusJson<Analysis>(`analysis/${file}`);
  if(current?.id&&current.company&&current.tests)candidates.set(current.id,{...candidates.get(current.id),...current});
 }
 const all=[...candidates.values()];
 const residual=readCorpusJson<{companies:Array<{id:string}>}>('staging/unresolved-shares.json');
 const residualIds=new Set(residual?.companies.map(r=>r.id)??[]);
 const flagged=all.filter(d=>{
  if(options.only)return options.only.includes(d.id);
  if(d.dataQualityFlags?.length||residualIds.has(d.id)||d.valuation?.assumptions.some(s=>/unverified|share sources disagree|share count (?:not )?corrected/i.test(s)))return true;
  if(!Object.entries(d.tests).filter(([k])=>k!=='price').every(([,t])=>t.result==='pass'))return false;
  const previous=readCorpusJson<{checkedAt?:string;status?:string}>(`enrichment-v7/share-checks/${d.id}.json`);
  return previous?.status==='pending'||!previous?.checkedAt||Date.now()-Date.parse(previous.checkedAt)>6*86400_000;
 }).sort((a,b)=>Number(Object.values(b.tests).slice(0,5).every(t=>t.result==='pass'))-Number(Object.values(a.tests).slice(0,5).every(t=>t.result==='pass'))).slice(0,options.limit);
const now=new Date().toISOString(),today=now.slice(0,10),limit=createLimiter({perSecond:5});
const fresh=(date:string)=>date<=today&&Date.parse(date)>Date.now()-400*86400_000;
const summary:Array<{id:string;qualityPass:boolean;status:string;attempts:Record<string,string>}>=[];
// Provider endpoints have a fixed allowlist; no company text can choose a host.
async function json(url:string,attempts:Record<string,string>,key:string) {
 try {const r=await limit(()=>fetch(url,{headers:{'User-Agent':url.includes('sec.gov')?'GigaInvestors hello@gigainvestors.com':'Mozilla/5.0'},signal:AbortSignal.timeout(8000)}));
  attempts[key]=`HTTP ${r.status}`;if(!r.ok){await r.body?.cancel();return null;}return await r.json();
 }catch(e){attempts[key]=String(e);return null;}
}
await pool({items:flagged,concurrency:6,run:async d=>{
 const c=d.company,observations:ShareObservation[]=[],attempts:Record<string,string>={};
 const add=(source:string,shares:unknown,date:string|undefined,url?:string,corroborationOnly=false)=>{
  if(typeof shares==='number'&&shares>0&&date&&fresh(date))observations.push({source,shares,date,url,basis:'issuer shares in listing units',corroborationOnly});
 };
 const raw=readCorpusJson<any>(`raw/eodhd/${d.id}.json`);
 const reviewed=readCorpusJson<ShareObservation[]>(`enrichment-v7/share-observations/${d.id}.json`)??[];
 for(const observation of reviewed)if(fresh(observation.date??''))observations.push(observation);
 if(reviewed.length)attempts.reviewedFiling=reviewed.map(o=>o.url).join(', ');
 attempts.eodhd=raw?'Cached fundamentals: SharesStats, outstandingShares annual/quarterly, balance sheet shares':'No cached EODHD fundamentals';
 add('eodhd:current',raw?.SharesStats?.SharesOutstanding,raw?.General?.UpdatedAt);
 for(const period of ['annual','quarterly']){
  const values=Object.values(raw?.outstandingShares?.[period]??{}) as any[];
  const v=values.filter(v=>fresh(v.dateFormatted??'')).sort((a,b)=>a.dateFormatted.localeCompare(b.dateFormatted)).at(-1);
  add(`eodhd:${period}`,v?.shares,v?.dateFormatted);
  const balances=Object.values(raw?.Financials?.Balance_Sheet?.[period==='annual'?'yearly':'quarterly']??{}) as any[];
  const balance=balances.filter(v=>fresh(v.date??'')).sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
  add(`eodhd:balance-${period}`,Number(balance?.commonStockSharesOutstanding),balance?.date);
 }
 const previous=readCorpusJson<{observations:ShareObservation[];checkedAt:string}>(`enrichment-v7/share-checks/${d.id}.json`);
 const cachedYahoo=previous?.checkedAt?.slice(0,10)===today?previous.observations.find(o=>o.source==='yahoo'&&fresh(o.date??'')):null;
 if(cachedYahoo){add('yahoo',cachedYahoo.shares,cachedYahoo.date,cachedYahoo.url);attempts.yahoo='Reused today’s Yahoo shares_out response';}
 else {
  const symbol=encodeURIComponent(yahooSymbol(c));
  const url=`https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${symbol}?type=shares_out&period1=${Math.floor(Date.now()/1000)-400*86400}&period2=${Math.floor(Date.now()/1000)}`;
  const data=await json(url,attempts,'yahoo'),series=data?.timeseries?.result?.[0],values=series?.shares_out??[],timestamps=series?.timestamp??[];
  for(let i=values.length-1;i>=0;i--)if(fresh(new Date(timestamps[i]*1000).toISOString().slice(0,10))){add('yahoo',values[i],new Date(timestamps[i]*1000).toISOString().slice(0,10),url);break;}
 }
 // SharesOutstanding/impliedSharesOutstanding can be stored by free-cap enrichment.
 const free=readCorpusJson<any>(`raw/market-caps/${d.id}.json`);
 if(free?.inputs?.source==='Yahoo chart × verified shares'&&free.inputs.shares)add('yahoo:cap-cache',free.inputs.shares,free.date??free.fetchedAt?.slice(0,10));
 const esef=readCorpusJson<any>(`raw/esef/shares/${d.id}.json`);
 if(esef?.data?.shares)add('yahoo:esef-cache',esef.data.shares,esef.date);
 attempts.yahooQuote='sharesOutstanding/impliedSharesOutstanding: cached enrichment inspected; live quoteSummary requires Yahoo authentication';
 const f=readCorpusJson<Fundamentals>(`fundamentals/${d.id}.json`),last=f?.years.at(-1);
 attempts.edinet=c.source==='edinet'?'Inspected EDINET fiscal-date issued minus treasury (same reporting date)':'Not an EDINET issuer';
 if(c.source==='edinet'&&last){const observation=edinetShareObservation(last);if(observation&&fresh(observation.date!))observations.push(observation);}
 attempts.esef=c.source==='esef'?'Inspected normalized ESEF share facts':'No ESEF issuer mapping';
 if(c.source==='esef')add('esef',last?.sharesOutstanding,last?.end);
 const cik=c.cik??raw?.General?.CIK??d.report.url?.match(/sec.gov\/Archives\/edgar\/data\/(\d+)\//)?.[1];
 const adr=readCorpusJson<{ratio:number;url?:string}>(`enrichment-v7/adr-ratios/${d.id}.json`);
 attempts.adr=adr?`Depositary ratio ${adr.ratio}: ${adr.url??'cached filing evidence'}`:c.exchange==='US'&&c.country!=='US'?'No explicit depositary ratio available':'Not an ADR listing';
 if(cik){
  const url=`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10,'0')}.json`;
  let facts=readCorpusJson<any>(`enrichment-v7/share-facts/${d.id}.json`);
  if(!facts)facts=await json(url,attempts,'sec');else attempts.sec='Cached SEC companyfacts';
  if(facts){writeCorpusJson(`enrichment-v7/share-facts/${d.id}.json`,facts);
   const values=facts.facts?.dei?.EntityCommonStockSharesOutstanding?.units?.shares??[];
   const v=values.filter((v:any)=>fresh(v.end)).sort((a:any,b:any)=>a.end.localeCompare(b.end)||a.filed.localeCompare(b.filed)).at(-1);
   const ratio=c.exchange==='US'&&c.country!=='US'?adr?.ratio:1;
   if(ratio){
    add('sec',v?.val? v.val/ratio:null,v?.end,url);
    const balances=facts.facts?.['us-gaap']?.CommonStockSharesOutstanding?.units?.shares??[];
    const balance=balances.filter((v:any)=>fresh(v.end)).sort((a:any,b:any)=>a.end.localeCompare(b.end)||a.filed.localeCompare(b.filed)).at(-1);
    add('sec:balance',balance?.val?balance.val/ratio:null,balance?.end,url);
   }
  }
 }else attempts.sec='No CIK or mapped US filing';
 // A buyback can make the latest vendor count differ from a filing. Compare
 // dated observations too; retain dates and choose the newest agreeing pair.
 if(reconcileShares(observations).status==='pending'){
  const cache=readCorpusJson<{date:string;data:any}>(`enrichment-v7/yahoo-share-history/${d.id}.json`);
  const symbol=encodeURIComponent(yahooSymbol(c));
  const url=`https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${symbol}?type=shares_out&period1=${Math.floor(Date.now()/1000)-400*86400}&period2=${Math.floor(Date.now()/1000)}`;
  const data=cache?.date===today?cache.data:await json(url,attempts,'yahooHistory');
  if(data){
   writeCorpusJson(`enrichment-v7/yahoo-share-history/${d.id}.json`,{date:today,data});
   const series=data.timeseries?.result?.[0];
   for(let i=0;i<(series?.timestamp?.length??0);i++)add(`yahoo:${series.timestamp[i]}`,series.shares_out?.[i],new Date(series.timestamp[i]*1000).toISOString().slice(0,10),url);
   attempts.yahooHistory=`Compared ${series?.timestamp?.length??0} dated observations with filing dates`;
  }
 }
 // Cover-page facts are independent of a provider but not independent of SEC facts.
 const htmlFile=corpusPath(`reports/${d.id}/raw.html`);
 let html=existsSync(htmlFile)?readFileSync(htmlFile,'utf8'):null;
 attempts.cover=html?'Inspected cached cover-page inline XBRL':'No cached raw cover page';
 if(!html&&reconcileShares(observations).status==='pending'&&d.report.url?.startsWith('https://www.sec.gov/Archives/')){
  const cache=readCorpusJson<{date:string;status:number;html?:string}>(`enrichment-v7/share-covers/${d.id}.json`);
  if(cache?.date===today){html=cache.html??null;attempts.cover=`Cached cover-page HTTP ${cache.status}`;}
  else try{
   const response=await limit(()=>fetch(d.report.url!,{headers:{'User-Agent':'GigaInvestors hello@gigainvestors.com'},signal:AbortSignal.timeout(8000)}));
   attempts.cover=`Cover-page HTTP ${response.status}`;
   if(response.ok)html=await response.text();else await response.body?.cancel();
   writeCorpusJson(`enrichment-v7/share-covers/${d.id}.json`,{date:today,status:response.status,...(html?{html}:{})});
  }catch(error){attempts.cover=String(error);}
 }
 if(html){
  const facts=[...html.matchAll(/<ix:nonFraction\b([^>]*name=["']dei:EntityCommonStockSharesOutstanding["'][^>]*)>([\s\S]*?)<\/ix:nonFraction>/gi)].map(m=>Number(m[2].replace(/<[^>]*>/g,'').replace(/,/g,''))*10**Number(m[1].match(/scale=["'](-?\d+)/)?.[1]??0)).filter(n=>n>0);
  const distinct=[...new Set(facts)],ratio=c.exchange==='US'&&c.country!=='US'?adr?.ratio:1;
  // Multiple class/context facts need manual aggregation; never choose one class.
  if(distinct.length===1&&ratio)add('sec:cover',distinct[0]/ratio,d.report.filed??undefined,d.report.url??undefined);
  else if(distinct.length>1)attempts.cover+='; multiple share classes/contexts retained for private review';
 }
 const quote=readCorpusJson<Record<string,[number,string]>>(`prices/${c.country}.json`)?.[d.id];
 const history=readPriceHistory(d.id),latest=history?.at(-1);
 const rate=c.currency==='USD'?1:readCorpusJson<{data:Array<{close:number}>}>(`raw/eodhd/universe/fx-${c.currency}.json`)?.data?.[0]?.close;
 const price=quote?.[0]??latest?.[1],date=quote?.[1]??(latest?`${latest[0]}-01`:undefined);
 if(c.marketCapUsd&&price&&rate)add('implied-cap',c.marketCapUsd/(price*rate),date,undefined,true);
 attempts.impliedCap=price&&rate?`Inspected ${history?.length??0} monthly closes; cap/price observation is corroboration only (dates may differ), never an independent vote`:'No comparable price/FX history; cannot infer share basis';
 // All attempted evidence and source failures remain private.
 const check={...reconcileShares(observations),checkedAt:now,attempts};
 writeCorpusJson(`enrichment-v7/share-checks/${d.id}.json`,check);
 summary.push({id:d.id,qualityPass:Object.entries(d.tests).filter(([k])=>k!=='price').every(([,t])=>t.result==='pass'),status:check.status,attempts});
 if(summary.length%100===0)console.log(`Audited ${summary.length}/${flagged.length}; accepted ${summary.filter(r=>r.status==='verified').length}`);
}});
const counts=(rows:typeof summary)=>({flagged:rows.length,resolved:rows.filter(r=>r.status==='verified').length,residual:rows.filter(r=>r.status!=='verified').length});
const report={asOf:now,all:counts(summary),quality:counts(summary.filter(r=>r.qualityPass)),companies:summary};
writeCorpusJson('staging/share-audit.json',report);
console.log(JSON.stringify({all:report.all,quality:report.quality}));

}
if(/audit-shares\.(?:ts|js)$/.test(process.argv[1]??''))auditShares(process.argv[2]).catch(error=>{console.error(error);process.exitCode=1;});
