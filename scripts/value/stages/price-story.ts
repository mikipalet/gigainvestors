import {createHash} from 'node:crypto';
import {corpusPath,readCorpusJson,writeCorpusJson} from '../../../lib/value/corpus';
import {askJev} from '../../../lib/value/jev/client';
import {pool} from '../../../lib/value/http';
import {candidateCorpus,readDossiers,readPrices,storyDiskGuard,writeGzip} from '../../../lib/value/price-story/corpus';
import {composePriceStory,refreshQueue} from '../../../lib/value/price-story/compose';
import {SELECTION_VERSION,selectSource,type Selection,type Candidate} from '../../../lib/value/price-story/selection';
import type {StoryReading} from '../../../lib/value/price-story/publication';
const empty=():Selection=>({selected:null,scores:{},rejected:{},considered:0});
export default async function priceStory({only,limit=400,force=false,offline=false}:{only?:string[];limit?:number;force?:boolean;offline?:boolean}){
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
 let done=0;
 await pool({items:queue,concurrency:2,run:async id=>{
  storyDiskGuard();const d=dossiers[id],corpus=await candidateCorpus(d,now,offline);
  const candidates=corpus.candidates;
  writeGzip(corpusPath(`price-story/candidates/${id}.json.gz`),candidates);
  const hash=createHash('sha256').update(JSON.stringify(candidates)).digest('hex');
  const previous=readCorpusJson<StoryReading>(`price-story/readings/${id}.json`);
  if(offline){writeCorpusJson(`price-story/prepared/${id}.json`,{asOf:now,candidatesHash:hash,count:candidates.length,newsStatus:corpus.newsStatus});done++;return;}
  if(previous?.version===SELECTION_VERSION&&previous.candidatesHash===hash&&!force&&Date.parse(now)-Date.parse(previous.asOf)<6*86400000){done++;return;}
  const ask:Parameters<typeof selectSource>[3]=async input=>{storyDiskGuard();return askJev({...input,usageFile:'price-story/usage.jsonl'});};
  const quote=prices[id]??null,computed=composePriceStory(d,quote,null,[],now);
  const context=`As of ${now.slice(0,10)}. Computed price context: ${computed.line}. ${computed.needs??''}`;
  const price=await selectSource(candidates,'price',d.company.name,ask,context);
  const risk=await selectSource(candidates,'risk',d.company.name,ask);
  const pricing=await selectSource(candidates,'pricing',d.company.name,ask);
  // Largest monthly moves available in the same published five-year history.
  const history=(d.priceHistory??[]).filter(p=>p[0]>=String(Number(now.slice(0,4))-5)+now.slice(4,7));
  const moves=history.slice(1).map((p,i)=>({date:p[0],move:p[1]/history[i][1]-1})).sort((a,b)=>Math.abs(b.move)-Math.abs(a.move));
  const events:Candidate[]=[];
  for(const move of moves){
   const matching=candidates.filter(c=>c.kind==='price'&&c.section==='News headline'&&c.date.slice(0,7)===move.date&&!events.some(e=>e.id===c.id));
   if(!matching.length)continue;
   const picked=await selectSource(matching,'price',d.company.name,ask,`Price moved ${Math.round(move.move*100)}% in ${move.date}. Select a headline coinciding with this move; temporal coincidence alone is not proof of cause.`);
   if(picked.selected)events.push(picked.selected);if(events.length===6)break;
  }
  const result:StoryReading={version:SELECTION_VERSION,asOf:now,newsStatus:corpus.newsStatus,candidatesHash:hash,price,risk,pricing,events};
  storyDiskGuard();writeCorpusJson(`price-story/readings/${id}.json`,result);
  done++;console.log(`price-story ${done}/${queue.length} ${id} price=${!!price.selected} risk=${!!risk.selected} pricing=${!!pricing.selected} news=${corpus.newsStatus}`);
 }});
 console.log(`price-story: ${done}/${queue.length} processed; published universe ${ids.length}; weekly movers ${movers.size}`);
}
