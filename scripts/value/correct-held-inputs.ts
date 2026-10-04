import {kindFor} from '../../lib/value/universe';
/** Offline additions-only replay of archived SEC evidence. No paid requests. */
import {readFileSync,existsSync,statfsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {corpusDir,readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {correctCachedAnnualSources,type AnnualSourceEvidence} from '../../lib/value/annual-source-corrections';
import {annualInlineFacts} from '../../lib/value/annual-inline';
import {checkIntegrity} from '../../lib/value/integrity';
import type {Company,Fundamentals,ReportMeta} from '../../lib/value/types';
import type {CompanyFacts} from '../../lib/value/completeness/second-sources';
process.env.VALUE_CORPUS_DIR??=path.join(os.homedir(),'data/value-cover');
if(path.resolve(corpusDir())===path.resolve(process.env.VALUE_BASE_CORPUS??path.join(os.homedir(),'value-corpus')))throw Error('Corrections require an isolated corpus');
const bases=JSON.parse(readFileSync(process.argv[2],'utf8')) as Record<string,{ordinaryPerAds?:number;source:string;shareDimensions?:Record<string,string>;revenueConcept?:string;revenueComponents?:string[];revenueDimensions?:Record<string,string>}>;
const selected=process.env.VALUE_ONLY?.split(',');
const ids=readCorpusJson<string[]>('held-membership/additions.json')!.filter(id=>!selected||selected.includes(id));
const changes:Array<{id:string;period:string;field:string;before:unknown;after:unknown;source:unknown}>=[];
for(const id of ids){
 const disk=statfsSync('/');if(disk.bavail*disk.bsize<4*1024**3)throw Error('DISK STOP');
 const company=readCorpusJson<Company>(`companies/${id}.json`),f=readCorpusJson<Fundamentals>(`fundamentals/${id}.json`);
 if(!company||!f)continue;
 const profile=readCorpusJson<{sic?:string}>(`raw/sec-submissions/${id}.json`);
 if(profile&&Number(profile.sic)>=6310&&Number(profile.sic)<6400){company.kind=kindFor({...company,sic:profile.sic});writeCorpusJson(`companies/${id}.json`,company);}
 const meta=readCorpusJson<ReportMeta>(`reports/${id}/meta.json`);
 if(!company.cik&&meta?.url){const cik=meta.url.match(/\/data\/(\d+)\//)?.[1];if(cik){company.cik=cik.padStart(10,'0');writeCorpusJson(`companies/${id}.json`,company);}}
 const facts=readCorpusJson<CompanyFacts>(`held-validation/raw/${id}-sec.json`);
 if(facts)writeCorpusJson(`raw/sec-companyfacts/${id}.json`,facts);
 const file=path.join(corpusDir(),`held-validation/raw/${id}-annual.html`),basis=bases[id];
 if(meta?.url&&meta.filed&&existsSync(file)){
  const selection={shareDimensions:basis?.shareDimensions,revenueConcept:basis?.revenueConcept,revenueComponents:basis?.revenueComponents,revenueDimensions:basis?.revenueDimensions};
  const evidence:AnnualSourceEvidence={...selection,facts:annualInlineFacts(readFileSync(file,'utf8'),{url:meta.url,filed:meta.filed,form:meta.kind,...selection}),source:meta.url,ordinaryPerAds:basis?.ordinaryPerAds,shareBasisSource:basis?.source};
  writeCorpusJson(`raw/sec-annual/${id}.json`,evidence);
 }
 const corrected=correctCachedAnnualSources(company,f.years,readCorpusJson(`raw/eodhd/${id}.json`),readCorpusJson,f.splits);
 for(const y of corrected){
  const originalEnd=y.provenance?.end?.field==='annual-period-alignment'?y.provenance.end.inputs?.[0]?.replace('Vendor annual end ',''):y.end;
  const before=f.years.find(row=>row.end===originalEnd)??f.years.find(row=>row.end===y.end);
  if(!before)continue;
  for(const field of ['end','fy','revenue','dilutedShares','currency'] as const)if(y[field]!==before[field])changes.push({id,period:y.end,field,before:before[field],after:y[field],source:y.provenance?.[field]??y.provenance?.end});
 }
 f.years=corrected;f.currency=corrected.at(-1)?.currency??f.currency;f.integrity=checkIntegrity(structuredClone(f),{source:company.source});
 writeCorpusJson(`fundamentals/${id}.json`,f);
}
const old=readCorpusJson<typeof changes>('held-validation/cover-2-corrections.json')??[];
const merged=new Map(old.map(c=>[`${c.id}|${c.period}|${c.field}`,c]));
for(const c of changes){const k=`${c.id}|${c.period}|${c.field}`;merged.set(k,{...c,before:merged.get(k)?.before??c.before});}
writeCorpusJson('held-validation/cover-2-corrections.json',[...merged.values()].filter(c=>c.before!==c.after));
console.log(JSON.stringify({companies:new Set(changes.map(c=>c.id)).size,changedFields:changes.length}));
