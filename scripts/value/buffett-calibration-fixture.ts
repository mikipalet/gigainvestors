/** One small independent staging copy for the real `npm run value -- calibrate` command. */
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statfsSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CALIBRATION } from '../../lib/value/calibration';
import type { Company } from '../../lib/value/types';
const root=path.join(os.homedir(),'value-corpus'),out=path.join(root,process.env.VALUE_CHECK_VERSION==='2'?'staging/valuation-2/calibration':'staging/buffett-1/calibration');
const s=statfsSync('/');if(s.bavail*s.bsize<5*1024**3)throw new Error('Disk below 5 GB');
const cs=readFileSync(path.join(root,'universe.jsonl'),'utf8').trim().split('\n').map(l=>JSON.parse(l) as Company);
const wanted=new Set(CALIBRATION.map(c=>c.id));
const selected=cs.filter(c=>wanted.has(c.id)||c.listings.some(id=>wanted.has(id)));
mkdirSync(out,{recursive:true});writeFileSync(path.join(out,'universe.jsonl'),selected.map(c=>JSON.stringify(c)).join('\n')+'\n');
for(const id of new Set([...wanted,...selected.map(c=>c.id)])) {
 for(const folder of ['companies','fundamentals','analysis','analysis/fingerprints','analysis/inputs','raw/eodhd','jev','prices-history','prices-history/meta']){
  const rel=`${folder}/${id}.json`,from=path.join(root,rel),to=path.join(out,rel);
  if(existsSync(from)){mkdirSync(path.dirname(to),{recursive:true});copyFileSync(from,to);}
 }
 const report=path.join(root,'reports',id);if(existsSync(report))cpSync(report,path.join(out,'reports',id),{recursive:true});
}
for(const folder of ['prices','publish-repo/prices','bonds'])if(existsSync(path.join(root,folder)))cpSync(path.join(root,folder),path.join(out,folder),{recursive:true});
const fx=path.join(root,'raw/eodhd/universe');mkdirSync(path.join(out,'raw/eodhd/universe'),{recursive:true});
for(const name of readdirSync(fx).filter(n=>n.startsWith('fx-')))copyFileSync(path.join(fx,name),path.join(out,'raw/eodhd/universe',name));
console.log(`Staged ${selected.length} companies under ${out}`);
