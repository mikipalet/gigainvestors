// Run the unchanged release gate on one recorded population sample.
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const [population,base,out]=process.argv.slice(2);
if(!['baseline','additions'].includes(population)||!base||!out)throw Error('Usage: coverage-browser-sample.mjs baseline|additions <base> <out>');
const sample=JSON.parse(readFileSync('docs/value/held-coverage-evidence/cover-3/browser-sample.json','utf8'));
const paths=sample[population].map(id=>`/s/${id}`).join(',');
const result=spawnSync(process.execPath,['scripts/value/release-gate.mjs',base,out,paths],{stdio:'inherit',env:{...process.env,QA_VIEWPORTS:'1728x970,390x844',VALUE_MIN_FREE_GB:'4'}});
process.exitCode=result.status??1;
