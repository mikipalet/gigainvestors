/** Split-only replay retains live quarterly frames; never rerun source completion. */
import {readFileSync,readdirSync,writeFileSync,statfsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const live=path.join(os.homedir(),'value-corpus/publish-repo/history'),out=path.resolve('.fix5/store/history');
const space=statfsSync('/');if(space.bavail*space.bsize<6*1024**3)throw Error('DISK STOP below 6 GiB');
const files=readdirSync(live).filter(f=>f.endsWith('.json'));
const differences=files.filter(f=>!readFileSync(path.join(live,f)).equals(readFileSync(path.join(out,f))));
const index=JSON.parse(readFileSync(path.join(out,'index.json'),'utf8'));
const report={files:files.length,quarters:index.quarters.length,differences};
writeFileSync('.fix5c/history-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
if(differences.length)process.exitCode=1;
