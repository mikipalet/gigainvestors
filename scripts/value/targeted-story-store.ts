/** Read-only live inputs; writes exclusively to the dedicated independent /tmp copy. */
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,realpathSync,statSync,statfsSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {targetedStory} from './targeted-story-overlay';
import type {Dossier,PriceMap} from '../../lib/value/types';
import type {StoryReading,StoryGrade} from '../../lib/value/price-story/publication';
const [baseline,output,corpus,evidence,now]=process.argv.slice(2);
assert(baseline&&output&&corpus&&evidence&&now,'BASELINE OUTPUT CORPUS EVIDENCE ISO_DATE required');
assert.equal(realpathSync(output),'/tmp/value-story-store');
assert.notEqual(realpathSync(baseline),realpathSync(output));
const read=<T>(f:string):T=>JSON.parse(readFileSync(f,'utf8'));
const optional=<T>(f:string):T|null=>{try{return read<T>(f);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}};
const grade=read<StoryGrade>(path.join(corpus,'price-story/calibration.json'));
const prices=Object.assign({},...readdirSync(path.join(baseline,'prices')).filter(f=>f.endsWith('.json')).map(f=>read<PriceMap>(path.join(baseline,'prices',f)))) as PriceMap;
const summary={dossiers:0,storyLines:0,literalPrice:0,events:0,q3:0,q6:0,missingReadings:0,files:[] as string[],selections:[] as unknown[]};
for(const f of readdirSync(path.join(baseline,'dossiers')).filter(f=>f.endsWith('.json')).sort()){
 const disk=statfsSync(output);assert(disk.bavail*disk.bsize>=4*1024**3,'DISK STOP below 4 GiB');
 const source=path.join(baseline,'dossiers',f),dest=path.join(output,'dossiers',f);
 assert.notEqual(statSync(source).ino,statSync(dest).ino,'Hardlinks to live forbidden');
 assert.equal(readFileSync(source,'utf8'),readFileSync(dest,'utf8'),'Output must start as exact baseline copy');
 const shard=read<Record<string,Dossier>>(source);
 for(const [id,d] of Object.entries(shard)){
  const reading=optional<StoryReading>(path.join(corpus,'price-story/readings',`${id}.json`));
  if(!reading)summary.missingReadings++;
  const result=targetedStory(d,prices[id]??null,reading,grade,now);
  shard[id]=result;summary.dossiers++;if(result.priceStory?.line)summary.storyLines++;if(result.priceStory?.selected)summary.literalPrice++;summary.events+=result.priceStory?.events.length??0;
  const changed:number[]=[];
  for(const q of [3,6])if(JSON.stringify(d.ownerMemo?.lines.find(l=>l.question===q))!==JSON.stringify(result.ownerMemo?.lines.find(l=>l.question===q))){changed.push(q);if(q===3)summary.q3++;else summary.q6++;}
  summary.selections.push({id,readingVersion:reading?.version??null,readingAsOf:reading?.asOf??null,changedMemoQuestions:changed});
 }
 writeFileSync(dest,JSON.stringify(shard)+'\n');summary.files.push(`dossiers/${f}`);
}
writeFileSync(path.join(evidence,'overlay.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({...summary,selections:undefined,files:summary.files.length}));
