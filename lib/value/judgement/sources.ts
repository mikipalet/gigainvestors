import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { corpusPath, readCorpusJson, writeCorpusJson } from '../corpus';
import { diskGuard } from '../thesis/sources';
import type { Company, ReportMeta } from '../types';
import type { Source } from './read';
// Issuer annual report fallback for a dossier previously backed only by a vendor description.
const annuals:Record<string,{url:string;filed:string;period:string}>={
 'WKL.AS':{url:'https://assets.contenthub.wolterskluwer.com/api/public/content/3210406-wolters-kluwer-2025-annual-report-pdf-8bb01b4e47?v=ddef685b',filed:'2026-03-11',period:'2025-12-31'},
};
export async function judgementSources(company:Company,report:ReportMeta){
 const sources:Source[]=[];const facts:Array<{text:string;url:string}>=[];
 if(report.url&&report.kind!=='description')for(const section of report.sections){
  try{sources.push({quote:'',text:readFileSync(corpusPath(`reports/${company.id}/${section}.txt`),'utf8'),url:report.url,filed:report.filed??'',period:report.period,section});}
  catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 }
 const annual=annuals[company.id];
 if(!sources.length&&annual){
  diskGuard();let text=readCorpusJson<{text:string}>(`judgement/sources/${company.id}.json`)?.text;
  if(!text){const response=await fetch(annual.url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error(`Annual report HTTP ${response.status}`);text=execFileSync('pdftotext',['-','-'],{input:Buffer.from(await response.arrayBuffer()),maxBuffer:16000000}).toString();writeCorpusJson(`judgement/sources/${company.id}.json`,{...annual,text});}
  // Full report text is searched for each topic, retaining the same source and date.
  for(const section of ['business','mdna','risk','letter','capital','notes'])sources.push({...annual,quote:'',text,section});
 }
 const wiki=readCorpusJson<Array<Record<string,{value:string}>>>('enrichment-v7/wikidata/websites.json')??[];
 const isinMatches=wiki.filter(r=>company.isin&&r.isin?.value===company.isin);
 const matches=isinMatches.length?isinMatches:company.country==='JP'?wiki.filter(r=>r.ticker?.value===company.code&&r.exchange?.value.endsWith('/Q217475')):[];
 if(new Set(matches.map(r=>r.item.value)).size===1){
  const item=matches[0].item.value.replace('http:','https:');
  facts.push({text:`Official website: ${new URL(matches[0].website.value).hostname}`,url:item});
  const id=item.split('/').at(-1)!;
  let cached=readCorpusJson<{text:string;url:string}|{error:string}>(`judgement/wiki/${id}.json`);
  if(!cached){
   diskGuard();
   try{
    const res=await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`,{signal:AbortSignal.timeout(15000)});
    if(!res.ok)throw Error(`Wikidata HTTP ${res.status}`);
    const entity=(await res.json()).entities[id];
    const title=entity?.sitelinks?.enwiki?.title;
    if(title){
     const r=await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,{signal:AbortSignal.timeout(15000)});
     if(!r.ok)throw Error(`Wikipedia HTTP ${r.status}`);
     const summary=await r.json();cached={text:summary.extract,url:summary.content_urls.desktop.page};
    }else cached={text:entity?.descriptions?.en?.value??'',url:item};
   }catch(e){cached={error:e instanceof Error?e.message:'Facts unavailable'};}
   writeCorpusJson(`judgement/wiki/${id}.json`,cached);
  }
  if('text'in cached&&cached.text){sources.push({text:cached.text,quote:'',url:cached.url,filed:new Date().toISOString().slice(0,10),section:'wiki'});facts.push({text:cached.text,url:cached.url});}
 }
 return {sources,facts};
}
