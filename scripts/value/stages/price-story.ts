import {createHash} from 'node:crypto';
import {corpusPath,readCorpusJson,writeCorpusJson} from '../../../lib/value/corpus';
import {askJev} from '../../../lib/value/jev/client';
import {pool,createLimiter} from '../../../lib/value/http';
import {candidateCorpus,readDossiers,readPrices,readGzip,storyDiskGuard,writeGzip} from '../../../lib/value/price-story/corpus';
import {composePriceStory,refreshQueue} from '../../../lib/value/price-story/compose';
import {SELECTION_VERSION,KIND_VERSIONS,rejectionReason,selectSource,type Selection,type Candidate} from '../../../lib/value/price-story/selection';
import type {StoryReading} from '../../../lib/value/price-story/publication';
const hashOf=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export default async function priceStory({only,limit=400,force=false,offline=false,cachedNews=false}:{only?:string[];limit?:number;force?:boolean;offline?:boolean;cachedNews?:boolean}){
 storyDiskGuard();const now=new Date().toISOString(),dossiers=readDossiers(),prices=readPrices();
 const ids=Object.keys(dossiers).sort(),checked:Record<string,string>={},movers=new Set<string>();
 const snapshot=readCorpusJson<Record<string,Array<[string,number]>>>('price-story/weekly-prices.json')??{};
 for(const id of ids){
  const reading=readCorpusJson<StoryReading>(`price-story/readings/${id}.json`);if(reading?.newsStatus==='fetched'||reading?.newsStatus==='cached')checked[id]=reading.asOf;
  const quote=prices[id];if(!quote||quote[2]==='seed')continue;
  const points=(snapshot[id]??[]).filter(([date])=>Date.parse(now)-Date.parse(date)<15*86400000);
  const week=points.filter(([date])=>Date.parse(quote[1])-Date.parse(date)>=6*86400000&&Date.parse(quote[1])-Date.parse(date)<=8*86400000).at(-1);
  if(week&&Math.abs(quote[0]/week[1]-1)>.1)movers.add(id);
  snapshot[id]=[...points.filter(([date])=>date!==quote[1]),[quote[1],quote[0]]];
 }
 writeCorpusJson('price-story/weekly-prices.json',snapshot);
 const queue=only?only.filter(id=>dossiers[id]):force?ids.slice(0,limit):refreshQueue(ids,checked,movers,now,limit);
 const requestLimit=createLimiter({perSecond:Number(process.env.STORY_JEV_RPS??7.8)});
 let done=0;
 await pool({items:queue,concurrency:Number(process.env.STORY_CONCURRENCY??2),run:async id=>{
  storyDiskGuard();const d=dossiers[id],corpus=await candidateCorpus(d,now,offline||cachedNews);
  const candidates=corpus.candidates;
  const hash=hashOf(candidates),kindHashes=Object.fromEntries((['price','risk','pricing'] as const).map(kind=>[kind,hashOf(candidates.filter(c=>c.kind===kind))])) as NonNullable<StoryReading['kindHashes']>;
  const previous=readCorpusJson<StoryReading>(`price-story/readings/${id}.json`);
  let priorHashes=previous?.kindHashes;
  // Earlier complete readings stored only the combined hash. Validate the retained
  // candidates before deriving separate keys; an interrupted overwrite cannot be reused.
  if(previous&&!priorHashes){const retained=readGzip<Candidate[]>(corpusPath(`price-story/candidates/${id}.json.gz`));if(retained&&hashOf(retained)===previous.candidatesHash){priorHashes=Object.fromEntries((['price','risk','pricing'] as const).map(kind=>[kind,hashOf(retained.filter(c=>c.kind===kind))])) as typeof kindHashes;writeCorpusJson(`price-story/readings/${id}.json`,{...previous,kindHashes:priorHashes});}}
  writeGzip(corpusPath(`price-story/candidates/${id}.json.gz`),candidates);
  if(offline){writeCorpusJson(`price-story/prepared/${id}.json`,{asOf:now,candidatesHash:hash,count:candidates.length,newsStatus:corpus.newsStatus});done++;return;}
  if(previous?.version===SELECTION_VERSION&&previous.candidatesHash===hash&&!force&&!movers.has(id)&&Date.parse(now)-Date.parse(previous.asOf)<6*86400000&&(['price','risk','pricing'] as const).every(kind=>!previous[kind].selected||!rejectionReason(previous[kind].selected!,d.company.name,[d.company.code]))&&previous.events.every(c=>!rejectionReason(c,d.company.name,[d.company.code]))){done++;return;}
  const ask:Parameters<typeof selectSource>[3]=async input=>{storyDiskGuard();return requestLimit(()=>askJev({...input,usageFile:'price-story/usage.jsonl'}));};
  const quote=prices[id]??null,computed=composePriceStory(d,quote,null,[],now);
  const context=`As of ${now.slice(0,10)}. ${computed.line.startsWith('Down ')?'The shares are below their previous high. Explain current business pressure behind the depressed price.':computed.needs?`Current price expectation: ${computed.needs}. Explain the business driver behind that expectation.`:`Current observed price: ${computed.line}. Explain the business driver.`}`;
  const reusable=(kind:keyof typeof KIND_VERSIONS)=>!force&&previous?.asOf.slice(0,10)===now.slice(0,10)&&(previous.kindVersions?.[kind]??previous.version)===KIND_VERSIONS[kind]&&priorHashes?.[kind]===kindHashes[kind]&&(!previous[kind].selected||!rejectionReason(previous[kind].selected!,d.company.name,[d.company.code]));
  const price=reusable('price')?previous!.price:await selectSource(candidates,'price',d.company.name,ask,context,[d.company.code],!force&&previous?.asOf.slice(0,10)===now.slice(0,10)&&priorHashes?.price===kindHashes.price&&['literal-10','literal-12',KIND_VERSIONS.price].includes(previous.kindVersions?.price??previous.version)?previous.price.selected??undefined:undefined);
  const risk=reusable('risk')?previous!.risk:await selectSource(candidates,'risk',d.company.name,ask,`Company type: ${d.company.kind}. Primary business: ${d.ownerMemo?.lines.find(line=>line.question===1)?.answer??d.company.name}`);
  const pricing=reusable('pricing')?previous!.pricing:await selectSource(candidates,'pricing',d.company.name,ask);
  // Largest monthly moves available in the same published five-year history.
  const history=(d.priceHistory??[]).filter(p=>p[0]>=String(Number(now.slice(0,4))-5)+now.slice(4,7));
  const moves=history.slice(1).map((p,i)=>({date:p[0],move:p[1]/history[i][1]-1})).sort((a,b)=>Math.abs(b.move)-Math.abs(a.move));
  const eventHash=hashOf([kindHashes.price,history]);
  const sameEvents=!force&&previous?.asOf.slice(0,10)===now.slice(0,10)&&priorHashes?.price===kindHashes.price&&(!previous.eventHash||previous.eventHash===eventHash);
  const reuseEvents=reusable('price')&&sameEvents&&previous!.events.every(c=>!rejectionReason(c,d.company.name,[d.company.code]));
  const events:Candidate[]=reuseEvents?previous!.events:[];
  for(const move of reuseEvents?[]:moves){
   const matching=candidates.filter(c=>c.kind==='price'&&c.section==='News headline'&&c.date.slice(0,7)===move.date&&!events.some(e=>e.id===c.id));
   if(!matching.length)continue;
   const priorEvent=sameEvents?previous!.events.find(c=>matching.some(candidate=>candidate.id===c.id)):undefined;
   const picked=await selectSource(matching,'price',d.company.name,ask,`Price moved ${Math.round(move.move*100)}% in ${move.date}. Select a headline coinciding with this move; temporal coincidence alone is not proof of cause.`,[d.company.code],priorEvent);
   if(picked.selected)events.push(picked.selected);if(events.length===6)break;
  }
  const result:StoryReading={version:SELECTION_VERSION,asOf:now,newsStatus:corpus.newsStatus,candidatesHash:hash,price,risk,pricing,events,kindHashes,kindVersions:KIND_VERSIONS,eventHash};
  storyDiskGuard();writeCorpusJson(`price-story/readings/${id}.json`,result);
  done++;console.log(`price-story ${done}/${queue.length} ${id} price=${!!price.selected} risk=${!!risk.selected} pricing=${!!pricing.selected} news=${corpus.newsStatus}`);
 }});
 console.log(`price-story: ${done}/${queue.length} processed; published universe ${ids.length}; weekly movers ${movers.size}`);
}
