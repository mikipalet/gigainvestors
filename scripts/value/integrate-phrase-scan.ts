import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {gapWording} from '../../lib/value/public-analysis';
import {validMemoLine} from '../../lib/value/business/memo-validation';
import type {Dossier} from '../../lib/value/types';
const [store,out]=process.argv.slice(2);
const dossiers:Dossier[]=readdirSync(path.join(store,'dossiers')).filter(f=>f.endsWith('.json')).flatMap(f=>Object.values(JSON.parse(readFileSync(path.join(store,'dossiers',f),'utf8'))));
const hits:Array<{id:string;text:string}>=[],missingPrice:string[]=[];
for(const d of dossiers){
 const lines=d.ownerMemo?.lines??[];
 if(!lines.some(l=>l.question===7))missingPrice.push(d.id);
 const prose=[lines.length<=2?d.company.description??'':'',...lines.map(l=>l.answer),...Object.values(d.tests).flatMap(t=>t.reasons)];
 for(const text of prose)if(gapWording.test(text)||/\bverify\b|being checked/i.test(text))hits.push({id:d.id,text});
 for(const l of lines)if(!validMemoLine(l))hits.push({id:d.id,text:l.answer});
}
const report={dossiers:dossiers.length,missingPrice,hits};writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(hits.length||missingPrice.length)process.exitCode=1;
