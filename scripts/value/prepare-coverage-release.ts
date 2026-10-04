/** Read-only selection from cached coverage; writes only its private release manifest. */
import {readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {corpusPath,readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {mergeSeed} from '../../lib/value/price-seed';
import {readPrices} from '../../lib/value/price-files';
import {additionInputProblems,assertAdditionBinding,baselineAnalysisHash,type CoverageRelease} from './coverage-release';
import type {Analysis} from '../../lib/value/types';
const baselineIds=readdirSync(corpusPath('publish-repo/dossiers')).filter(f=>f.endsWith('.json')).flatMap(f=>Object.keys(JSON.parse(readFileSync(corpusPath('publish-repo/dossiers',f),'utf8')))).sort();
const stage=process.argv[2]??corpusPath('staging/coverage');
const dossiers=Object.assign({},...readdirSync(path.join(stage,'dossiers')).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(path.join(stage,'dossiers',f),'utf8'))));
const prices=readPrices(corpusPath('publish-repo/prices'));
for(const [id,quote]of Object.entries(readPrices(corpusPath('prices'))))prices[id]=mergeSeed(prices[id],quote);
const layoutHolds=new Map((readCorpusJson<Array<{id:string;reasons:string[]}>>('held-membership/layout-holds.json')??[]).map(row=>[row.id,row.reasons]));
const release:CoverageRelease={version:1,baselineIds,baselineAnalysisHashes:Object.fromEntries(baselineIds.map(id=>[id,baselineAnalysisHash(id)])),additionIds:[],held:[]};
for(const id of readCorpusJson<string[]>('held-membership/additions.json')!.sort()){
 const reasons=[...additionInputProblems(id,prices[id]),...(layoutHolds.get(id)??[])];
 const a=readCorpusJson<Analysis>(`analysis/${id}.json`);
 if(a&&reasons.length===0){if(!dossiers[id])reasons.push('publication-eligibility');else try{assertAdditionBinding(a,dossiers[id]);}catch{reasons.push('analysis-to-publication-binding');}}
 if(reasons.length)release.held.push({id,reasons});else release.additionIds.push(id);
}
writeCorpusJson('held-membership/release.json',release);
console.log(JSON.stringify({baseline:baselineIds.length,additions:release.additionIds.length,held:release.held.length,reasons:release.held.reduce((m,r)=>{for(const reason of r.reasons)m[reason]=(m[reason]??0)+1;return m;},{} as Record<string,number>)}));
