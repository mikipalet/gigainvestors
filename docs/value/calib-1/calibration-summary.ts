import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {CALIBRATION} from '/Users/miki/GitHub/superinvestors-wt/value-calib/lib/value/calibration';
import {calibrationSummary} from '/Users/miki/GitHub/superinvestors-wt/value-calib/scripts/value/stages/calibrate';
const base='/Users/miki/data/calib',frozen=new Set(JSON.parse(readFileSync(base+'/effective-frozen-ids.json','utf8'))),analyses=new Map();
const primary=JSON.parse(readFileSync(base+'/calibration-primary.json','utf8'));
for(const {id:entryId}of CALIBRATION){const id=primary[entryId]??entryId;const file=frozen.has(id)?`${base}/live/${id}.json`:['CB.US','DPZ.US'].includes(id)?`${base}/replay/analysis/${id}.json`:`/Users/miki/value-corpus/analysis/${id}.json`;if(existsSync(file))analyses.set(entryId,JSON.parse(readFileSync(file,'utf8')));}
const result=calibrationSummary({entries:CALIBRATION,analyses});writeFileSync(base+'/calibration-summary.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result.counts));process.exitCode=result.failed?1:0;
