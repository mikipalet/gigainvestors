/** Offline replay into an isolated corpus overlay; never changes research inputs. */
import {existsSync,mkdirSync,readdirSync,readFileSync,writeFileSync,symlinkSync,statfsSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {readCorpusJson} from '../../lib/value/corpus';
import {alignHistoryShares} from '../../lib/value/history-split-basis';
import {completeCachedSplits} from '../../lib/value/completeness/cached-years';
import {readPriceHistory} from '../../lib/value/price-history';
import analyze from './stages/analyze';
import type {Analysis,Fundamentals} from '../../lib/value/types';
const source=path.join(os.homedir(),'value-corpus'),stage=path.resolve('.fix5'),overlay=path.join(stage,'corpus');
const read=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
const write=(file:string,value:unknown)=>{mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,JSON.stringify(value));};
function disk(){const d=statfsSync('/');if(d.bavail*d.bsize<6*1024**3)throw Error('DISK STOP below 6 GiB');}
async function main(){
 process.env.VALUE_NO_EODHD='1';
 disk();mkdirSync(overlay,{recursive:true});
 for(const file of readdirSync(source))if(!['analysis','staging'].includes(file)&&!existsSync(path.join(overlay,file)))symlinkSync(path.join(source,file),path.join(overlay,file));
 mkdirSync(path.join(overlay,'analysis'),{recursive:true});mkdirSync(path.join(overlay,'staging'),{recursive:true});
 for(const file of readdirSync(path.join(source,'analysis')))if(file.endsWith('.json')){const target=path.join(overlay,'analysis',file);if(existsSync(target))unlinkSync(target);symlinkSync(path.join(source,'analysis',file),target);}
 const ds:Record<string,Analysis>=Object.assign({},...readdirSync(path.join(source,'staging/integrate-4/store/dossiers')).map(file=>read(path.join(source,'staging/integrate-4/store/dossiers',file))));
 const changes=[];
 for(const [id,old]of Object.entries(ds)){
  disk();const f=readCorpusJson<Fundamentals>(`fundamentals/${id}.json`);if(!f)continue;
  f.splits=completeCachedSplits(id,f.splits,readCorpusJson);const prices=readPriceHistory(id),fixed=alignHistoryShares(f,prices??[]);
  if(fixed===f)continue;
  const prior=readCorpusJson<Analysis>(`analysis/${id}.json`)!;
  const beforeRoot=process.env.VALUE_CORPUS_DIR;
  process.env.VALUE_CORPUS_DIR=overlay;
  await analyze({only:[id],force:true,ask:async()=>Object.values(prior.tests).flatMap(t=>t.jev),getBondYield:async country=>readCorpusJson<{yield:number}>(`bonds/${country}.json`)?.yield??prior.valuation?.bondYield??null,evidence:async({questions})=>Object.fromEntries(Object.keys(questions).map(q=>[q,Object.values(prior.tests).flatMap(t=>t.jev).find(a=>a.q===q)?.evidence??null]))});
  const result=readCorpusJson<Analysis>(`analysis/${id}.json`)!;
  if(beforeRoot===undefined)delete process.env.VALUE_CORPUS_DIR;else process.env.VALUE_CORPUS_DIR=beforeRoot;
  changes.push({id,name:old.company.name,years:fixed.years.flatMap((y,i)=>y.dilutedShares!==f.years[i].dilutedShares?[{fy:y.fy,before:f.years[i].dilutedShares,after:y.dilutedShares}]:[]),tests:Object.keys(result.tests).flatMap(key=>{const k=key as keyof Analysis['tests'];return old.tests[k].result!==result.tests[k].result?[{test:key,before:old.tests[k].result,after:result.tests[k].result}]:[]})});
 }
 write(path.join(stage,'replay.json'),changes);console.log(JSON.stringify(changes.map(c=>({id:c.id,tests:c.tests}))));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
