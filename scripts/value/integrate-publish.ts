/** Rebuild this integration's local preview while retaining the live immutable record.
 * Production publish/writeOutput guards are deliberately unchanged. */
import dotenv from 'dotenv';
import {readFileSync,writeFileSync,existsSync,readdirSync,rmSync,cpSync} from 'node:fs';
import {corpusPath} from '../../lib/value/corpus';
import {diskGuard} from '../../lib/value/thesis/sources';
import {computeForwardRecord,type ForwardSnapshot} from '../../lib/value/forward';
import publish from './stages/publish';
dotenv.config({path:'.env.local',quiet:true});dotenv.config({path:corpusPath('.env.local'),quiet:true});process.env.VALUE_NO_EODHD='1';
async function main(){
 diskGuard();const stage='.integrate/staging',out=`${stage}/store`,forward=corpusPath('publish-repo/forward');
 if(existsSync(`${out}/.git`))throw Error('Integration output must never be a publication repository');
 const live=existsSync(forward)?readdirSync(forward).filter(f=>/^20\d\d-\d\d-\d\d\.json$/.test(f)).map(f=>JSON.parse(readFileSync(`${forward}/${f}`,'utf8')) as ForwardSnapshot):[];
 // This is our disposable preview, not the live corpus. Save the generated preview
 // separately; the delivered store uses the original recorded decisions below.
 rmSync(`${out}/forward`,{recursive:true,force:true});
 await publish({only:readFileSync(`${stage}/published-ids.txt`,'utf8').trim().split(','),out,overwrite:existsSync(`${out}/meta.json`),force:true});
 const date=new Date().toISOString().slice(0,10);
 if(existsSync(`${out}/forward/${date}.json`))cpSync(`${out}/forward/${date}.json`,`${stage}/preview-forward.json`);
 if(live.length){
  diskGuard();rmSync(`${out}/forward`,{recursive:true,force:true});cpSync(forward,`${out}/forward`,{recursive:true});
  const meta=JSON.parse(readFileSync(`${out}/meta.json`,'utf8')),{picks,...summary}=computeForwardRecord(live);
  meta.forward=summary;writeFileSync(`${out}/meta.json`,JSON.stringify(meta)+'\n');
  for(const f of readdirSync(forward))if(!readFileSync(`${forward}/${f}`).equals(readFileSync(`${out}/forward/${f}`)))throw Error('Live forward record changed in preview');
  console.log(`Preserved ${live.length} live forward snapshots byte-for-byte; private preview recorded separately.`);
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
