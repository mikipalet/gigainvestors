import dotenv from 'dotenv';
import path from 'node:path';
import {existsSync,mkdirSync} from 'node:fs';
import {corpusPath} from '../../lib/value/corpus';
dotenv.config({path:'.env.local',quiet:true});
dotenv.config({path:corpusPath('.env.local'),quiet:true});
async function main(){
 const repo=corpusPath('publish-repo');
 if(!existsSync(path.join(repo,'.git')))return;
 const {acquirePublishLock}=await import('./stages/publish');
 const {verifyPublication}=await import('./post-publish');
 mkdirSync(corpusPath(),{recursive:true});
 const release=acquirePublishLock(corpusPath('publish.lock'));
 try{await verifyPublication(repo);}finally{release();}
}
main().catch(error=>{console.error(error instanceof Error && error.message.startsWith('CRITICAL:') ? error.message : 'CRITICAL: post-publish verification/rollback failed; runner stopped. Inspect pending receipt in the data repository git directory.');process.exitCode=1;});
