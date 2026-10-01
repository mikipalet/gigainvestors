/** Copy selected test inputs into the one staging directory. No links to mutable corpus data. */
import {readFileSync,writeFileSync,readdirSync,copyFileSync,existsSync,mkdirSync,statfsSync} from 'node:fs';import {join,dirname} from 'node:path';import {homedir} from 'node:os';
const root=join(homedir(),'value-corpus'),stage=join(root,'staging/release-8/complete-2');
const guard=()=>{const s=statfsSync('/');if(s.bavail*s.bsize<5*1024**3)throw Error('Disk below 5 GiB');};
const copy=(rel:string,replace=false)=>{guard();const source=join(root,rel),dest=join(stage,rel);if(existsSync(source)&&(replace||!existsSync(dest))){mkdirSync(dirname(dest),{recursive:true});copyFileSync(source,dest);}};
for(const rel of ['universe.jsonl','index-membership/latest.json'])copy(rel,true);
for(const dir of ['bonds','prices','publish-repo/prices'])if(existsSync(join(root,dir)))for(const file of readdirSync(join(root,dir)))if(file.endsWith('.json'))copy(dir+'/'+file);
for(const file of readdirSync(join(root,'raw/eodhd/universe')))if(file.startsWith('fx-'))copy('raw/eodhd/universe/'+file);
for(const {id} of JSON.parse(readFileSync(process.argv[2]??join(stage,'baseline.json'),'utf8'))){
 for(const rel of [`companies/${id}.json`,`analysis/${id}.json`,`analysis/inputs/${id}.json`,`jev/${encodeURIComponent(id)}.json`,`prices-history/${id}.json`,`prices-history/meta/${id}.json`,`fundamentals/${id}.json`])copy(rel);
 const reportDir=join(root,`reports/${id}`);if(existsSync(reportDir))for(const file of readdirSync(reportDir))if(file.endsWith('.txt')||file==='meta.json')copy(`reports/${id}/${file}`);
 const a=JSON.parse(readFileSync(join(root,`analysis/${id}.json`),'utf8'));
 if(a.company.cik)copy(`completeness/sec/${Number(a.company.cik)}.json`);
 for(const source of ['yahoo','edinet'])copy(`completeness/${source}/${id}.json`);
}
for(const id of ['8355.JP','9062.JP'])copy(`raw/edinet/issuers/${id}.json`);
console.log('Prepared isolated analysis inputs');
