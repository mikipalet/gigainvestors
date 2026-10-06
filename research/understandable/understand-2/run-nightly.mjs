/** Ordinary nightly stages, restricted to the complete released identity set.
 * Provider acquisition is outside this same-input method comparison. */
import {readFileSync,realpathSync,statfsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {homedir} from 'node:os';
import dotenv from 'dotenv';
const [arm,stage]=process.argv.slice(2);
if(!['master','candidate'].includes(arm)||!['analyze','publish'].includes(stage))throw Error('Expected master|candidate analyze|publish');
if(process.env.VALUE_NO_EODHD!=='1'||!process.env.NODE_OPTIONS?.includes('offline-clock.cjs'))throw Error('Offline network guard required');
const root=resolve('.'),work=resolve('.audit/understand-2'),corpus=resolve('.audit/understandable/corpus');
if(realpathSync(process.env.VALUE_CORPUS_DIR??'')!==corpus||corpus===realpathSync(homedir()+'/value-corpus'))throw Error('Independent corpus required');
for(const p of ['/',homedir()+'/data']){const s=statfsSync(p);if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP');}
const ids=JSON.parse(readFileSync(process.env.UNDERSTAND_ONLY_FILE??work+'/published-ids.json','utf8'));
const args=['--conditions=react-server','--import','tsx','scripts/value/cli.ts',stage,
 ...(stage==='analyze'?['--only='+ids.join(',')]:['--out='+work+'/'+arm+'-store'])];
const cwd=arm==='master'?work+'/master':root;
const env={...process.env};
if(env.UNDERSTAND_ALLOW_JEV==='1'){
 if(stage!=='analyze'||!env.UNDERSTAND_JEV_ENV)throw Error('Jev access requires the explicit analyzer credential file');
 env.JEV_API_KEY=dotenv.parse(readFileSync(env.UNDERSTAND_JEV_ENV)).JEV_API_KEY;
 if(!env.JEV_API_KEY)throw Error('Nightly Jev credential missing');
}
// Only the stage process writes its network receipt, not this launcher.
delete process.env.UNDERSTAND_NETWORK_RECEIPT;
const result=spawnSync(process.execPath,args,{cwd,env,stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
