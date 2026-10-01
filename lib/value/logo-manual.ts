import {readFileSync} from 'node:fs';
import {corpusPath} from './corpus';
import {stageBrand} from './logo-deep';
import type {LogoAttempt} from './logo-discovery';
export interface ManualLogo {file?:string;url?:string;source:string;note?:string}
/** Controller-reviewed identity; image decoding and safety checks remain mandatory. */
export async function resolveManualLogo(entry:ManualLogo,request:typeof fetch,hashes:Set<string>,read:(file:string)=>Buffer=(file:string)=>readFileSync(corpusPath('logo-manual',file))){
 if(!entry.source||(!entry.url&&!entry.file))return null;
 if(entry.file&&!/^[A-Za-z0-9._-]+\.png$/.test(entry.file))return null;
 if(entry.url&&!/^https:\/\//.test(entry.url))return null;
 const attempts:LogoAttempt[]=[];
 try{
  const url=entry.url??`manual:${entry.file}`;
  const result=await stageBrand({url,page:url,source:'manual',...(entry.file?{bytes:read(entry.file)}:{})},(input,init)=>request(input,{...init,headers:{...init?.headers,'User-Agent':'Mozilla/5.0'}}),hashes,attempts);
  return result?{...result,attempts,identityReview:'approved',provenance:{...entry}}:null;
 }catch{return null;}
}
