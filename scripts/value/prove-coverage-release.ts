/** Verify the real full-publish output against the live archive, never writing it. */
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {corpusPath,readCorpusJson} from '../../lib/value/corpus';
import {readCoverageRelease,assertAdditionBinding} from './coverage-release';
import {shardOf} from '../../lib/value/shard';
import type {Analysis} from '../../lib/value/types';
const [out,evidence]=process.argv.slice(2);
if(!out||!evidence)throw Error('Usage: prove-coverage-release.ts <out> <evidence.json>');
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const release=readCoverageRelease()!;
const baselineRepo=process.env.VALUE_BASELINE_REPO??corpusPath('publish-repo');
const digest=(data:unknown)=>createHash('sha256').update(JSON.stringify(data)).digest('hex');
const result={at:new Date().toISOString(),corpus:corpusPath(),baselineRepo,output:out,baseline:release.baselineIds.length,additions:release.additionIds.length,held:release.held.length,baselineDossierChanges:[] as string[],baselineIndexChanges:[] as string[],baselineQuoteChanges:[] as string[],bindingFailures:[] as string[],missing:[] as string[],unexpected:[] as string[],frozen:0,freezeChanges:[] as string[],baselineHashes:{} as Record<string,string>};
const baseline=new Set(release.baselineIds),expected=new Set([...baseline,...release.additionIds]),seen=new Set<string>();
const frozen=readCorpusJson<{ids:string[]}>('verdict-freeze.json')?.ids??[];result.frozen=frozen.length;
for(const file of readdirSync(path.join(out,'dossiers')).filter(f=>f.endsWith('.json'))){
 const actual=read(path.join(out,'dossiers',file));
 const priorFile=path.join(baselineRepo,'dossiers',file);
 const prior=existsSync(priorFile)?read(priorFile):{};
 for(const [id,dossier]of Object.entries(actual)){
  seen.add(id);
  if(baseline.has(id)){
   result.baselineHashes[id]=digest(prior[id]);
   if(JSON.stringify(prior[id])!==JSON.stringify(dossier))result.baselineDossierChanges.push(id);
  }else if(expected.has(id)){
   try{assertAdditionBinding(readCorpusJson<Analysis>(`analysis/${id}.json`)!,dossier as Analysis);}catch{result.bindingFailures.push(id);}
  }
  if(frozen.includes(id)&&JSON.stringify(prior[id])!==JSON.stringify(dossier))result.freezeChanges.push(id);
 }
}
for(const id of expected)if(!seen.has(id))result.missing.push(id);
for(const id of seen)if(!expected.has(id))result.unexpected.push(id);
for(const file of readdirSync(path.join(baselineRepo,'index')).filter(f=>f.endsWith('.json'))){
 const before=read(path.join(baselineRepo,'index',file)).filter((r:any)=>baseline.has(r.id));
 const after=read(path.join(out,'index',file)).filter((r:any)=>baseline.has(r.id));
 if(!isDeepStrictEqual(before,after))result.baselineIndexChanges.push(file);
}
for(const file of readdirSync(path.join(baselineRepo,'prices')).filter(f=>/^[A-Z]{2}\.json$/.test(f))){
 const before=read(path.join(baselineRepo,'prices',file)),after=read(path.join(out,'prices',file));
 for(const id of baseline)if(before[id]&&!isDeepStrictEqual(before[id],after[id]))result.baselineQuoteChanges.push(id);
}
writeFileSync(evidence,JSON.stringify(result,null,2)+'\n');
const {baselineHashes,...summary}=result;console.log(JSON.stringify(summary));
if([result.baselineDossierChanges,result.baselineIndexChanges,result.baselineQuoteChanges,result.bindingFailures,result.missing,result.unexpected,result.freezeChanges].some(x=>x.length))throw Error('Coverage integration proof failed');
