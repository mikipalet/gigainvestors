import {dividendStrength,pricingStrength} from '../../../lib/value/flags/strengths';
import {readFileSync} from 'node:fs';
import {universeCompanies} from '../../../lib/value/companies';
import {createHash} from 'node:crypto';
import {readCorpusJson,writeCorpusJson} from '../../../lib/value/corpus';
import {askJev} from '../../../lib/value/jev/client';
import {diskGuard} from '../../../lib/value/thesis/sources';
import {inlineObservations} from '../../../lib/value/flags/inline';
import {computeFlags} from '../../../lib/value/flags/compute';
import {passages,quantities,classifySignal,classifyRelationship,flagFromExtraction,relationshipFromExtraction,type Passage} from '../../../lib/value/flags/extract';
import {extractionVersion} from '../../../lib/value/flags/questions';
import {IDENTITIES} from '../../../lib/value/flags/identities';
import {confirmRelationships,relationshipConcentrations,counterpartyCandidates} from '../../../lib/value/flags/relationships';
import type {FlagRecord,FlagTrust,Counterparty,Observation} from '../../../lib/value/flags/types';
import type {Company,Analysis} from '../../../lib/value/types';
import {FLAG_COMPANIES,type FlagSource} from './flags-fetch';
import trust from '../../../lib/value/flags/trust.json';
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const score=(p:Passage)=>quantities(p.quote).length*3+(/we (?:provided|entered|recognized|have identified)|accounted for|comprised|represented|produced|increased|extended|changed our estimate|residual value/i.test(p.quote)?20:0)-(/could|may|might|no guarantee|audit.*risk/i.test(p.quote)?5:0);
export default async function flags({only=FLAG_COMPANIES}:{only?:string[]}){
 const grades=trust as FlagTrust;
 const universe=new Map(universeCompanies().map(c=>[c.id,c]));
 const companies:Counterparty[]=IDENTITIES.map(c=>{
  const actual=readCorpusJson<Analysis>(`analysis/${c.id}.json`)?.company??readCorpusJson<Company>(`companies/${c.id}.json`)??universe.get(c.id);
  // A listing missing from our universe stays a named external node.
  return {...c,id:actual?actual.id:c.id.startsWith('external:')?c.id:`external:${c.name.toLowerCase().replace(/\W+/g,'-')}`,logo:actual?.logo};
 });
 const records:FlagRecord[]=[];
 for(const id of only){
  diskGuard();const source=readCorpusJson<FlagSource>(`flags/sources/${id}.json`);if(!source){console.log(id,'no full filing');continue;}
  const company=readCorpusJson<Analysis>(`analysis/${id}.json`)?.company??readCorpusJson<Company>(`companies/${id}.json`)??universe.get(id),owner=companies.find(c=>c.id===id)??{id,name:company?.name??id};
  const supplements=readCorpusJson<{sources:FlagSource[];gaps:string[]}>(`flags/supplements/${id}.json`);
  const sources=[source,...supplements?.sources??[]];
  const observed=source.html?inlineObservations(source.html,source):[];
  const reviewed=(JSON.parse(readFileSync('lib/value/flags/reviewed-observations.json','utf8')) as Record<string,Observation[]>)[id]??[];
  const verified=reviewed.filter(o=>sources.some(s=>s.url===o.evidence.url&&s.filed===o.evidence.filed&&s.text.replace(/\s+/g,' ').includes(o.evidence.quote.replace(/\s+/g,' '))));
  const observations=[...observed.filter(o=>!verified.some(r=>r.metric===o.metric&&r.fy===o.fy)),...verified];
  const analysis=readCorpusJson<Analysis>(`analysis/${id}.json`);
  const record:FlagRecord={id,asOf:sources.map(s=>s.filed).sort().at(-1)!,flags:[...computeFlags(observations,analysis?.reportingCurrency?{series:analysis.tests.economics.series.ownerEarnings??[],currency:analysis.reportingCurrency}:undefined),...dividendStrength({...source,quote:'',section:'Annual filing'}),...pricingStrength(readCorpusJson<Analysis>(`analysis/${id}.json`)??{judgement:undefined} as Analysis)],relationships:[],observations,gaps:[...supplements?.gaps??[],...(source.partial?['Only cached annual filing sections were available; not a full-report scan']:[])],inputHash:createHash('sha256').update(sources.map(s=>s.hash).join('|')).digest('hex')};
  const jobs:Array<{topic:'signal'|'relationship';p:Passage;name?:string}>=[];
  const candidates=sources.flatMap(s=>passages(s,'signal')).filter(p=>quantities(p.quote).length||/material weakness|auditor.{0,40}(?:resign|dismiss|replac)/i.test(p.quote)).sort((a,b)=>score(b)-score(a)).slice(0,32);
  jobs.push(...candidates.map(p=>({topic:'signal' as const,p})));
  const relationPassages=sources.flatMap(s=>passages(s,'relationship'));
  const names=new Set(companies.filter(c=>c.id!==id).flatMap(c=>[c.name,...c.aliases??[]]));
  // Preserve newly named legal counterparties as external nodes pending identity review.
  for(const p of relationPassages)if(/agreement|invest|suppl|customer|guarantee|subsidiar|related.part/i.test(p.quote)){
   for(const m of p.quote.matchAll(/\b([A-Z][A-Za-z&.-]+(?:[ \t]+[A-Z][A-Za-z&.-]+){0,3}[ \t]+(?:Inc\.|LLC|Corporation|Limited|plc))\b/g))names.add(m[1]);
   for(const m of p.quote.matchAll(/\bCustomer [A-Z]\b/g))names.add(m[0]);
  }
  const foundNames=new Set<string>();
  for(const name of names){
   const known=companies.find(c=>[c.name,...c.aliases??[]].includes(name));
   if(known&&foundNames.has(known.id))continue;
   const variants=known?[known.name,...known.aliases??[]]:[name];
   const pattern=new RegExp('\\b(?:'+variants.map(escape).join('|')+')(?=\\b|[,.)])','i');
   const selected=relationPassages.filter(p=>pattern.test(p.quote)).sort((a,b)=>score(b)-score(a)).slice(0,2);
   if(selected.length){if(known)foundNames.add(known.id);jobs.push(...selected.map(p=>({topic:'relationship' as const,p,name:known?.name??name})));}
  }
  // Keep operational costs bounded even for a large subsidiary/exhibit list.
  const bounded=[...jobs.filter(j=>j.topic==='signal'),...jobs.filter(j=>j.topic==='relationship').slice(0,72)];
  let cursor=0;
  await Promise.all(Array.from({length:5},async()=>{while(cursor<bounded.length){const job=bounded[cursor++];diskGuard();
   const key=createHash('sha256').update(JSON.stringify({job,owner,version:extractionVersion(job.topic)})).digest('hex'),cache=`flags/extractions/${key}.json`;
   try{
    let result=readCorpusJson<any>(cache);if(!result){const ask=(input:Parameters<typeof askJev>[0])=>{diskGuard();return askJev({...input,usageFile:'flags/jev-usage.jsonl'});};result=job.topic==='signal'?await classifySignal(job.p,ask):await classifyRelationship(job.p,owner,job.name!,ask);writeCorpusJson(cache,{...result,company:id,topic:job.topic,evidence:job.p,counterparty:job.name});}
    if(job.topic==='signal'){const flag=flagFromExtraction(job.p,result,grades.signal);if(flag)record.flags.push(flag);}
    else {const edge=relationshipFromExtraction(job.p,owner,job.name!,result,companies,grades.relationship);if(edge)record.relationships.push(edge);}
   }catch(e){if(String(e).includes('DISK STOP'))throw e;record.gaps.push(`${job.topic}: ${e instanceof Error?e.message:'failed'}`);}
  }}));
  const reviews=JSON.parse(readFileSync('lib/value/flags/reviewed.json','utf8')) as Array<{company:string;sourceHash:string;evidence:Passage;topic:string;counterparty?:string;result:any}>;
  for(const review of reviews.filter(r=>r.company===id&&r.sourceHash===source.hash)){
   const squash=(s:string)=>s.replace(/\s+/g,' ').trim();
   if(!review.evidence.quote.split(/\[…\]/).every(q=>squash(source.text).includes(squash(q)))){record.gaps.push('Reviewed passage no longer matches filing');continue;}
   const result={...review.result,reviewed:true};
   if(review.topic==='signal'){const flag=flagFromExtraction(review.evidence,result,grades.signal);if(flag){record.flags=record.flags.filter(f=>f.kind!==flag.kind);record.flags.push(flag);}}
   else{const edge=relationshipFromExtraction(review.evidence,owner,review.counterparty!,result,companies,grades.relationship);if(edge)record.relationships.push(edge);}
  }
  // One highest-evidence instance per kind; different counterparties remain separate edges.
  record.flags=[...new Map(record.flags.sort((a,b)=>(a.confidence??1)-(b.confidence??1)||Number(a.basis==='computed')-Number(b.basis==='computed')).map(f=>[f.kind,f])).values()].sort((a,b)=>b.severity-a.severity);
  const wiki=readCorpusJson<{edges:FlagRecord['relationships'];gap?:string}>(`flags/wikidata/${id}.json`);
  if(wiki){record.relationships.push(...wiki.edges);if(wiki.gap)record.gaps.push(wiki.gap);}
  records.push(record);writeCorpusJson(`flags/${id}.json`,record);console.log(`${id}: ${record.flags.length} flags, ${record.relationships.length} relationships, ${record.gaps.length} gaps (${bounded.length} passages)`);
 }
 const edges=confirmRelationships(records.flatMap(r=>r.relationships));
 for(const record of records){record.relationships=edges.filter(r=>r.from===record.id||r.to===record.id).map(r=>{
  const other=r.from===record.id?r.to:r.from,cp=companies.find(c=>c.id===other)??(universe.has(other)?{id:other,name:universe.get(other)!.name,logo:universe.get(other)!.logo}:r.counterparty);
  return {...r,counterparty:cp,name:cp?.name??r.name};
 });
  const concentrations=relationshipConcentrations(record.relationships,record.id);
  for(const flag of concentrations){const existing=record.flags.find(f=>f.kind===flag.kind);if(!existing||(existing.series.at(-1)?.[1]??0)<=(flag.series.at(-1)?.[1]??0)){record.flags=record.flags.filter(f=>f.kind!==flag.kind);record.flags.push(flag);}}
  record.flags.sort((a,b)=>b.severity-a.severity);writeCorpusJson(`flags/${record.id}.json`,record);
  const a=readCorpusJson<Analysis>(`analysis/${record.id}.json`);if(a)writeCorpusJson(`analysis/${record.id}.json`,{...a,businessDepth:{flags:record.flags,relationships:record.relationships,asOf:record.asOf}});
 }
 const unresolved=[...new Map(edges.filter(e=>e.counterparty?.id.startsWith('external:')).map(e=>[e.counterparty!.id,e.counterparty!])).values()];
 writeCorpusJson('flags/validation/identity-review.json',unresolved.map(c=>({counterparty:c,candidates:counterpartyCandidates(c.name,companies),status:'needs-review'})));
 writeCorpusJson('flags/validation/edges.json',edges);
}
