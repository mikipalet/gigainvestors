import {corpusPath} from '../../lib/value/corpus';
import {archiveGit,committedArchive,coverageSummary,measureCoverage,workingArchive} from './publication-coverage';
try{
 const repo=corpusPath('publish-repo');
 // The protected ref survives orphan publication; HEAD is used only before the
 // first guarded release. This is reporting, never a publication authorization.
 const refs=archiveGit(repo,['for-each-ref','--format=%(refname)','refs/value/rollback']);
 const baseline=refs==='refs/value/rollback'?refs:'HEAD';
 console.log(coverageSummary(measureCoverage(committedArchive(repo,baseline)),measureCoverage(workingArchive(repo))));
}catch{console.error('CRITICAL: nightly coverage summary unavailable');process.exitCode=1;}
