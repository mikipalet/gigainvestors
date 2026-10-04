/** Full offline staging publication, with the released verdict freeze. */
import {existsSync,mkdirSync,readdirSync,readFileSync,cpSync,statfsSync,writeFileSync,realpathSync,rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {publishSnapshot} from './stages/publish';
import {assertPublishInvariants} from './publish-invariants';
import {assertDossierConsistency} from '../../lib/value/consistency';
import type {Dossier} from '../../lib/value/types';
const stage=path.resolve('.ttm-1'),corpus=path.join(stage,'corpus'),live=path.join(os.homedir(),'value-corpus','publish-repo'),out=path.join(stage,'store');
process.env.VALUE_CORPUS_DIR=corpus;process.env.VALUE_NO_EODHD='1';
globalThis.fetch=async()=>{throw Error('Offline LTM publication: network forbidden');};
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const disk=()=>{const s=statfsSync('/');if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP: commit work and stop (less than 4 GiB free)');};
function main(){
 disk();for(const dir of [corpus,path.join(corpus,'staging')])if(realpathSync(dir)!==dir)throw Error('Private staging directory required');
 if(existsSync(path.join(out,'.git')))throw Error('Staging output cannot be a git checkout');
 mkdirSync(out,{recursive:true});if(realpathSync(out)!==out)throw Error('Private staging output required');
 const old:Record<string,Dossier>=Object.assign({},...readdirSync(path.join(live,'dossiers')).filter(f=>f.endsWith('.json')).map(f=>read(path.join(live,'dossiers',f))));
 const analyses=Object.keys(old).map(id=>read(path.join(corpus,'analysis',id+'.json')) as Dossier);
 const holdersByTicker:Record<string,string[]>={},investorNames:Record<string,string>={};
 for(const d of analyses){for(const h of d.holders)investorNames[h.code]=h.name;for(const id of [d.id,...d.company.listings].filter(id=>id.endsWith('.US')))holdersByTicker[id.slice(0,-3).replaceAll('-','.')]=d.holders.map(h=>h.code);}
 cpSync(path.join(live,'prices'),path.join(out,'prices'),{recursive:true});
 // Rebuild this private preview from the released forward archive. Otherwise
 // an earlier local experiment's immutable same-day record survives reruns.
 const forward=path.join(out,'forward');
 if(existsSync(forward)){if(realpathSync(forward)!==forward)throw Error('Private forward staging directory required');rmSync(forward,{recursive:true});}
 if(existsSync(path.join(live,'forward')))cpSync(path.join(live,'forward'),path.join(out,'forward'),{recursive:true});
 const result=publishSnapshot({repo:out,previousDossiers:path.join(live,'dossiers'),analyses,universe:analyses.map(d=>d.company),holdersByTicker,investorNames,partial:false,force:true,commit:false});
 // This directory is inside the application worktree, not the data repository.
 // HEAD would resolve to the application commit and falsely compare zero buys.
 // Run the structural invariants here; the explicit live diff below is the
 // reviewed analysis-change baseline (the normal price-only guard is unchanged).
 disk();assertPublishInvariants(out,'ltm-staging-without-data-git-baseline');
 const next:Record<string,Dossier>=Object.assign({},...readdirSync(path.join(out,'dossiers')).filter(f=>f.endsWith('.json')).map(f=>read(path.join(out,'dossiers',f))));
 const changes=Object.keys(old).flatMap(id=>Object.keys(old[id].tests).flatMap(key=>{
  const before=old[id].tests[key as keyof Dossier['tests']]?.result,after=next[id]?.tests[key as keyof Dossier['tests']]?.result;
  return before!==after?[{id,test:key,before,after}]:[];
 }));
 const companyVerdicts=Object.keys(old).flatMap(id=>{
  const quality=(d:Dossier)=>Object.values(d.tests).every(t=>t.result==='pass');
  const before={quality:quality(old[id]),buy:old[id].b??false},after={quality:quality(next[id]),buy:next[id].b??false};
  return JSON.stringify(before)!==JSON.stringify(after)?[{id,before,after}]:[];
 });
 const prices=Object.assign({},...readdirSync(path.join(out,'prices')).filter(f=>f.endsWith('.json')).map(f=>read(path.join(out,'prices',f))));
 const consistency=Object.values(next).map(d=>assertDossierConsistency(d,prices[d.id]));
 const freeze=read(path.join(corpus,'verdict-freeze.json'));
 const frozenDifferences=freeze.ids.filter((id:string)=>JSON.stringify(old[id])!==JSON.stringify(next[id]));
 if(frozenDifferences.length)throw Error('Verdict freeze changed: '+frozenDifferences.join(', '));
 writeFileSync(path.join(stage,'publish-diff.json'),JSON.stringify({result,before:Object.keys(old).length,after:Object.keys(next).length,frozen:freeze.ids.length,freezeIds:freeze.ids,frozenDifferences,changes,companyVerdicts,consistency:{companies:consistency.length,rules:consistency.reduce((n,c)=>n+c.rules,0),returns:consistency.filter(c=>c.returnChecked).length}},null,2));
 console.log(JSON.stringify({out,...result,changes:changes.length,frozen:freeze.ids.length}));
}
try{main();}catch(e){console.error(e instanceof Error?e.message:'Staging publish failed');process.exitCode=1;}
