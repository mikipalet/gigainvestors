import { existsSync } from 'node:fs';
import { corpusPath, readCorpusJson } from '../corpus';
import { cachedInterimDocuments } from '../japan/cached-interim';
import { csvFilesFromZip } from '../japan/edinet';
import { parseEdinetCsv } from '../japan/xbrl-csv';
import { generalInfoFor } from '../enrichment';
import { htmlToText } from '../reports/html-to-text';
import { fetchDocument } from './sources';
import type { Company } from '../types';
import type { ThesisSource } from './types';
/** An annual report mentioning interim accounts is not itself an interim filing. */
export function isRecentInterim(text:string,period:string,annualPeriod:string|null,asOf:string):boolean {
 const cutoff=new Date(asOf);cutoff.setUTCMonth(cutoff.getUTCMonth()-18);
 if(!period||period>asOf||period<cutoff.toISOString().slice(0,10)||period<=(annualPeriod??''))return false;
 const heading=text.slice(0,2500);
 return /half.year|interim (?:financial )?report|six.month|halbjahres|rapport.{0,40}semestriel/i.test(heading)&&!/annual report|rapport annuel|geschäftsbericht/i.test(heading);
}
let edinet:ReturnType<typeof cachedInterimDocuments>|undefined;
export async function discoverInterim(company:Company,asOf:string,annualPeriod:string|null):Promise<{sources:ThesisSource[];gaps:string[]}>{
 const sources:ThesisSource[]=[],gaps:string[]=[];
 if(company.edinetCode){
  try {
  edinet??=cachedInterimDocuments();
  const doc=(edinet.get(company.id)??[]).filter(d=>d.submitDateTime.slice(0,10)<=asOf&&d.periodEnd>(annualPeriod??'')).sort((a,b)=>b.periodEnd.localeCompare(a.periodEnd)||b.submitDateTime.localeCompare(a.submitDateTime))[0];
  if(doc){
   const url=`https://disclosure2dl.edinet-fsa.go.jp/searchdocument/pdf/${doc.docID}.pdf`,zip=corpusPath(`raw/edinet/csv/${doc.docID}.zip`);
   const text=existsSync(zip)?csvFilesFromZip(zip).flatMap(parseEdinetCsv).filter(r=>/TextBlock$/.test(r.element)).map(r=>htmlToText(r.value)).join('\n\n'):await fetchDocument(url);
   if(text.trim())sources.push({url,filed:doc.submitDateTime.slice(0,10),period:doc.periodEnd,section:'EDINET interim',text});
  }else gaps.push('No newer interim in EDINET filing-day cache');
  }catch(e){if(String(e).includes('DISK STOP'))throw e;gaps.push('EDINET interim fetch failed');}
 }
 if(!sources.length&&company.lei){
  try{
   const q=new URLSearchParams({'filter[entity.identifier]':company.lei,sort:'-period_end','page[size]':'8'});
   const data=JSON.parse(await fetchDocument(`https://filings.xbrl.org/api/filings?${q}`));
   for(const row of data.data??[]){
    const a=row.attributes;if(!a?.report_url||!a.period_end||a.period_end<= (annualPeriod??'')||a.date_added?.slice(0,10)>asOf)continue;
    const url=new URL(a.report_url,'https://filings.xbrl.org').href;
    const text=htmlToText(await fetchDocument(url));
    if(!isRecentInterim(text,a.period_end,annualPeriod,asOf))continue;
    sources.push({url,filed:a.date_added?.slice(0,10)??'',period:a.period_end,section:'ESEF interim',text});break;
   }
  }catch(e){if(String(e).includes('DISK STOP'))throw e;gaps.push('ESEF interim lookup failed');}
 }
 if(sources.length)return {sources,gaps};
 const website=generalInfoFor(company).WebURL;
 if(!website)return {sources,gaps:[...gaps,'No official issuer website in cached identity']};
 const visited=new Set<string>(),queue=[website];
 const year=asOf.slice(0,4),previous=String(Number(year)-1);
 for(let pages=0;pages<5&&queue.length;pages++){
  const page=queue.shift()!;if(visited.has(page))continue;visited.add(page);
  try{
   const raw=await fetchDocument(page);
   const links=[...raw.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].flatMap(m=>{
    try{const url=new URL(m[1].replaceAll('&amp;','&'),page);if(!/^https?:$/.test(url.protocol))return [];return [{url:url.href,label:htmlToText(m[2])}];}catch{return [];}
   });
   const scored=links.map(l=>({...l,text:`${l.url} ${l.label}`,score:0})).map(l=>({...l,score:(l.text.includes(year)?10:l.text.includes(previous)?2:0)+(/interim|half.year|h1|q2|q3|quarter|半期|中間|中期/i.test(l.text)?8:0)+(/financial|results|report|決算|報告/i.test(l.text)?3:0)-(/sustainab|governance|esg|climate/i.test(l.text)?30:0)})).sort((a,b)=>b.score-a.score);
   for(const l of scored.filter(l=>l.score>=18).slice(0,2)){
    if(visited.has(l.url))continue;
    const content=await fetchDocument(l.url),plain=/<(?:html|body|div|p)[ >]/i.test(content)?htmlToText(content):content;
    // A download landing page is not a financial report.
    if(plain.length>6000&&/balance sheet|financial statements|income statement|consolidated|財務諸表|損益|貸借|合并|綜合/i.test(plain)){
     const date=l.text.match(/20\d{2}[-/]\d{2}[-/]\d{2}/)?.[0].replaceAll('/','-')??'';
     if(date&&date>asOf)continue;
     sources.push({url:l.url,filed:date,period:'',section:'company IR interim',text:plain});return {sources,gaps};
    }
    queue.unshift(l.url);
   }
   queue.push(...scored.filter(l=>/invest|financial|results|reports|株主|投資|财务|財務/i.test(l.text)&&!visited.has(l.url)).slice(0,4).map(l=>l.url));
  }catch(e){if(String(e).includes('DISK STOP'))throw e;gaps.push('Official IR page or filing fetch failed');}
 }
 if(!sources.length)gaps.push('No readable latest interim found on official IR pages');
 return {sources,gaps};
}
