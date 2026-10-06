import {cpSync,existsSync,mkdirSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const root=resolve('.audit/understand-2');
const [candidateArg,baselineArg,label='nightly']=process.argv.slice(2);
const candidate=resolve(candidateArg??root+'/candidate-store');
const master=resolve(baselineArg??root+'/master-store');
function command(args,cwd){const r=spawnSync('git',args,{cwd,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();}
for(const [name,baseline] of [['against-master',master],['against-released',resolve('.audit/understandable/corpus/publish-repo')]]){
 const repo=root+'/invariant-'+label+'-'+name;
 if(existsSync(repo))throw Error('Fresh invariant directory required');
 mkdirSync(repo);cpSync(baseline,repo,{recursive:true});
 command(['init','-b','proof-baseline'],repo);
 command(['config','user.name','Local release proof'],repo);command(['config','user.email','proof@localhost'],repo);
 command(['add','.'],repo);command(['commit','-m','Local baseline for invariant comparison'],repo);
 for(const entry of readdirSync(repo))if(entry!=='.git')rmSync(repo+'/'+entry,{recursive:true,force:true});
 cpSync(candidate,repo,{recursive:true});
 const result=spawnSync(process.execPath,['--conditions=react-server','--import','tsx','--input-type=module','-e',`import {assertPublishInvariants} from './scripts/value/publish-invariants.ts'; assertPublishInvariants(${JSON.stringify(repo)}); console.log('PASS');`],{encoding:'utf8'});
 const receipt={baseline:name,baselineCommit:command(['rev-parse','HEAD'],repo),exitCode:result.status,stdout:result.stdout.trim(),stderr:result.stderr.trim()};
 writeFileSync('research/understandable/outputs/understand-2/invariant-'+label+'-'+name+'.json',JSON.stringify(receipt,null,2)+'\n');
 console.log(name,receipt.exitCode,receipt.stdout||receipt.stderr);
}
