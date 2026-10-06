import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {publishedBuyPrice} from '../../lib/value/buy-price';
import type {IndexRow,PriceMap} from '../../lib/value/types';
import approvedChanges from './approved-verdict-changes.json';
import issuerRegistry from '../../lib/value/issuer-registry.json';

type Reader = {files:string[]; read:(file:string)=>any};
function git(repo:string,args:string[]):string {
 return execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:64*1024*1024}).trim();
}
function committed(repo:string,ref:string):Reader|null {
 try{git(repo,['rev-parse','--verify',ref]);}catch{return null;}
 const files=git(repo,['ls-tree','-r','--name-only',ref]).split('\n');
 return {files,read:file=>files.includes(file)?JSON.parse(git(repo,['show',`${ref}:${file}`])):null};
}
const fail=(message:string):never=>{throw new Error(`Publish invariant: ${message}`);};

/** Compare the proposed working tree to the released commit, never to mutable meta counts.
 * Every commit entry point calls this BEFORE staging or creating an orphan branch.
 */
export interface ApprovedVerdictChange {id:string;before:{b:boolean;v:number[]|null;m:number;t?:string};after:{b:boolean;v:number[]|null;m:number;t?:string};reason:string;evidence:string[]}
export function assertPublishInvariants(repo:string,baseline='HEAD',approvals:ApprovedVerdictChange[]=approvedChanges):void {
 const prior=committed(repo,baseline);
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
 const count=(r:Reader)=>r.files.filter(f=>/^dossiers\/\d{3}\.json$/.test(f)).reduce((n,f)=>n+Object.keys(r.read(f)).length,0);
 const before=prior?count(prior):0,after=count(current);
 const dossierIds=(r:Reader)=>new Set(r.files.filter(f=>/^dossiers\/\d{3}\.json$/.test(f)).flatMap(f=>Object.keys(r.read(f))));
 const oldIds=prior?dossierIds(prior):new Set<string>(),newIds=dossierIds(current);
 for(const group of issuerRegistry.groups){
  const present=group.ids.filter(id=>newIds.has(id));
  if(present.length>1)fail(`duplicate issuer: ${present.join(', ')}`);
 }
 const aliases:Record<string,string>=current.read('aliases.json')??{};
 for(const [id,target]of Object.entries(aliases))if(id===target||aliases[target]||!newIds.has(target)||newIds.has(id))fail(`invalid issuer alias ${id} -> ${target}`);
 const aliasedRemovals=[...oldIds].filter(id=>!newIds.has(id)&&aliases[id]&&newIds.has(aliases[id])).length;
 if(after+aliasedRemovals<before*.99)fail(`dossier count dropped more than 1% (${before} -> ${after})`);
 if(!prior)return;
 const prices=(r:Reader):PriceMap=>Object.assign({},...r.files.filter(f=>/^prices\/[A-Z]{2}\.json$/.test(f)).map(f=>r.read(f)));
 const oldPrices=prices(prior),newPrices=prices(current);
 for(const file of prior.files.filter(f=>/^index\/(?:default|[A-Z]{2})\.json$/.test(f)))for(const row of prior.read(file)??[])oldIds.add(row.id);
 // Check the default index and every country separately, so offsetting country
 // losses cannot hide in the global total. Analysis changes need explicit review.
 const indexes=new Set([...prior.files,...current.files].filter(f=>/^index\/(?:default|[A-Z]{2})\.json$/.test(f)));
 for(const file of indexes){
  const oldRows:IndexRow[]=prior.read(file)??[],newRows:IndexRow[]=current.read(file)??[];
  const oldBuys=oldRows.filter(r=>r.b).length,newBuys=newRows.filter(r=>r.b).length;
  let increases=0,decreases=0;
  const reviewed=new Set<string>();
  for(const approval of approvals){
   if(!approval.reason?.trim()||!approval.evidence?.length||approval.evidence.some(url=>!/^https:\/\//.test(url)))fail('Invalid approved verdict change');
   const old=oldRows.find(r=>r.id===approval.id),next=newRows.find(r=>r.id===approval.id);
   // A method approval binds both quality masks; older balance approvals
   // still require quality to remain unchanged. Partial bindings fail closed.
   const masksBound=approval.before.t!==undefined&&approval.after.t!==undefined;
   const state=(r:IndexRow)=>({b:r.b,v:r.v,m:r.m,...(masksBound?{t:r.t}:{})});
   if(!old||!next||(!masksBound&&old.t!==next.t)||!isDeepStrictEqual(state(old),approval.before)||!isDeepStrictEqual(state(next),approval.after))continue;
   if(reviewed.has(approval.id))fail('Duplicate approved verdict change');
   reviewed.add(approval.id);
   if(next.b&&!old.b)increases++;if(old.b&&!next.b)decreases++;
  }
  for(const row of oldRows){
   if(reviewed.has(row.id))continue;
   // A retired quote cannot explain a verdict change in a surviving dossier.
   if(!newIds.has(row.id)&&aliases[row.id])continue;
   const next=newRows.find(r=>r.id===row.id);
   const priceExplains=!isDeepStrictEqual(oldPrices[row.id],newPrices[row.id])
     && publishedBuyPrice(row,oldPrices[row.id]).b===row.b
     && publishedBuyPrice(row,newPrices[row.id]).b===next?.b;
   if(next&&row.b!==next.b&&!priceExplains)fail(`${file} Buy-now changed for unapproved ${row.id}`);
   if(isDeepStrictEqual(oldPrices[row.id],newPrices[row.id]))continue;
   const change=Number(publishedBuyPrice(row,newPrices[row.id]).b)-Number(publishedBuyPrice(row,oldPrices[row.id]).b);
   if(change>0)increases++;if(change<0)decreases++;
  }
  const delta=newBuys-oldBuys;
  const addedBuys=newRows.filter(row=>row.b&&!oldIds.has(row.id)&&newIds.has(row.id)).length;
  const removedBuys=oldRows.filter(row=>row.b&&!newIds.has(row.id)&&aliases[row.id]&&newIds.has(aliases[row.id])).length;
  if(delta>increases+addedBuys||delta < -decreases-removedBuys)fail(`${file} Buy-now changed ${oldBuys} -> ${newBuys}; prices and new dossiers explain at most +${increases+addedBuys}/-${decreases}`);
 }
}
