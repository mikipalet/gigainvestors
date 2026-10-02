import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {humanVerdict} from '../../lib/value/judgement/apply';
import {assertDossierConsistency} from '../../lib/value/consistency';
import type {Dossier,PriceMap} from '../../lib/value/types';
const [stage='.fix5',before='/Users/miki/value-corpus/staging/integrate-4/store']=process.argv.slice(2);
const shard=(dir:string):Record<string,any>=>Object.assign({},...readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(path.join(dir,f),'utf8'))));
const ds=shard(stage+'/store/dossiers') as Record<string,Dossier>,old=shard(before+'/dossiers') as Record<string,Dossier>;
const prices=shard(stage+'/store/prices') as PriceMap,oldPrices=shard(before+'/prices') as PriceMap;
const failures:string[]=[],changes:any[]=[],templates:Record<string,number>={};
let memoWindowsChecked=0;
const ratio=(d:Dossier,q:PriceMap[string]|undefined)=>{const v=d.valuation?.perShareTrading??d.valuation?.perShare;return v&&v.mid>0&&q?q[0]/v.mid:null;};
const verdict=(d:Dossier,q:PriceMap[string]|undefined)=>humanVerdict(d,!!d.b,ratio(d,q)!==null,ratio(d,q));
for(const d of Object.values(ds)){
 const r=ratio(d,prices[d.id]),v=verdict(d,prices[d.id]);templates[v]=(templates[v]??0)+1;
 try{assertDossierConsistency(d,prices[d.id]);}catch(e){failures.push(`${d.id}: ${(e as Error).message}`);}
 if(v.includes('assumes a lot')&&!(r!==null&&r>1))failures.push(d.id+': expensive wording below value');
 if(v.startsWith('Near fair value')&&!(r!==null&&r<=1&&!d.b))failures.push(d.id+': fair-value wording above value');
 const customer=d.ownerMemo?.lines.find(l=>l.question===2&&l.basis==='computed');
 const window=customer?.answer.match(/during (\d{4})–(\d{2})/);
 if(window){memoWindowsChecked++;if(Number(window[1].slice(0,2)+window[2])!==d.historyCoverage?.last)failures.push(d.id+': memo fiscal window differs from published analysis');}
 if(v.startsWith('Near fair value')&&v.split(/\s+/).length>9)failures.push(d.id+': verdict too long');
 const prior=old[d.id];if(!prior)continue;
 const tests=Object.keys(d.tests).flatMap(k=>{const key=k as keyof Dossier['tests'],test=d.tests[key];return test&&prior.tests[key]?.result!==test.result?[{test:k,before:prior.tests[key]?.result,after:test.result}]:[]});
 const changedTests=Object.keys(d.tests).filter(k=>JSON.stringify(prior.tests[k as keyof Dossier['tests']])!==JSON.stringify(d.tests[k as keyof Dossier['tests']]));
 const oldVerdict=(()=>{if(prior.thesis?.changed)return 'Good numbers, but the business is changing';const quality=Object.values(prior.tests).filter(t=>t.key!=='price');if(quality.some(t=>t.result==='fail'))return 'The business still has something to prove';if(!quality.every(t=>t.result==='pass'))return 'Still getting to know this business';if(ratio(prior,oldPrices[d.id])===null)return 'A strong business; the price needs a closer look';return prior.b?'A wonderful business at a fair price':'Great business, but the price already assumes a lot';})();
 if(changedTests.length||v!==oldVerdict||!!d.b!==!!prior.b)changes.push({id:d.id,name:d.company.name,tests,changedTests,buy:{before:!!prior.b,after:!!d.b},verdict:{before:oldVerdict,after:v}});
}
const report={memoWindowsChecked,published:Object.keys(ds).length,removed:Object.keys(old).filter(id=>!ds[id]),added:Object.keys(ds).filter(id=>!old[id]),failures,templates,changes};
writeFileSync(stage+'/universe-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(failures.length)process.exitCode=1;
