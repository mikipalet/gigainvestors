import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {readCorpusJson} from '../../lib/value/corpus';
import {businessLines} from '../../lib/value/flags/presentation';
import {researchCoverage} from '../../lib/value/judgement/coverage';
import {publicAnalysis,gapWording} from '../../lib/value/public-analysis';
import {validEvidence} from '../../lib/value/flags/trust';
import type {Dossier} from '../../lib/value/types';
const stage='.integrate/staging',read=(file:string)=>JSON.parse(readFileSync(`${stage}/${file}`,'utf8'));
const dossiers:Dossier[]=readdirSync(`${stage}/store/dossiers`).filter(f=>f.endsWith('.json')).flatMap(f=>Object.values(read(`store/dossiers/${f}`)) as Dossier[]);
const progress:{done:string[]}=read('backfill-progress.json');
const scope:Array<{id:string}>=read('inventory.json').entries;
const phraseHits:Array<{id:string;text:string}>=[],invalid:Array<{id:string;reason:string}>=[];
const original=readFileSync(`${stage}/published-ids.txt`,'utf8').trim().split(',');
for(const id of original)if(!dossiers.some(d=>d.id===id))invalid.push({id,reason:'Original published member missing from the local snapshot'});
const missingScope=dossiers.filter(researchCoverage).filter(d=>!progress.done.includes(d.id)).map(d=>d.id);
for(const raw of dossiers){
 const d=publicAnalysis(raw),lines=businessLines(d),flags=d.businessDepth?.flags??[];
 if(!researchCoverage(d)&&(d.businessOverview?.length||d.businessDepth||d.judgement))invalid.push({id:d.id,reason:'Research content outside selected scope'});
 if(lines.length>6)invalid.push({id:d.id,reason:'More than six business lines'});
 if(!d.company.logo)invalid.push({id:d.id,reason:'Missing logo'});
 for(const f of flags)if(!f.evidence.length||!f.evidence.every(validEvidence))invalid.push({id:d.id,reason:'Unsupported flag'});
 // Scan public explanatory text, excluding verbatim source quotations and hidden private gaps.
 const prose=[d.company.about??'',...lines.map(l=>l.text),...flags.flatMap(f=>[f.label,f.why]),...Object.values(d.tests).flatMap(t=>[...t.reasons,t.judgement?.reason??''])];
 for(const text of prose)if(gapWording.test(text)||/share sources disagree|being checked|not corrected/i.test(text))phraseHits.push({id:d.id,text});
}
const coverage=scope.map(({id})=>{const j=readCorpusJson<any>(`judgement/${id}.json`),overview=readCorpusJson<any[]>(`business-fit/overview/${id}.json`),flags=readCorpusJson<any>(`flags/${id}.json`),source=readCorpusJson<any>(`flags/sources/${id}.json`);return {id,attempted:progress.done.includes(id),judgementCached:Boolean(j),evidencedReadings:j?.readings?.filter((r:any)=>r.value!=='unclear'&&r.confidence>=.7).length??0,lines:overview?.length??0,flagScan:Boolean(flags),partial:Boolean(source?.partial),flags:flags?.flags.length??0,gaps:flags?.gaps??[]};});
const summary={published:dossiers.length,logos:dossiers.filter(d=>d.company.logo).length,selected:coverage.length,attempted:coverage.filter(c=>c.attempted).length,judgementCached:coverage.filter(c=>c.judgementCached).length,withReadings:coverage.filter(c=>c.evidencedReadings).length,withBusinessLines:coverage.filter(c=>c.lines).length,flagScans:coverage.filter(c=>c.flagScan).length,partialSources:coverage.filter(c=>c.partial).length,missingScope,invalid,phraseHits};
writeFileSync(`${stage}/coverage.json`,JSON.stringify({summary,coverage},null,2));console.log(summary);
if(missingScope.length||invalid.length||phraseHits.length)process.exitCode=1;
