/** Audit the local publish --out artifact, never the private memo cache alone. */
import {readFileSync,readdirSync,mkdirSync,writeFileSync,statfsSync} from 'node:fs';
import path from 'node:path';
import {corpusPath,readCorpusJson} from '../../lib/value/corpus';
import {MEMO_QUESTIONS,numericMemo,type OwnerMemo} from '../../lib/value/owner-memo';
import {businessDiskGuard} from '../../lib/value/business/disk';
import type {Dossier,Analysis,PriceMap} from '../../lib/value/types';
const root=path.resolve(process.argv[2]??'.memo-1/store');
const readShards=<T>(directory:string):Record<string,T>=>Object.assign({},...readdirSync(directory).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(path.join(directory,f),'utf8'))));
const dossiers=readShards<Dossier>(path.join(root,'dossiers')),original=readShards<Dossier>(corpusPath('publish-repo/dossiers')),prices=readShards<PriceMap[string]>(path.join(root,'prices'));
const reviewIds=['LULU.US','ADBE.US','GOOGL.US','KO.US','AAPL.US','MSFT.US','WKL.AS','ACN.US','JPM.US','BRK-B.US','7203.JP','6758.JP','RIGD.LSE','0700.HK','005930.KO','RACE.MI','NESN.SW','MC.PA','ASML.AS','CBG.LSE'];
const coverage={fivePlus:0,seven:0,threeFour:0,underThree:0},privateCoverage={fivePlus:0,seven:0},questionCounts:Record<number,number>={},errors:string[]=[],valuationReasons:Record<string,number>={};let hiddenValuations=0;
for(const id of Object.keys(original)){
 const d=dossiers[id];if(!d){errors.push(`${id}: absent from stage`);continue;}
 const lines=d.ownerMemo?.lines??[],memo=readCorpusJson<OwnerMemo>(`business-backfill/memos/${id}.json`),a=readCorpusJson<Analysis>(`analysis/${id}.json`);
 const n=lines.length;coverage[n>=5?'fivePlus':n>=3?'threeFour':'underThree']++;if(n===7)coverage.seven++;
 if((memo?.lines.length??0)>=5)privateCoverage.fivePlus++;if(memo?.lines.length===7)privateCoverage.seven++;
 if(a?.valuation&&!d.valuation)hiddenValuations++;
 if(a&&!a.valuation)valuationReasons[a.valuationReason??'no reason']=(valuationReasons[a.valuationReason??'no reason']??0)+1;
 const seen=new Set<number>();
 for(const line of lines){
  questionCounts[line.question]=(questionCounts[line.question]??0)+1;
  if(seen.has(line.question)||line.question<1||line.question>7)errors.push(`${id}: repeated/invalid question`);seen.add(line.question);
  if(line.answer.trim().split(/\s+/).length>18||!/\d/.test(line.answer)||/[\r\n]/.test(line.answer))errors.push(`${id}: invalid answer length/number`);
  if(/not enough data|not reported|unavailable|unclear|not tested|verify|being checked|not supplied|informational only|available evidence/i.test(line.answer))errors.push(`${id}: gap wording`);
  if(!line.evidence.length||line.evidence.some(e=>!/^https:\/\//.test(e.url)))errors.push(`${id}: missing HTTPS evidence`);
  if(line.question===7&&line.answer!==numericMemo(d,[],prices[id]?.[0]??null).find(l=>l.question===7)?.answer)errors.push(`${id}: price/model mismatch`);
 }
}
const review=reviewIds.map(id=>({id,lines:MEMO_QUESTIONS.map((question,i)=>({question,number:i+1,line:dossiers[id]?.ownerMemo?.lines.find(l=>l.question===i+1)??null}))}));
const disk=statfsSync('/');
const report={asOf:new Date().toISOString(),root,published:Object.keys(original).length,staged:Object.keys(dossiers).length,coverage,privateCoverage,questionCounts,hiddenValuations,valuationReasons,coveragePercent:100*coverage.fivePlus/Object.keys(original).length,acceptance:coverage.fivePlus/Object.keys(original).length>=.95&&review.every(r=>r.lines.every(l=>l.line))&&!errors.length,structuralErrors:errors,freeBytes:disk.bavail*disk.bsize,review};
businessDiskGuard();mkdirSync('.memo-1',{recursive:true});writeFileSync('.memo-1/audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,review:undefined},null,2));if(errors.length)process.exitCode=1;
