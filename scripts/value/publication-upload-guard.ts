import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {archiveGit,assertCoverage,critical} from './publication-coverage';
import {assertCandidatePages} from './publication-pages';

/** No direct-upload escape hatch. Recovery may upload only the exact previous tree. */
export function assertUploadReady(repo:string):void {
 const file=path.resolve(repo,archiveGit(repo,['rev-parse','--git-path','value-publish-pending.json']));
 if(!existsSync(file))critical('upload requires a durable publication receipt and previous archive');
 const receipt=JSON.parse(readFileSync(file,'utf8'));
 if(!receipt.before||!receipt.after)critical('upload receipt has no previous archive');
 if(archiveGit(repo,['status','--porcelain']))critical('upload checkout is dirty');
 const head=archiveGit(repo,['rev-parse','HEAD']);
 if(receipt.rollback){
  if(head!==receipt.rollback||archiveGit(repo,['rev-parse','HEAD^{tree}'])!==archiveGit(repo,['rev-parse',`${receipt.before}^{tree}`]))critical('rollback upload differs from previous archive');
  return;
 }
 if(head!==receipt.after)critical('upload checkout differs from receipt');
 const {before,after,baseline}=assertCoverage(repo,receipt.before);
 assertCandidatePages(repo,before,after,baseline);
}
