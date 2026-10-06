/** Controller-only, archive-proven restoration. No publication or runner-lock access. */
import {existsSync,readFileSync,mkdirSync,writeFileSync,copyFileSync,renameSync,unlinkSync,lstatSync,statfsSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import recovery from '../../lib/value/logo-restorations.json';
import {iconHash} from '../../lib/value/logo-validation';
import {installLogoBundle} from './install-logos';

type Manifest={version:number;archive:string;entries:{id:string;beforeHash:string;recordHash:string}[];files:Record<string,string>};
function safe(root:string,file:string):string {
 if(path.isAbsolute(file)||file.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Unsafe bundle path');
 const dest=path.resolve(root,file);
 for(let p=dest;;p=path.dirname(p)){
  if(existsSync(p)&&lstatSync(p).isSymbolicLink())throw Error('Refusing symlink: '+file);
  if(p===path.dirname(p))break;
 }
 return dest;
}
function disk(target:string){for(const p of ['/',target]){const d=statfsSync(p);if(d.bavail*d.bsize<4*1024**3)throw Error('DISK STOP: below 4 GiB');}}
export async function installRecoveryBundle(source:string,target:string,{apply,manifestHash}:{apply:boolean;manifestHash:string}) {
 source=realpathSync(source);target=realpathSync(target);
 const manifestBytes=readFileSync(safe(source,'manifest.json'));
 if(iconHash(manifestBytes)!==manifestHash)throw Error('Manifest hash mismatch');
 const manifest:Manifest=JSON.parse(manifestBytes.toString());
 if(manifest.version!==1||manifest.archive!==recovery.archive)throw Error('Unknown recovery evidence');
 for(const [file,hash]of Object.entries(manifest.files))if(iconHash(readFileSync(safe(source,file)))!==hash)throw Error('Bundle file hash mismatch: '+file);
 const changes:{dest:string;bytes:Buffer|null;id:string}[]=[];let preserved=0;const ids=new Set<string>();
 for(const e of manifest.entries){
  if(ids.has(e.id)||!Object.hasOwn(recovery.entries,e.id))throw Error('Invalid recovery ID');ids.add(e.id);
  const file=`records/${e.id}.json`,bytes=readFileSync(safe(source,file)),record=JSON.parse(bytes.toString());
  if(e.recordHash!==manifest.files[file]||iconHash(bytes)!==e.recordHash)throw Error('Record hash mismatch');
  if(!isDeepStrictEqual(record,(recovery.entries as Record<string,{cache:unknown}>)[e.id].cache))throw Error('Record differs from pre-nightly evidence');
  const dest=safe(target,`enrichment-v7/logos/${e.id}.json`),current=existsSync(dest)?readFileSync(dest):null;
  if((!current&&record===null)||(current&&isDeepStrictEqual(JSON.parse(current.toString()),record))){preserved++;continue;}
  if(current&&JSON.parse(current.toString()).logo){preserved++;continue;}
  if(current&&iconHash(current)!==e.beforeHash)throw Error('Target changed since recovery review: '+e.id);
  changes.push({dest,bytes:record===null?null:bytes,id:e.id});
 }
 // All recovery and new approvals pass preflight before any target writes.
 const additions=path.join(source,'additions');
 const additionManifest=JSON.parse(readFileSync(safe(source,'additions/manifest.json'),'utf8'));
 if(!manifest.files['additions/manifest.json'])throw Error('Missing additions manifest hash');
 for(const e of additionManifest.entries){
  const file=`additions/records/${e.id}.json`;
  if(!manifest.files[file])throw Error('Missing addition record hash');safe(source,file);safe(target,`enrichment-v7/logos/${e.id}.json`);
  const r=JSON.parse(readFileSync(path.join(source,file),'utf8'));
  if(r.asset&&r.logo){const f=`additions/assets/${r.asset}.json`;if(!manifest.files[f])throw Error('Missing addition asset hash');safe(source,f);safe(target,`enrichment-v7/logos/assets/${r.asset}.json`);}
 }
 await installLogoBundle(additions,target,{apply:false});
 if(apply){
  disk(target);const backup=path.join(target,'backups',`logo-recovery-${Date.now()}`);
  for(const {dest,bytes,id}of changes){
   disk(target);mkdirSync(path.dirname(dest),{recursive:true});
   if(existsSync(dest)){mkdirSync(backup,{recursive:true});copyFileSync(dest,path.join(backup,id+'.json'));}
   if(bytes){writeFileSync(dest+'.recovery.tmp',bytes,{flag:'wx'});renameSync(dest+'.recovery.tmp',dest);}
   else if(existsSync(dest))unlinkSync(dest);
  }
 }
 const added=await installLogoBundle(additions,target,{apply});
 return {restored:changes.length,preserved,additions:added,applied:apply};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [source,target,flag]=process.argv.slice(2);
 if(!source||!target||(flag&&flag!=='--apply'))throw Error('Usage: install-logo-recovery <bundle> <corpus> [--apply]');
 if(flag==='--apply'&&!/^[1-9]\d*$/.test(process.env.VALUE_DAILY_LOCK_PID??''))throw Error('Apply requires the paused controller runner PID');
 const manifestHash=iconHash(readFileSync(new URL('../../docs/value/logofix-2/bundle-manifest.json',import.meta.url)));
 installRecoveryBundle(path.resolve(source),path.resolve(target),{apply:flag==='--apply',manifestHash}).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1;});
}
