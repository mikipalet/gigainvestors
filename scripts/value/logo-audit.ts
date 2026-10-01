/** Verify cache bytes through the real same-origin handler using a temporary store.
 * Reads the real corpus; never runs analysis or publication. */
import {mkdtempSync,mkdirSync,linkSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {GET} from '../../app/api/value/logo/route';
import {corpusPath,readCorpusJson} from '../../lib/value/corpus';
import {iconHash,REJECTED_LOGO_HASHES,LOGO_VALIDATION_VERSION} from '../../lib/value/logo-validation';
import {checkLogoDisk} from '../../lib/value/logo-fetch';
import {publishedLogoRows} from './stages/logos';

async function main(){
 checkLogoDisk();
 const directory=mkdtempSync(path.join(os.tmpdir(),'value-logo-audit-'));
 const previous=process.env.VALUE_STORE_DIR;
 const failures:{id:string;error:string}[]=[],assets=new Set<string>(),missing:string[]=[],pending:string[]=[];
 let covered=0;
 try{
  mkdirSync(path.join(directory,'logos'));process.env.VALUE_STORE_DIR=directory;
  for(const row of publishedLogoRows()){
   const record=readCorpusJson<any>(`enrichment-v7/logos/${row.id}.json`);
   if(record?.identityReview==='pending')pending.push(row.id);
   if(!record?.logo){missing.push(row.id);continue;}
   try{
    if(record.validationVersion!==LOGO_VALIDATION_VERSION||record.identityReview==='pending')throw Error('Not validated');
    if(REJECTED_LOGO_HASHES.has(record.originalHash)||REJECTED_LOGO_HASHES.has(record.asset))throw Error('Rejected default or unrelated image');
    if(record.logo!==`/api/value/logo?asset=${record.asset}`)throw Error('Not an immutable same-origin URL');
    if(!assets.has(record.asset)){
     const source=corpusPath(`enrichment-v7/logos/assets/${record.asset}.json`);
     linkSync(source,path.join(directory,'logos',record.asset+'.json'));
     const response=await GET(new Request('https://value.example'+record.logo));
     if(response.status!==200||response.headers.get('content-type')!=='image/webp')throw Error('Same-origin route failed');
     const bytes=Buffer.from(await response.arrayBuffer());
     if(iconHash(bytes)!==record.asset)throw Error('Asset hash mismatch');
     const input=sharp(bytes),meta=await input.metadata();
     if(Math.max(meta.width??0,meta.height??0)<64)throw Error('Undersized served image');
     if(record.identityReview==='passed'&&(meta.width!==128||meta.height!==128))throw Error('New brand asset lacks square padding');
     await input.raw().toBuffer();assets.add(record.asset);
    }
    covered++;
   }catch(error){failures.push({id:row.id,error:String(error)});}
  }
 }finally{
  if(previous===undefined)delete process.env.VALUE_STORE_DIR;else process.env.VALUE_STORE_DIR=previous;
  rmSync(directory,{recursive:true,force:true});
 }
 console.log(JSON.stringify({covered,uniqueAssets:assets.size,missing,pending,failures},null,2));
 if(failures.length)process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
