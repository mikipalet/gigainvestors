/** Keep existing coverage baselines when their canonical filing cannot be refreshed. */
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {homedir} from 'node:os';
import {additionInputProblems,readCoverageRelease} from '../../scripts/value/coverage-release';
import {reviewedIssuerAliases} from '../../scripts/value/retired-issuer-aliases';
const root=realpathSync('.audit/rules/corpus');
if(realpathSync(process.env.VALUE_CORPUS_DIR??'')!==root||root===realpathSync(homedir()+'/value-corpus'))throw Error('Explicit independent corpus copy required');
const release=readCoverageRelease()!;
const read=(p:string)=>JSON.parse(readFileSync(root+'/'+p,'utf8'));
const aliases=read('publish-repo/aliases.json'),held:any[]=[];
for(const old of release.additionIds){
 const id=reviewedIssuerAliases[old]??aliases[old]??old;
 if(!release.baselineIds.includes(id))continue;
 const company=read('analysis/'+id+'.json').company,quote=read('publish-repo/prices/'+company.country+'.json')[id];
 const problems=additionInputProblems(id,quote);if(!problems.length)continue;
 const stage=JSON.parse(readFileSync('research/rules/outputs/staged-baseline/'+id+'.json','utf8'));
 held.push({id,alias:old,problems,unchangedNumeric:stage.baseline===stage.candidate,reason:'The input corpus already differs from the reviewed coverage baseline; preserve the exact released dossier in both local proof arms.'});
}
const freeze=read('verdict-freeze.json');const originalIds=[...freeze.ids];freeze.ids=[...new Set([...freeze.ids,...held.map(x=>x.id)])];writeFileSync(root+'/verdict-freeze.json',JSON.stringify(freeze)+'\n');
writeFileSync('research/rules/outputs/proof-only-freeze.json',JSON.stringify({originalIds,added:held},null,2)+'\n');
writeFileSync('research/rules/outputs/preserved-coverage-baselines.json',JSON.stringify(held,null,2)+'\n');console.log(held);
