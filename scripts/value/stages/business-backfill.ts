import {factsFromVendor,latestMemoPrices} from '../../../lib/value/business/memo-facts';
import reviewInputs from '../memo-review-inputs.json';
import {validMemoClaim,type MemoClaim} from '../../../lib/value/business/memo-claims';
import {businessQueue} from '../../../lib/value/business/queue';
import {publicBusiness} from '../../../lib/value/flags/public';
import {createHash} from 'node:crypto';
import {readdirSync,existsSync,readFileSync,statSync} from 'node:fs';
import {corpusPath,readCorpusJson,writeCorpusJson} from '../../../lib/value/corpus';
import {recordBusinessReading} from '../../../lib/value/business/recordings';
import {numericMemo,type MemoFacts,type MemoLine,type OwnerMemo} from '../../../lib/value/owner-memo';
import {memoCandidates,selectMemo,validCandidate,MEMO_READER_VERSION} from '../../../lib/value/business/read';
import {businessSources} from '../../../lib/value/business/sources';
import {businessDiskGuard} from '../../../lib/value/business/disk';
import {askJev} from '../../../lib/value/jev/client';
import {applyAdjustments,trustedReading} from '../../../lib/value/judgement/apply';
import trust from '../../../lib/value/judgement/trust.json';
import {pool} from '../../../lib/value/http';
import type {Analysis,Dossier,Fundamentals,PriceMap} from '../../../lib/value/types';
interface State {id:string;inputHash:string;status:string;sourceStatus:string;attemptedAt:string;retryAfter:string;lines:number;proposed:MemoLine[]}
const examples=['LULU.US','ADBE.US','GOOGL.US','KO.US','AAPL.US','MSFT.US','WKL.AS','ACN.US','JPM.US','BRK-B.US','7203.JP','6758.JP','RELIANCE.NSE','0700.HK','005930.KO','RACE.MI','NESN.SW','MC.PA','ASML.AS','CBG.LSE'];
export default async function businessBackfill({only,limit=100,force=false,offline=false}:{only?:string[];limit?:number;force?:boolean;offline?:boolean}){
 businessDiskGuard();
 const store=process.env.VALUE_BACKFILL_STORE??corpusPath('publish-repo');
 const published:Record<string,Dossier>=Object.assign({},...readdirSync(`${store}/dossiers`).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(`${store}/dossiers/${f}`,'utf8'))));
 const priceDirectory=(dir:string):PriceMap=>Object.assign({},...readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(`${dir}/${f}`,'utf8'))));
 const prices=latestMemoPrices(priceDirectory(`${store}/prices`),priceDirectory(corpusPath('prices')));
 const aliases=JSON.parse(readFileSync(`${store}/aliases.json`,'utf8')) as Record<string,string>;
 const requested=only?.map(id=>aliases[id]??id);
 const keys=Object.keys(published).filter(id=>published[id].judgement).sort();
 const order=[...new Set([...examples.map(id=>aliases[id]??id).filter(id=>published[id]),...keys,...Object.keys(published).sort()])];
 const calibration=readCorpusJson<{version:string;accuracy:number;n:number;realCases?:number;positive?:number;negative?:number}>('business-backfill/calibration.json');
 const trusted=calibration?.version===MEMO_READER_VERSION&&calibration.accuracy>=.9&&calibration.n>=20&&(calibration.realCases??0)>=20&&(calibration.positive??0)>=5&&(calibration.negative??0)>=5;
 const now=new Date().toISOString(),states=new Map<string,State>();
 const getAnalysis=(id:string)=>{const a=readCorpusJson<Analysis>(`analysis/${id}.json`)??published[id];return {...a,businessDepth:publicBusiness(readCorpusJson(`flags/${id}.json`),a)??a.businessDepth};};
 const claimGrade=readCorpusJson<{version:string;accuracy:number;n:number;positive:number;negative:number}>('business-backfill/memo-claims-calibration.json');
 const claimsTrusted=claimGrade?.version==='1'&&claimGrade.accuracy>=.9&&claimGrade.n>=20&&claimGrade.positive>=5&&claimGrade.negative>=5;
 const review=reviewInputs as Record<string,{fy:number;facts:MemoFacts;claims:MemoClaim[]}>;
 const factsFor=(a:Analysis):MemoFacts=>{
  let facts:MemoFacts={};
  for(const id of [...new Set([a.id,...a.company.listings])]){
   const file=existsSync(corpusPath(`raw/eodhd/${id}.json`))?`raw/eodhd/${id}.json`:`business-backfill/vendor/${id}.json`;
   const raw=readCorpusJson(file);
   if(!raw)continue;const next=factsFromVendor(raw,id,statSync(corpusPath(file)).mtime.toISOString().slice(0,10));
   facts={...next,...facts};
   if(facts.insiderPercent!==undefined&&facts.product)break;
  }
  const moat=a.judgement?.business.find(r=>r.id==='moat'&&trustedReading(r,trust)&&r.evidence&&['brand','switching','network','cost','regulation','scale'].includes(r.value));
  if(moat?.evidence)facts.moat={type:moat.value==='switching'?'switching costs':moat.value==='regulation'?'regulatory':moat.value,evidence:moat.evidence};
  return {...facts,...readCorpusJson<MemoFacts>(`business-backfill/facts/${a.id}.json`),...review[a.id]?.facts};
 };
 const compose=(id:string,proposed:MemoLine[])=>{
  const a=getAnalysis(id),f=readCorpusJson<Fundamentals>(`fundamentals/${id}.json`);
  const years=applyAdjustments(f?.years??[],readCorpusJson(`judgement/${id}.json`),trust,f?.currency??a.company.currency).years;
  const computed=numericMemo(a,years,prices[id]?.[0]??null,factsFor(a));
  const lines=new Map(computed.map(l=>[l.question,l]));
  if(trusted)for(const line of proposed.filter(l=>[3,6].includes(l.question)&&/\d/.test(l.answer)&&l.evidence[0]&&validCandidate({question:l.question,span:l.answer,source:{...l.evidence[0],text:l.evidence[0].quote},names:(l.answer.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g)??[]).filter(n=>!['The','We','Our','In','For','As','This','These','Other','During','None','Group','Company','Annual','Report','Total','Table'].includes(n))}))){if(!lines.has(line.question))lines.set(line.question,line);}
  const claims=review[id]?.claims??[];
  const approved=readCorpusJson<{inputHash:string;lines:MemoLine[];calibrated?:boolean}>(`business-backfill/reviewed/${id}.json`);
  if(claimsTrusted&&approved?.calibrated&&review[id]?.fy===years.at(-1)?.fy&&approved.inputHash===createHash('sha256').update(JSON.stringify(claims)).digest('hex'))for(const line of approved.lines)if(claims.some(c=>validMemoClaim(c)&&c.question===line.question&&c.answer===line.answer&&JSON.stringify([c.source])===JSON.stringify(line.evidence)))lines.set(line.question,line);
  return [...lines.values()].sort((x,y)=>x.question-y.question);
 };
 const fingerprint=(id:string)=>createHash('sha256').update(JSON.stringify({v:'computed-1:'+MEMO_READER_VERSION,analysis:getAnalysis(id),fundamentals:readCorpusJson(`fundamentals/${id}.json`),facts:factsFor(getAnalysis(id)),review:readCorpusJson(`business-backfill/reviewed/${id}.json`),price:prices[id],calibration})).digest('hex');
 // Compute for all published IDs immediately; expensive research remains in a durable queue.
 for(const id of order){
  businessDiskGuard();
  const previous=readCorpusJson<State>(`business-backfill/status/${id}.json`);if(previous)states.set(id,previous);
  const lines=compose(id,previous?.proposed??[]),memo:OwnerMemo={version:1,asOf:now,lines,inputHash:fingerprint(id)};
  writeCorpusJson(`business-backfill/memos/${id}.json`,memo);
  if(offline&&previous){previous.lines=lines.length;previous.status=lines.length===7?'complete':!trusted&&previous.proposed.length?'calibration-pending':previous.sourceStatus==='source-retry'?'source-retry':'research-pending';states.set(id,previous);writeCorpusJson(`business-backfill/status/${id}.json`,previous);}
 }
 const queue=businessQueue((offline?[]:order).filter(id=>!requested||requested.includes(id)),states,fingerprint,now,force).slice(0,limit);
 let done=0;
 const report=()=>{
  const coverage={fivePlus:0,threeFour:0,underThree:0};
  for(const id of order){const n=readCorpusJson<OwnerMemo>(`business-backfill/memos/${id}.json`)!.lines.length;coverage[n>=5?'fivePlus':n>=3?'threeFour':'underThree']++;}
  const remaining=order.filter(id=>states.get(id)?.status!=='complete');
  writeCorpusJson('business-backfill/queue.json',{asOf:new Date().toISOString(),published:order.length,keyCount:Math.min(835,order.length),processedThisRun:done,calibrated:!!trusted,coverage,remaining:remaining.length,keyRemaining:remaining.filter(id=>order.indexOf(id)<835).length,ids:remaining,statusCounts:[...states.values()].reduce((a,s)=>({...a,[s.status]:(a[s.status]??0)+1}),{} as Record<string,number>)});
 };
 try{await pool({items:queue,concurrency:4,run:async id=>{
  businessDiskGuard();let status='retry',sourceStatus='source-retry',proposed:MemoLine[]=[];
  try{
   const a=getAnalysis(id),sources=await businessSources(a);sourceStatus=sources.status;
   const rows=memoCandidates(sources.sources);
   if(rows.length)proposed=await selectMemo(rows,async input=>{businessDiskGuard();const result=await askJev({...input,usageFile:'business-backfill/usage.jsonl'});recordBusinessReading('recordings',{id,...input,...result});return result;});
   const lines=compose(id,proposed);status=lines.length===7?'complete':!trusted&&proposed.length?'calibration-pending':sources.sources.length?'research-pending':'source-retry';
   writeCorpusJson(`business-backfill/memos/${id}.json`,{version:1,asOf:now,lines,inputHash:fingerprint(id)} satisfies OwnerMemo);
  }catch(e){if(String(e).includes('DISK STOP'))throw e;status='retry';sourceStatus=e instanceof Error?e.message:'research failed';}
  const state:State={id,inputHash:fingerprint(id),status,sourceStatus,attemptedAt:now,retryAfter:new Date(Date.now()+24*3600000).toISOString(),lines:readCorpusJson<OwnerMemo>(`business-backfill/memos/${id}.json`)!.lines.length,proposed};
  writeCorpusJson(`business-backfill/status/${id}.json`,state);states.set(id,state);done++;if(done%20===0){businessDiskGuard();report();console.log(`business-backfill: ${done}/${queue.length} processed`);}
 }});}finally{report();}
 console.log(JSON.stringify(readCorpusJson('business-backfill/queue.json'),(key,value)=>key==='ids'?undefined:value));
}
