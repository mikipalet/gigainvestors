/** Controller-only corpus handoff; dry-run is the default. Never publishes. */
import {existsSync,readFileSync,mkdirSync,writeFileSync,copyFileSync,statfsSync,renameSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {iconHash,LOGO_VALIDATION_VERSION,rejectedLogoHashes} from '../../lib/value/logo-validation';

export async function installLogoBundle(source:string,target:string,{apply}:{apply:boolean}){
 const read=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
 const manifest=read(path.join(source,'manifest.json')) as {entries:{id:string;recordHash:string}[]};
 const writes:{file:string;bytes:Buffer}[]=[];let installed=0,preserved=0;
 const ids=new Set<string>();
 for(const entry of manifest.entries){
  if(!/^[\w.&-]+\.[A-Z]+$/.test(entry.id)||ids.has(entry.id))throw Error('Invalid or duplicate logo ID');ids.add(entry.id);
  const bytes=readFileSync(path.join(source,'records',entry.id+'.json'));
  if(iconHash(bytes)!==entry.recordHash)throw Error(`Record hash mismatch: ${entry.id}`);
  const record=JSON.parse(bytes.toString()),rejected=rejectedLogoHashes(entry.id);
  if(record.logo){
   if(!['approved','passed'].includes(record.identityReview)||!record.validated||record.validationVersion!==LOGO_VALIDATION_VERSION||!/^[a-f0-9]{64}$/.test(record.asset)||record.logo!==`/api/value/logo?asset=${record.asset}`||rejected.has(record.asset)||rejected.has(record.originalHash))throw Error(`Unapproved logo: ${entry.id}`);
   const file=`enrichment-v7/logos/assets/${record.asset}.json`,assetBytes=readFileSync(path.join(source,'assets',record.asset+'.json'));
   const image=Buffer.from(JSON.parse(assetBytes.toString()).data,'base64');
   if(iconHash(image)!==record.asset)throw Error(`Asset hash mismatch: ${entry.id}`);
   await sharp(image,{limitInputPixels:16_000_000}).raw().toBuffer();
   const dest=path.join(target,file);
   if(existsSync(dest)){if(iconHash(Buffer.from(read(dest).data,'base64'))!==record.asset)throw Error(`Existing asset hash mismatch: ${entry.id}`);}
   else writes.push({file,bytes:assetBytes});
  }else if(record.logo!==null||!record.fallbackReason)throw Error(`Unexplained fallback: ${entry.id}`);
  const file=`enrichment-v7/logos/${entry.id}.json`,dest=path.join(target,file);
  if(existsSync(dest)&&(read(dest).logo||readFileSync(dest).equals(bytes))){preserved++;continue;}
  writes.push({file,bytes});installed++;
 }
 // Validate the complete bundle before touching any target file.
 if(apply){
  const backup=path.join(target,'backups',`logos-${Date.now()}`);
  for(const {file,bytes}of writes){
   for(const dir of ['/',target]){const d=statfsSync(dir);if(d.bavail*d.bsize<4*1024**3)throw Error('DISK STOP: below 4 GiB');}
   const dest=path.join(target,file);mkdirSync(path.dirname(dest),{recursive:true});
   if(existsSync(dest)){
    if(file.includes('/assets/'))continue;
    const old=path.join(backup,file);mkdirSync(path.dirname(old),{recursive:true});copyFileSync(dest,old);
   }
   writeFileSync(dest+'.logo-install.tmp',bytes,{flag:'wx'});renameSync(dest+'.logo-install.tmp',dest);
  }
 }
 return {installed,preserved,files:writes.length,applied:apply};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [source,target,flag]=process.argv.slice(2);
 if(!source||!target||(flag&&flag!=='--apply'))throw Error('Usage: install-logos <bundle> <corpus> [--apply]');
 if(flag==='--apply'&&!/^[1-9]\d*$/.test(process.env.VALUE_DAILY_LOCK_PID??''))throw Error('Apply only through controller with-daily-lock.sh');
 installLogoBundle(path.resolve(source),path.resolve(target),{apply:flag==='--apply'}).then(result=>console.log(JSON.stringify(result))).catch(e=>{console.error(e.message);process.exitCode=1;});
}
