/** Local repair: re-run numeric analysis using existing qualitative readings and source caches. */
import {readFileSync,statfsSync} from 'node:fs';
import analyze from './stages/analyze';
import {readCorpusJson} from '../../lib/value/corpus';
import {askCompany} from '../../lib/value/jev/run';
import {QUESTIONS_VERSION} from '../../lib/value/jev/questions';
import {createHash} from 'node:crypto';
import type {Analysis,JevAnswer} from '../../lib/value/types';

async function main(){
 process.env.VALUE_NO_EODHD='1';
 const only=(JSON.parse(readFileSync(process.argv[2],'utf8')) as Array<{id:string}>).map(c=>c.id);
 const stat=statfsSync('/');if(stat.bavail*stat.bsize<5*1024**3)throw Error('Disk below 5 GiB');
 const evidence=new Map<string,string>(),hash=(s:string)=>createHash('sha256').update(s).digest('hex');
 let reused=0,missing=0;
 await analyze({only,force:true,
  getBondYield:async cc=>readCorpusJson<{yield:number|null}>(`bonds/${cc}.json`)?.yield??null,
  ask:async args=>{
   const entries=Object.entries(args.sections).filter(([,text])=>Boolean(text?.trim())).sort(([a],[b])=>a.localeCompare(b));
   const cached=readCorpusJson<{version:string;hash:string;answers:JevAnswer[]}>(`jev/${encodeURIComponent(args.id)}.json`);
   const old=readCorpusJson<Analysis>(`analysis/${args.id}.json`);
   const previous=readCorpusJson<{sections:typeof args.sections}>(`analysis/inputs/${args.id}.json`);
   const unchanged=old?.versions.questions===QUESTIONS_VERSION&&JSON.stringify(previous?.sections)===JSON.stringify(args.sections);
   const answers=cached?.version===QUESTIONS_VERSION&&cached.hash===hash(JSON.stringify(entries))?await askCompany(args):unchanged?Object.values(old?.tests??{}).flatMap(t=>t.jev):[];
   if(answers.length)reused++;else missing++;
   for(const a of answers){const section=args.sections[a.section];if(section&&a.evidence)evidence.set(`${hash(section)}:${a.q}`,a.evidence);}
   return answers;
  },
  evidence:async({section,questions})=>Object.fromEntries(Object.keys(questions).map(q=>[q,evidence.get(`${hash(section)}:${q}`)??null])),
 });
 console.log(JSON.stringify({reusedQualitativeReadings:reused,withoutQualitativeReadings:missing}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
