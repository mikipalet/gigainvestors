/** Run the merged production guard unchanged against the bound live baseline. */
import {readFileSync, writeFileSync, readdirSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {committedArchive, workingArchive, measureCoverage, compareCoverage, coverageSummary} from '../../../../scripts/value/publication-coverage';
import {assertCandidatePages} from '../../../../scripts/value/publication-pages';

const root='/Users/miki/data/value-rules/.audit/rules-3';
const baseline=JSON.parse(readFileSync(root+'/evidence/archive-baseline.json','utf8')).commit;
const before=measureCoverage(committedArchive(root+'/corpus/publish-repo',baseline));
const omissions=JSON.parse(readFileSync(root+'/evidence/omitted-logo-assets.json','utf8'));
if(!omissions.allUnreferenced||omissions.presentFilesByteChanged)throw Error('Unresolved logo asset change');
const proofs=[];
for(const arm of ['candidate-final','corpus/publish-repo']){
 const store=root+'/'+arm,after=measureCoverage(workingArchive(store));
 compareCoverage(before,after,baseline);
 assertCandidatePages(store,before,after,baseline);
 const files:string[]=[];
 function walk(directory:string){
  for(const entry of readdirSync(root+'/baseline/'+directory,{withFileTypes:true})){
   const rel=path.join(directory,entry.name);
   if(entry.isDirectory())walk(rel);else files.push(rel);
  }
 }
 walk('logos');
 const logoHashes:Record<string,string>={};
 const omittedUnreferenced:string[]=[];
 for(const rel of files){
  const original=readFileSync(root+'/baseline/'+rel);
  if(!existsSync(store+'/'+rel)){
   const key=path.basename(rel,'.json');
   if(!(key in omissions.references)||omissions.references[key].length)throw Error('Referenced logo removed: '+rel);
   omittedUnreferenced.push(rel);continue;
  }
  if(!original.equals(readFileSync(store+'/'+rel)))throw Error('Published logo bytes changed: '+rel);
  logoHashes[rel]=createHash('sha256').update(original).digest('hex');
 }
 proofs.push({arm,summary:coverageSummary(before,after),logoFiles:Object.keys(logoHashes).length,omittedUnreferenced,logoHashes});
}
writeFileSync(root+'/evidence/logo-coverage-proof.json',JSON.stringify({passed:true,baseline,productionGuardUnmodified:true,proofs},null,2)+'\n');
console.log('Production coverage and page guards pass; all referenced logo file bytes preserved');
