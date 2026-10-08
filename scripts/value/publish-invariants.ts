import {assertCoverage,committedArchive,critical} from './publication-coverage';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import path from 'node:path';
import issuerRegistry from '../../lib/value/issuer-registry.json';

type Reader = {files:string[]; read:(file:string)=>any};
function git(repo:string,args:string[]):string {
 return execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:64*1024*1024}).trim();
}
function committed(repo:string,ref:string):Reader|null {
 if(!existsSync(path.join(repo,'.git')))return null;
 try{git(repo,['rev-parse','--verify',ref]);}catch{return null;}
 return committedArchive(repo,ref);
}
const fail=(message:string):never=>{throw new Error(`Publish invariant: ${message}`);};

/** Compare the proposed working tree to the released commit, never to mutable meta counts.
 * Every commit entry point calls this BEFORE staging or creating an orphan branch.
 */
export function assertPublishInvariants(repo:string,baseline='HEAD'):ReturnType<typeof assertCoverage>|undefined {
 if(baseline==='HEAD'&&committed(repo,'origin/main'))baseline='origin/main';
 const prior=committed(repo,baseline);
 if(!prior&&existsSync(path.join(repo,'.git'))&&committed(repo,'HEAD'))critical('previous published archive missing');
 const coverage=prior?assertCoverage(repo,baseline):undefined;
 const files=['meta.json',...['index','dossiers','prices','history'].flatMap(dir=>existsSync(path.join(repo,dir))?readdirSync(path.join(repo,dir)).map(f=>`${dir}/${f}`):[])];
 const current:Reader={files,read:file=>existsSync(path.join(repo,file))?JSON.parse(readFileSync(path.join(repo,file),'utf8')):null};
 const meta=current.read('meta.json');
 if(!meta)fail('meta.json missing');
 const history=current.read('history/index.json');
 const previousHistory=prior?.read('history/index.json');
 for(const [kind,deferred]of [['quarters','quarterDeferred'],['years','yearDeferred']] as const){
  const required=new Set([...(history?.[kind]??[]),...(previousHistory?.[kind]??[]),...Object.keys(prior?.read('meta.json')?.views?.[kind]??{})].map(String));
  if(Object.keys(meta.views?.[kind]??{}).length<(history?.[kind]?.length??0))fail(`views.${kind} count is below history/index`);
  for(const period of required){
   // The builder aliases Q4 into the year picker even for quarter-only stores.
   // A previously released annual snapshot still must remain in its own right.
   const annualAlias=kind==='years'&&!previousHistory?.years?.map(String).includes(period)
    &&!history?.years?.map(String).includes(period)&&history?.quarters?.includes(`${period}Q4`);
   if(!history?.[kind]?.map(String).includes(period)&&!annualAlias)fail(`history/index lost ${period}`);
   if(!meta.views?.[kind]?.[period]||!Array.isArray(meta.views?.[deferred]?.[period]))fail(`views lost ${kind}/${period} or its deferred view`);
   if(!existsSync(path.join(repo,`history/${period}${annualAlias?'Q4':''}.json`)))fail(`history file missing: ${period}`);
  }
 }
 const checkRefs=(value:unknown):void=>{
  if(typeof value==='string'){
   if(!/^views\/[a-f0-9]{24}\.json$/.test(value)||!existsSync(path.join(repo,value))||!statSync(path.join(repo,value)).isFile())fail(`view references missing or invalid file: ${value}`);
   try{JSON.parse(readFileSync(path.join(repo,value),'utf8'));}catch{fail(`unreadable view: ${value}`);}
  }else if(value&&typeof value==='object')for(const item of Object.values(value))checkRefs(item);
  else fail('invalid view reference');
 };
 if(meta.views)checkRefs(meta.views);
 const dossierIds=(r:Reader)=>new Set(r.files.filter(f=>/^dossiers\/\d{3}\.json$/.test(f)).flatMap(f=>Object.keys(r.read(f))));
 const newIds=dossierIds(current);
 for(const group of issuerRegistry.groups){
  const present=group.ids.filter(id=>newIds.has(id));
  if(present.length>1)fail(`duplicate issuer: ${present.join(', ')}`);
 }
 const aliases:Record<string,string>=current.read('aliases.json')??{};
 for(const [id,target]of Object.entries(aliases))if(id===target||aliases[target]||!newIds.has(target)||newIds.has(id))fail(`invalid issuer alias ${id} -> ${target}`);

 return coverage;
}
