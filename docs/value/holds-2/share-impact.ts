/** Paired, offline replay. Both algorithms see the same copied live inputs. */
import {readFileSync,readdirSync,existsSync,copyFileSync,mkdirSync,writeFileSync,statfsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as same} from 'node:util';
import {applyShareCheck,reconcileShares,type ShareCheck} from '../../../lib/value/share-check';
import {applyShareCheck as oldApply,reconcileShares as oldReconcile} from './prior-share-check';
import {buildOutput} from '../../../lib/value/build-output';
import {publicationCapitalization} from '../../../lib/value/publication-capitalization';
import issuerShares from '../../../lib/value/issuer-share-observations.json';
import {createUsdRate} from '../../../lib/value/fx';
import {applyThesis} from '../../../lib/value/thesis/apply';
import type {Analysis,Dossier} from '../../../lib/value/types';
const base=path.join(os.homedir(),'data/value-holds'),root=path.join(base,'scratch/impact'),live=path.join(os.homedir(),'value-corpus');
const read=(p:string)=>JSON.parse(readFileSync(path.join(root,p),'utf8'));
const optional=(p:string)=>existsSync(path.join(root,p))?read(p):null;
const sha=(p:string)=>createHash('sha256').update(readFileSync(path.join(root,p))).digest('hex');
const dossiers:Record<string,Dossier>=Object.assign({},...readdirSync(path.join(root,'publish-repo/dossiers')).filter(f=>f.endsWith('.json')).map(f=>read('publish-repo/dossiers/'+f)));
const prices=Object.assign({},...readdirSync(path.join(root,'publish-repo/prices')).filter(f=>/^[A-Z]{2}\.json$/.test(f)).map(f=>read('publish-repo/prices/'+f)));
const fx=Object.fromEntries(readdirSync(path.join(root,'raw/eodhd/universe')).filter(f=>/^fx-[A-Z]{3}\.json$/.test(f)).map(f=>[f.slice(3,6),read('raw/eodhd/universe/'+f).data?.[0]?.close]));
const rate=createUsdRate({rates:fx});
const release=read('held-membership/release.json'),frozen=new Set(read('verdict-freeze.json').ids);
const view=(d:Dossier|undefined)=>d?{b:d.b,status:d.status,tests:Object.fromEntries(Object.entries(d.tests).map(([k,t])=>[k,{result:t.result,metrics:k==='price'?t.metrics:undefined}])),valuation:d.valuation,flags:d.dataQualityFlags,priceTestFreeze:d.priceTestFreeze}:null;
const changes:any[]=[],allChecks:any[]=[],inputHashes=readFileSync(path.join(base,'evidence/holds-2/impact-input-hashes.json'),'utf8');
for(const [id,prior] of Object.entries(dossiers).sort(([a],[b])=>a.localeCompare(b))){
 const check=optional(`enrichment-v7/share-checks/${id}.json`) as ShareCheck|null,a=optional(`analysis/${id}.json`) as Analysis|null;
 if(!check||!a){allChecks.push({id,hasCheck:!!check,hasAnalysis:!!a});continue;}
 const old=oldApply(structuredClone(a),check),next=applyShareCheck(structuredClone(a),check);
 const rec=reconcileShares(check.observations),oldRec=oldReconcile(check.observations);
 allChecks.push({id,old:check.status,oldShares:check.shares,next:rec.status,nextShares:rec.shares,valuationChanged:!same(old.valuation,next.valuation)});
 if(same(old.valuation,next.valuation))continue;
 for(const v of ['/',base]){const s=statfsSync(v);if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP: commit');}
 for(const rel of [`raw/eodhd/${id}.json`,`thesis/${id}.json`])if(existsSync(path.join(live,rel))){mkdirSync(path.dirname(path.join(root,rel)),{recursive:true});copyFileSync(path.join(live,rel),path.join(root,rel));}
 const raw=optional(`raw/eodhd/${id}.json`),f=optional(`fundamentals/${id}.json`),thesis=optional(`thesis/${id}.json`);
 const render=(analysis:Analysis)=>{
  analysis=applyThesis(analysis,thesis);
  const cap=publicationCapitalization(analysis,raw,prices[id],rate(analysis.company.currency),f?.splits,(issuerShares as any[]).filter(o=>o.id===id));
  const {files}=buildOutput({analyses:[cap.analysis],prices,fx,holdersByTicker:{},investorNames:{},previousDossiers:{[id]:prior},capShares:cap.capShares?{[id]:cap.capShares}:{}});
  const dossier=Object.entries(files).filter(([name])=>name.startsWith('dossiers/')).flatMap(([,data])=>Object.values(data as Record<string,Dossier>)).find(d=>d.id===id);
  return {dossier,capitalization:cap.evidence};
 };
 const before=render(old),after=render(next);
 const unchangedBaseline=release.baselineIds.includes(id)&&release.baselineAnalysisHashes[id]===sha(`analysis/${id}.json`);
 const freeze=frozen.has(id)?'explicit-verdict-freeze':unchangedBaseline?'unchanged-coverage-baseline':null;
 const summary=(d:Dossier|undefined)=>({b:d?.b??null,price:d?.tests.price?.result??null,mid:d?.valuation?.perShareTrading?.mid??d?.valuation?.perShare.mid??null,shares:d?.valuation?.shares??null});
 const verdictChanged=!same(summary(before.dossier).b,summary(after.dossier).b)||!same(summary(before.dossier).price,summary(after.dossier).price);
 const liveChanged=!same(summary(prior).b,summary(after.dossier).b)||!same(summary(prior).price,summary(after.dossier).price);
 changes.push({id,freeze,effectiveNextNightly:freeze?summary(prior):summary(after.dossier),live:summary(prior),old:summary(before.dossier),next:summary(after.dossier),algorithmVerdictChanged:verdictChanged,liveVerdictChanged:!freeze&&liveChanged,requiresControllerApproval:verdictChanged||(!freeze&&liveChanged),check,oldReconciliation:oldRec,newReconciliation:rec,inputHashes:{analysis:sha(`analysis/${id}.json`),check:sha(`enrichment-v7/share-checks/${id}.json`),...(raw?{raw:sha(`raw/eodhd/${id}.json`)}:{})},modelBefore:old.valuation,modelAfter:next.valuation,before:view(before.dossier),after:view(after.dossier),capitalization:after.capitalization});
}
const result={at:new Date().toISOString(),scope:'Copied LIVE dossier IDs only; paired current-cached-input replay, no assumed new quotes or future provider responses. Explicit freeze and coverage preservation applied separately.',liveCount:Object.keys(dossiers).length,checks:allChecks.length,changedValuations:changes.length,effectiveChanges:changes.filter(c=>!c.freeze).length,heldChanges:changes.filter(c=>c.freeze).length,algorithmVerdictFlips:changes.filter(c=>c.algorithmVerdictChanged).map(c=>c.id),controllerApproval:changes.filter(c=>c.requiresControllerApproval).map(c=>c.id),changes};
writeFileSync(path.join(base,'evidence/holds-2/share-impact.json'),JSON.stringify(result,null,2)+'\n');
writeFileSync(path.join(base,'evidence/holds-2/share-impact-inventory.json'),JSON.stringify(allChecks,null,2)+'\n');
const {changes:_,...summary}=result;console.log(JSON.stringify(summary));
