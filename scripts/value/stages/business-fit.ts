import {sourceSentences} from '../../../lib/value/judgement/source-sentences';
import {generalInfoFor} from '../../../lib/value/enrichment';
import {indiaDepositarySymbols} from '../../../lib/value/india/symbols';
import {readCorpusJson,writeCorpusJson,appendJsonl} from '../../../lib/value/corpus';
import {askJev} from '../../../lib/value/jev/client';
import {diskGuard} from '../../../lib/value/thesis/sources';
import {judgementSources} from '../../../lib/value/judgement/sources';
import {readBusiness} from '../../../lib/value/judgement/read';
import {BUSINESS_TOPICS} from '../../../lib/value/judgement/questions';
import {sentenceCandidates,detailCandidates} from '../../../lib/value/judgement/sentences';
import {selectShortText} from '../../../lib/value/judgement/short-text';
import type {BusinessLine} from '../../../lib/value/flags/presentation';
import type {Analysis} from '../../../lib/value/types';
import type {Reading} from '../../../lib/value/judgement/types';
import type {Ask} from '../../../lib/value/thesis/evidence';
const defaults=['GOOGL.US','AAPL.US','KO.US','LULU.US','WKL.AS','JPM.US','CBG.LSE','7203.JP','RELIANCE.NSE','RACE.MI'];
export default async function businessFit({only=defaults,force=false}:{only?:string[];force?:boolean}){
 const missing:string[]=[];
 const ask:Ask=async input=>{diskGuard();const result=await askJev({...input,usageFile:'business-fit/usage.jsonl'});appendJsonl('business-fit/recordings.jsonl',{...input,...result});return result;};
 for(const requested of only){
  const id=Object.entries(indiaDepositarySymbols).find(([,symbol])=>`${symbol}.NSE`===requested)?.[0]??requested;
  diskGuard();const analysis=readCorpusJson<Analysis>(`analysis/${id}.json`);
  if(!analysis){missing.push(id);continue;}
  if(!force&&readCorpusJson(`business-fit/overview/${id}.json`))continue;
  const verified=readCorpusJson<{id:string;sourceId:string;patch:{description?:string}}>(`completeness/verified/${id}.json`);
  const primaryDescription=analysis.company.description||generalInfoFor(analysis.company).Description;
  const descriptionText=primaryDescription||(verified?.id===id?verified.patch.description:undefined);
  const descriptionSource=!primaryDescription&&verified?.id===id?verified.sourceId:id;
  const descriptionUrl=/^https:\/\//.test(descriptionSource)?descriptionSource:`https://eodhd.com/financial-summary/${descriptionSource}`;
  let readings:Reading[]=analysis.judgement?.business??[];
  if(!readings.some(r=>r.id==='business'&&r.evidence?.section!=='wiki')){
   const cached=readCorpusJson<{readings:Reading[]}>(`business-fit/readings/${id}.json`);
   const {sources}=cached?{sources:[]}:await judgementSources(analysis.company,analysis.report);
   const saved=readCorpusJson<{readings:Reading[]}>(`judgement/${id}.json`);
   const read=cached??saved??await readBusiness(sources.filter(s=>s.section!=='wiki'),ask);readings=[...readings.filter(r=>r.evidence?.section!=='wiki'),...read.readings.filter(r=>!readings.some(existing=>existing.id===r.id&&existing.evidence?.section!=='wiki'))].filter(r=>BUSINESS_TOPICS.includes(r.id)&&r.value!=='unclear'&&r.confidence>=.7);
   writeCorpusJson(`business-fit/readings/${id}.json`,read);
  }
  if(!readings.some(r=>r.id==='business'&&r.evidence?.section!=='wiki')&&!descriptionText&&analysis.report.kind!=='description'){
   // A background/wiki reading must not displace an available filing description.
   const {sources}=await judgementSources(analysis.company,analysis.report);
   const primary=await readBusiness(sources.filter(s=>s.section!=='wiki'),ask,['business']);
   readings=[...readings.filter(r=>r.id!=='business'),...primary.readings.filter(r=>r.value!=='unclear'&&r.confidence>=.7)];
  }
  const lines:BusinessLine[]=[];
  if(!readings.some(r=>r.id==='business'&&r.evidence?.section!=='wiki')&&descriptionText){
   readings.push({id:'business',version:'1',value:'identified',confidence:1,evidence:{quote:descriptionText,url:descriptionUrl,section:'Vendor company description',filed:analysis.asOf?.slice(0,10)??''}});
  }
  for(const r of readings){
   if(!r.evidence||r.evidence.section==='wiki')continue;
   let answer=await selectShortText(r.evidence,[...sentenceCandidates[r.id]??[],...sourceSentences(r.evidence.quote)],ask);
   if(!answer&&r.id==='business'&&descriptionText)answer=await selectShortText({quote:descriptionText,url:descriptionUrl,section:'Vendor company description',filed:analysis.asOf?.slice(0,10)??''},sourceSentences(descriptionText),ask);
   if(answer)lines.push({id:`reading-${r.id}`,text:answer.text,priority:r.id==='business'?100:r.id==='moat'?72:50,why:answer.evidence.quote.split(/(?<=[.!?])\s/)[0],evidence:answer.evidence,kind:'reading',answer});
  }
  // Computed/verified flag labels enter the shared page ranking directly.
  // Add distinct operating facts only when the stronger readings leave space.
  const filing=readings.find(r=>r.id==='business'&&r.evidence?.section!=='wiki')?.evidence;
  const description=descriptionText??filing?.quote;
  if(description&&lines.length<3){
   const evidence=descriptionText?{quote:description,url:descriptionUrl,section:'Vendor company description',filed:analysis.asOf?.slice(0,10)??''}:filing!;
   const family=(text:string)=>/(?:finance|financing).*leasing|Finances used cars|finance them/.test(text)?'financing':text;
   const used=new Set(lines.map(l=>family(l.text)));
   let options=detailCandidates.filter(text=>!used.has(family(text)));
   for(let i=0;i<4&&lines.length<3;i++){
    let selected:string|undefined;
    const answer=await selectShortText(evidence,options,ask,text=>{selected=text;});if(!selected)break;
    options=options.filter(text=>text!==selected);
    if(!answer)continue;
    options=options.filter(text=>family(text)!==family(answer.text));
    if(lines.some(l=>l.text===answer.text))continue;
    lines.push({id:`reading-detail-${i}`,text:answer.text,priority:40,why:answer.evidence.quote.split(/(?<=[.!?])\s/)[0],evidence,kind:'reading',answer});
   }
  }
  const overview=lines.sort((a,b)=>b.priority-a.priority).filter((l,i,all)=>all.findIndex(x=>x.text===l.text)===i).slice(0,6);
  writeCorpusJson(`business-fit/overview/${id}.json`,overview);
  console.log(`${id}: ${overview.length} supported plain sentences`);
 }
 if(missing.length)console.log(`Missing local analysis: ${missing.join(', ')}`);
}
