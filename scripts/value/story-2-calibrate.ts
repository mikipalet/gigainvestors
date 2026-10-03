import dotenv from 'dotenv';
import {readFileSync} from 'node:fs';
import {readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {SELECTION_VERSION} from '../../lib/value/price-story/selection';
import type {StoryReading} from '../../lib/value/price-story/publication';
dotenv.config({path:'.env.local',quiet:true});
interface Review {id:string;candidatesHash:string;price:{acceptedIds:string[];note:string};risk:{acceptedIds:string[];note:string}}
const file=process.argv[2];if(!file)throw Error('Supply the manually reviewed calibration JSON');
const reviews=JSON.parse(readFileSync(file,'utf8')) as Review[];
if(new Set(reviews.map(r=>r.id)).size!==reviews.length)throw Error('Duplicate calibration companies');
const required=['ADBE.US','NVDA.US','KO.US','LULU.US','GOOGL.US','7203.JP','JPM.US','CBG.LSE'];
if(required.some(id=>!reviews.some(r=>r.id===id)))throw Error('Calibration lacks a named company or the selected non-US small cap');
const scores={price:{n:0,correct:0,accuracy:0},risk:{n:0,correct:0,accuracy:0}};
for(const review of reviews){
 const reading=readCorpusJson<StoryReading>(`price-story/readings/${review.id}.json`);
 if(!reading||reading.version!==SELECTION_VERSION||reading.candidatesHash!==review.candidatesHash)throw Error(`Stale calibration input: ${review.id}`);
 for(const kind of ['price','risk'] as const){
  if(!review[kind]?.note?.trim()||!Array.isArray(review[kind].acceptedIds))throw Error(`Review required: ${review.id} ${kind}`);
  scores[kind].n++;
  // No accepted main driver is a coverage failure, never a free correct abstention.
  if(reading[kind].selected&&review[kind].acceptedIds.includes(reading[kind].selected!.id))scores[kind].correct++;
 }
}
for(const kind of ['price','risk'] as const)scores[kind].accuracy=scores[kind].n?scores[kind].correct/scores[kind].n:0;
const grade={version:SELECTION_VERSION,asOf:new Date().toISOString(),...scores};
writeCorpusJson('price-story/calibration.json',grade);
console.log(JSON.stringify({...grade,passed:reviews.length>=40&&Object.values(scores).every(s=>s.accuracy>=.9)}));
