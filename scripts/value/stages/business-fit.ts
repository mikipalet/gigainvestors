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
  let readings:Reading[]=analysis.judgement?.business??[];
  if(!readings.some(r=>r.id==='business'&&r.evidence?.section!=='wiki')){
   const cached=readCorpusJson<{readings:Reading[]}>(`business-fit/readings/${id}.json`);
   const {sources}=cached?{sources:[]}:await judgementSources(analysis.company,analysis.report);
   const read=cached??await readBusiness(sources.filter(s=>s.section!=='wiki'),ask);readings=[...readings.filter(r=>r.evidence?.section!=='wiki'),...read.readings.filter(r=>!readings.some(existing=>existing.id===r.id&&existing.evidence?.section!=='wiki'))].filter(r=>BUSINESS_TOPICS.includes(r.id)&&r.value!=='unclear'&&r.confidence>=.7);
   writeCorpusJson(`business-fit/readings/${id}.json`,read);
  }
  const lines:BusinessLine[]=[];
  if(!readings.some(r=>r.id==='business'&&r.evidence?.section!=='wiki')&&analysis.company.description){
   readings.push({id:'business',version:'1',value:'identified',confidence:1,evidence:{quote:analysis.company.description,url:`https://eodhd.com/financial-summary/${id}`,section:'Vendor company description',filed:analysis.asOf?.slice(0,10)??''}});
  }
  for(const r of readings){
   if(!r.evidence||r.evidence.section==='wiki')continue;
   let answer=await selectShortText(r.evidence,sentenceCandidates[r.id]??[],ask);
   if(!answer&&r.id==='business'&&analysis.company.description)answer=await selectShortText({quote:analysis.company.description,url:`https://eodhd.com/financial-summary/${id}`,section:'Vendor company description',filed:analysis.asOf?.slice(0,10)??''},sentenceCandidates.business,ask);
   if(answer)lines.push({id:`reading-${r.id}`,text:answer.text,priority:r.id==='business'?100:r.id==='moat'?72:50,why:answer.evidence.quote.split(/(?<=[.!?])\s/)[0],evidence:answer.evidence,kind:'reading',answer});
  }
  for(const f of analysis.businessDepth?.flags??[]){
   if(!f.evidence.length)continue;
   // Use the original quotes, never the computed label, as the support boundary.
   const evidence={...f.evidence[0],quote:f.evidence.map(e=>e.quote).join('\n\n')};
   const answer=await selectShortText(evidence,sentenceCandidates.flags,ask);
   if(answer)lines.push({id:f.id,text:answer.text,priority:f.severity,why:answer.evidence.quote.split(/(?<=[.!?])\s/)[0],tone:f.tone,evidence,kind:'flag',answer});
  }
  // Add distinct operating facts only when the stronger readings leave space.
  const filing=readings.find(r=>r.id==='business'&&r.evidence?.section!=='wiki')?.evidence;
  const description=analysis.company.description??filing?.quote;
  if(description&&lines.length<6){
   const evidence=analysis.company.description?{quote:description,url:`https://eodhd.com/financial-summary/${id}`,section:'Vendor company description',filed:analysis.asOf?.slice(0,10)??''}:filing!;
   const family=(text:string)=>/(?:finance|financing).*leasing|Finances used cars|finance them/.test(text)?'financing':text;
   const used=new Set(lines.map(l=>family(l.text)));
   let options=detailCandidates.filter(text=>!used.has(family(text)));
   for(let i=0;i<12&&lines.length<6;i++){
    let selected:string|undefined;
    const answer=await selectShortText(evidence,options,ask,text=>{selected=text;});if(!selected)break;
    options=options.filter(text=>text!==selected);
    if(!answer)continue;
    options=options.filter(text=>family(text)!==family(answer.text));
    if(lines.some(l=>l.text===answer.text))continue;
    lines.push({id:`reading-detail-${i}`,text:answer.text,priority:40,why:answer.evidence.quote.split(/(?<=[.!?])\s/)[0],evidence,kind:'reading',answer});
   }
  }
  const counts={red:0,green:0};
  const overview=lines.sort((a,b)=>b.priority-a.priority).filter(l=>!l.tone||counts[l.tone]++<3).filter((l,i,all)=>all.findIndex(x=>x.text===l.text)===i).slice(0,6);
  writeCorpusJson(`business-fit/overview/${id}.json`,overview);
  console.log(`${id}: ${overview.length} supported plain sentences`);
 }
 if(missing.length)console.log(`Missing local analysis: ${missing.join(', ')}`);
}
