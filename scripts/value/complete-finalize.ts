/** Reconcile current derivations and provenance after the resumable source pass. No network. */
import {existsSync,readdirSync} from 'node:fs';
import {corpusPath,readCorpusJson,readJsonl,writeCorpusJson} from '../../lib/value/corpus';
import {normalizeEodhd,refreshEodhdBalance} from '../../lib/value/normalize-eodhd';
import {cachedProvenance,deriveYears} from '../../lib/value/derive';
import {fillYears} from '../../lib/value/completeness/second-sources';
import {checkIntegrity} from '../../lib/value/integrity';
import {normalizedName} from '../../lib/value/universe';
import {annualReportDocuments,csvFilesFromZip,type DocumentDay,type EdinetDocument} from '../../lib/value/japan/edinet';
import {parseEdinetCsv,yearsFromEdinet} from '../../lib/value/japan/xbrl-csv';
import type {Fundamentals,Company,Year} from '../../lib/value/types';
const universe=new Map(readJsonl<Company>('universe.jsonl').map(c=>[c.id,c]));
const esefByLei=new Map<string,Year[]>();
for(const file of readdirSync(corpusPath('completeness/esef'))){
 const years=readCorpusJson<Year[]>(`completeness/esef/${file}`)!;
 const lei=years.flatMap(y=>Object.values(y.provenance??{})).map(p=>p.source.match(/filings\.xbrl\.org\/([A-Z0-9]{20})\//)?.[1]).find(Boolean);
 if(lei)esefByLei.set(lei,[...(esefByLei.get(lei)??[]),...years]);
}
const documents=new Map<string,EdinetDocument[]>();
for(const file of readdirSync(corpusPath('raw/edinet/days'))){
 const day=readCorpusJson<DocumentDay>(`raw/edinet/days/${file}`);
 for(const doc of day?.results?annualReportDocuments(day):[]){const id=`${doc.secCode.slice(0,4)}.JP`;documents.set(id,[...(documents.get(id)??[]),doc]);}
}
function cachedLei(c:Partial<Company>){
 if(c.lei)return c.lei;
 const rows=readCorpusJson<any>(`raw/esef/gleif/${c.isin}.json`)?.data?.data??[];
 const ids=[...new Set(rows.map((r:any)=>r.attributes.lei))];if(ids.length===1)return ids[0] as string;
 if(ids.length>1)return null;
 const names=readCorpusJson<any>(`raw/esef/gleif/name-${c.code}.json`)?.data?.data??[];
 const exact=names.filter((r:any)=>[r.attributes.entity.legalName,...(r.attributes.entity.otherNames??[])].some((n:any)=>normalizedName(n.name)===normalizedName(c.name??'')));
 return exact.length===1?exact[0].attributes.lei:null;
}
const secFiles=new Map(readdirSync(corpusPath('completeness/sec')).map(f=>[f.slice(0,-5).replace(/^0+/,''),f]));
const tickers=readCorpusJson<any>('sec/company-tickers-exchange.json')?.data;
const cikByTicker=new Map<string,string>();
if(tickers?.fields&&tickers?.data){const ti=tickers.fields.indexOf('ticker'),ci=tickers.fields.indexOf('cik');for(const row of tickers.data)cikByTicker.set(String(row[ti]),String(row[ci]));}
let companies=0;const methods:Record<string,number>={},fields:Record<string,number>={},integrityRepairs:Array<{id:string;before:string[];after:string[]}>=[];
for(const file of readdirSync(corpusPath('fundamentals')).filter(f=>f.endsWith('.json'))){
 const name=`fundamentals/${file}`,f=readCorpusJson<Fundamentals>(name)!;
 const previousIntegrity=f.integrity;
 const raw=readCorpusJson<any>(`raw/eodhd/${file}`),fresh=raw?normalizeEodhd(raw,file.slice(0,-5)).fundamentals:null;
 const c={...universe.get(f.id),...readCorpusJson<Partial<Company>>(`companies/${f.id}.json`)};
 const lei=cachedLei(c);if(lei&&esefByLei.has(lei))f.years=fillYears(f.years,esefByLei.get(lei)!);
 if(c.country==='JP'){
  let edinet=readCorpusJson<Year[]>(`completeness/edinet/${file}`);
  if(!edinet){
   edinet=[];
   const docs=[...new Map((documents.get(f.id)??[]).map(d=>[d.docID,d])).values()].sort((a,b)=>a.submitDateTime.localeCompare(b.submitDateTime));
   for(const doc of docs){
    const zip=corpusPath(`raw/edinet/csv/${doc.docID}.zip`);if(!existsSync(zip))continue;
    const ys=yearsFromEdinet(csvFilesFromZip(zip).flatMap(parseEdinetCsv));
    for(const y of ys)for(const p of Object.values(y.provenance??{}))p.source=`https://disclosure2.edinet-fsa.go.jp/WEEK0010.aspx?docId=${doc.docID}`;
    edinet=fillYears(edinet,ys);
   }
   writeCorpusJson(`completeness/edinet/${file}`,edinet);
  }
  f.years=fillYears(f.years,edinet);
 }
 const cik=String(c.cik??(c.exchange==='US'&&c.code?cikByTicker.get(c.code.replaceAll('.','-')):null)??'').replace(/^0+/,'');
 const sec=secFiles.has(cik)?readCorpusJson<Year[]>(`completeness/sec/${secFiles.get(cik)}`):null;
 if(sec){
  for(const y of f.years){const source=sec.find(s=>s.end===y.end&&s.currency===y.currency);if(!source)continue;
   for(const [key,p]of Object.entries(y.provenance??{}))if(p.source.includes('data.sec.gov')&&typeof source[key as keyof Year]==='number'){
    Object.assign(y,{[key]:source[key as keyof Year]});y.provenance![key]=source.provenance![key];
   }
   if(y.provenance?.totalDebt?.source.includes('data.sec.gov'))y.debtIncludesLeases=source.debtIncludesLeases;
  }
  f.years=fillYears(f.years,sec);
 }
 const yahoo=readCorpusJson<Year[]>(`completeness/yahoo/${file}`);if(yahoo)f.years=fillYears(f.years,yahoo);
 if(fresh){const byEnd=new Map(fresh.years.map(y=>[y.end,y]));f.years=fillYears(f.years,fresh.years).map(y=>refreshEodhdBalance(y,byEnd.get(y.end),raw,c.country??''));}
 f.years=cachedProvenance(deriveYears(f.years),name);
 for(const y of f.years)for(const [key,p]of Object.entries(y.provenance??{})){
  p.source=p.source.replace(/(https:\/\/query2.finance.yahoo.com\/[^?]+)\?.*/, '$1');
  methods[p.method]=(methods[p.method]??0)+1;
  if(p.method==='derived'||p.method==='estimate'||p.method==='absent-in-complete-statement')fields[key]=(fields[key]??0)+1;
 }
 f.integrity=checkIntegrity(f);
 if(previousIntegrity.reasons.some(r=>r.includes('balance sheet off'))&&!f.integrity.reasons.some(r=>r.includes('balance sheet off')))integrityRepairs.push({id:f.id,before:previousIntegrity.reasons,after:f.integrity.reasons});
 writeCorpusJson(name,f);companies++;
 if(companies%2000===0)console.log(`finalize: ${companies}`);
}
writeCorpusJson('completeness/provenance-counts.json',{companies,methods,fields});console.log({companies,methods,fields});
writeCorpusJson('completeness/integrity-repairs.json',integrityRepairs);console.log({balanceRepairs:integrityRepairs.length});
