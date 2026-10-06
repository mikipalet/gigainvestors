import {writeFileSync} from 'node:fs';
import {committedArchive,workingArchive,measureCoverage,compareCoverage,coverageSummary,samplePages} from '../../../scripts/value/publication-coverage';
import {assertCandidatePages} from '../../../scripts/value/publication-pages';
const [archive,candidate]=process.argv.slice(2);
const after=measureCoverage(workingArchive(candidate));
for(const ref of ['2d7f1d84db5b28e474a04b8b7f94b29621acbb5f','9037c38327d6b688e95ffab6543610a57c2f9081']){
 const before=measureCoverage(committedArchive(archive,ref));console.log(ref,coverageSummary(before,after));
 try{compareCoverage(before,after,ref);assertCandidatePages(candidate,before,after,ref);console.log('PASS',ref);}catch(e){console.log(String(e));process.exitCode=1;}
 const lost=Object.keys(before.logoSurfaces).filter(id=>Object.entries(before.logoSurfaces[id]).some(([s,p])=>p&&!after.logoSurfaces[id]?.[s]));
 writeFileSync(`evidence-2/coverage-${ref.slice(0,8)}.json`,JSON.stringify({baseline:ref,before:Object.fromEntries(Object.entries(before.metrics).map(([k,v])=>[k,v.size])),after:Object.fromEntries(Object.entries(after.metrics).map(([k,v])=>[k,v.size])),lostLogoSurfaces:lost,missing:[...after.missingLogos].sort(),samples:samplePages(after)},null,2)+'\n');
}
