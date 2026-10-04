import {uploadPublishedSnapshot} from './blob-publish';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,renameSync,rmSync} from 'node:fs';
import path from 'node:path';
import {assertPublishInvariants} from './publish-invariants';
import {revalidatePublishedValue} from './revalidate';
import {checkLivePublication} from './live-check';
interface Receipt {before:string|null;after:string;rollback?:string}
function git(repo:string,args:string[]):string{
 try{return execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}
 catch{throw new Error(`Publication git ${args[0]} failed`);}
}
const receiptPath=(repo:string)=>path.resolve(repo,git(repo,['rev-parse','--git-path','value-publish-pending.json']));
function save(repo:string,receipt:Receipt){const file=receiptPath(repo);writeFileSync(`${file}.tmp`,JSON.stringify(receipt));renameSync(`${file}.tmp`,file);}
const remoteHead=(repo:string)=>git(repo,[...auth,'ls-remote','origin','refs/heads/main']).split(/\s/)[0]||null;
const auth=['-c','credential.helper=','-c','credential.helper=!gh auth git-credential'];

export function assertNoPendingPublication(repo:string):void{
 if(existsSync(receiptPath(repo)))throw new Error('Pending publication must be verified before another stage can modify the repository');
}

/** Durable BEFORE push: a killed stage must be verified before the next cycle. */
export function beginPublication(repo:string):void{
 assertNoPendingPublication(repo);
 const before=remoteHead(repo),after=git(repo,['rev-parse','HEAD']);
 if(before){
  // Protect even an orphan snapshot's predecessor from garbage collection.
  git(repo,['update-ref','refs/value/rollback',before]);
 }
 save(repo,{before,after});
}

export async function verifyPublication(repo:string,{check=checkLivePublication,revalidate=revalidatePublishedValue}: {
 check?:(repo:string)=>Promise<void>;revalidate?:()=>Promise<void>;
}={}):Promise<void>{
 if(!existsSync(path.join(repo,'.git'))||!existsSync(receiptPath(repo)))return;
 const receipt:Receipt=JSON.parse(readFileSync(receiptPath(repo),'utf8'));
 const clear=()=>rmSync(receiptPath(repo));
 let remote=remoteHead(repo);
 if(remote===receipt.before&&remote!==receipt.after){clear();console.log('live-check: push did not reach origin; retained prior publication');return;}
 if(remote!==receipt.after&&remote!==receipt.rollback)throw new Error('CRITICAL: publication remote moved; refusing to revert another writer');
 if(git(repo,['status','--porcelain']))throw new Error('CRITICAL: publication checkout is dirty; refusing rollback');
 // Resume a rollback interrupted during push/revalidation.
 if(receipt.rollback){
  if(git(repo,['rev-parse','HEAD'])!==receipt.rollback)throw new Error('CRITICAL: rollback checkout moved');
  if(remote!==receipt.rollback)git(repo,[...auth,'push',`--force-with-lease=refs/heads/main:${receipt.after}`,'origin','HEAD:main']);
  await uploadPublishedSnapshot(repo);
  await revalidate();clear();throw new Error('CRITICAL: failed publication reverted; interrupted rollback completed');
 }
 if(git(repo,['rev-parse','HEAD'])!==receipt.after)throw new Error('CRITICAL: publication checkout moved; refusing rollback');
 try{
  await uploadPublishedSnapshot(repo);
  await revalidate();await check(repo);clear();console.log(`live-check: ${receipt.after} passed quarter-back and 2018Q3`);
 }catch{
  console.error(`CRITICAL: live time travel/revalidation failed for ${receipt.after}; reverting last publication`);
  if(!receipt.before||receipt.before===receipt.after)throw new Error('CRITICAL: live check failed; no distinct prior publication to restore');
  remote=remoteHead(repo);
  if(remote!==receipt.after)throw new Error('CRITICAL: publication remote moved during check; refusing rollback');
  // A full publish is an orphan. Restore the exact previous tree and create a
  // compensating commit (also works for prices), rather than assuming HEAD^ exists.
  git(repo,['restore',`--source=${receipt.before}`,'--staged','--worktree','--','.']);
  assertPublishInvariants(repo,receipt.before);
  git(repo,['commit','-m',`Revert failed publication ${receipt.after}`]);
  receipt.rollback=git(repo,['rev-parse','HEAD']);save(repo,receipt);
  git(repo,[...auth,'push',`--force-with-lease=refs/heads/main:${receipt.after}`,'origin','HEAD:main']);
  await uploadPublishedSnapshot(repo);
  await revalidate();clear();
  throw new Error(`CRITICAL: failed publication ${receipt.after} reverted to prior tree ${receipt.before}`);
 }
}
