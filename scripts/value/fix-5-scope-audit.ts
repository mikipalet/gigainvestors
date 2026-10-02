/** All published companies; exact serialized equality, no numeric tolerance. */
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {nonShareDifferences,splitSeries,splitMetrics} from '../../lib/value/split-replay';
import type {Dossier} from '../../lib/value/types';
const [before='/Users/miki/value-corpus/publish-repo',after='.fix5/store',output='.fix5c/scope-audit.json']=process.argv.slice(2);
const load=(root:string):Record<string,Dossier>=>Object.assign({},...readdirSync(root+'/dossiers').filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(root+'/dossiers/'+f,'utf8'))));
const old=load(before),next=load(after),differences=Object.entries(old).flatMap(([id,d])=>next[id]?nonShareDifferences(d,next[id]).map(path=>({id,path,before:path.split('.').reduce((o:any,k)=>o?.[k],d),after:path.split('.').reduce((o:any,k)=>o?.[k],next[id])})):[{id,path:'removed'}]);
const added=Object.keys(next).filter(id=>!old[id]);let checked=0;
for(const d of Object.values(old)){
 checked+=Object.keys(d.series).filter(k=>!splitSeries.has(k)).length+1;
 for(const line of d.ownerMemo?.lines??[])checked+=Number(!/per share/i.test(line.chart?.label??''))+1;
 for(const t of Object.values(d.tests))checked+=Object.keys(t.series).filter(k=>!splitSeries.has(k)).length+Object.keys(t.metrics).filter(k=>!splitMetrics.has(k)&&k!=='mos').length+Object.keys(t.rawMetrics??{}).filter(k=>!splitMetrics.has(k)).length;
}
const report={published:Object.keys(next).length,baseline:Object.keys(old).length,checked,added,nonShareDifferences:differences.length,affectedCompanies:new Set(differences.map(d=>d.id)).size,differences};
writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,differences:undefined}));if(differences.length||added.length)process.exitCode=1;
