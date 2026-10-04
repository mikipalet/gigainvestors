import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { redis } from '@/lib/newsletter/redis';

export type SavedResponse={status:number;body:string;headers:Record<string,string>};
export type JournalEntry={fingerprint:string;state:'pending'|'complete'|'uncertain';response?:SavedResponse;usage?:import('./usage').Usage;logged?:boolean};
export interface Journal {
 read(key:string):Promise<JournalEntry|null>;
 claim(key:string,entry:JournalEntry):Promise<boolean>;
 save(key:string,entry:JournalEntry):Promise<void>;
 release(key:string):Promise<void>;
}
/** Exclusive create + atomic rename. For one shared local filesystem only. */
export class LocalJournal implements Journal {
 constructor(private directory:string){}
 private file(key:string){if(!/^[a-f0-9]{64}$/.test(key))throw Error('Invalid journal key');return path.join(this.directory,key+'.json');}
 async read(key:string){try{return JSON.parse(await readFile(this.file(key),'utf8')) as JournalEntry;}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}}
 async claim(key:string,entry:JournalEntry){await mkdir(this.directory,{recursive:true});try{await writeFile(this.file(key),JSON.stringify(entry),{flag:'wx',mode:0o600});return true;}catch(e){if((e as NodeJS.ErrnoException).code==='EEXIST')return false;throw e;}}
 async save(key:string,entry:JournalEntry){const file=this.file(key),temporary=file+'.'+randomUUID();await writeFile(temporary,JSON.stringify(entry),{mode:0o600});await rename(temporary,file);}
 async release(key:string){const {unlink}=await import('node:fs/promises');await unlink(this.file(key));}
}
/** No automatic expiry: an uncertain settlement must never become a new charge. */
export class RedisJournal implements Journal {
 constructor(private prefix:string){}
 async read(key:string){const value=await (await redis()).get(this.prefix+key);return value?JSON.parse(value) as JournalEntry:null;}
 async claim(key:string,entry:JournalEntry){return await (await redis()).set(this.prefix+key,JSON.stringify(entry),{NX:true})==='OK';}
 async save(key:string,entry:JournalEntry){await (await redis()).set(this.prefix+key,JSON.stringify(entry));}
 async release(key:string){await (await redis()).del(this.prefix+key);}
}
export function paymentJournal():Journal {
 if(process.env.REDIS_URL)return new RedisJournal(`agent-api:v1:${process.env.VERCEL_ENV??'local'}:${process.env.X402_NETWORK??'eip155:84532'}:${process.env.X402_PAY_TO?.toLowerCase()}:`);
 if(process.env.VERCEL)throw Error('Shared REDIS_URL is required for payments on Vercel');
 return new LocalJournal(process.env.X402_LOCAL_DIR??path.join(process.cwd(),'.agent-api','payments'));
}
