import {readFileSync,writeFileSync} from 'node:fs';
import {readCorpusJson} from '../../../../lib/value/corpus';
import {completeCachedYears,completeCachedSplits,completeCompanyMetadata} from '../../../../lib/value/completeness/cached-years';
import {correctCachedAnnualSources} from '../../../../lib/value/annual-source-corrections';
import {normalizeEodhd} from '../../../../lib/value/normalize-eodhd';
import type {Analysis,Fundamentals,Year} from '../../../../lib/value/types';
const records=JSON.parse(readFileSync('docs/value/held-coverage-evidence/cover-5/source-corrections-final.json','utf8'));
const results:any[]=[];
for(const id of [...new Set<string>(records.map((r:any)=>r.id))]){
 const a=readCorpusJson<Analysis>(`analysis/${id}.json`)!;
 const inputs=readCorpusJson<{asOf:string;memoYears:Year[]}>(`analysis/inputs/${id}.json`)!;
 const company=completeCompanyMetadata(a.company,readCorpusJson);
 const f=readCorpusJson<Fundamentals>(`fundamentals/${id}.json`)!;
 const raw=readCorpusJson(`raw/eodhd/${id}.json`);
 const normalized=raw?normalizeEodhd(raw,id).fundamentals:f;
 const splits=completeCachedSplits(id,f.splits,readCorpusJson);
 const years=correctCachedAnnualSources(company,completeCachedYears(company,normalized.years,readCorpusJson),raw,readCorpusJson,splits);
 for(const r of records.filter((r:any)=>r.id===id)){
  const saved=inputs.memoYears.find(y=>y.end===r.period) as any;
  const replay=years.find(y=>y.end===r.period) as any;
  results.push({...r,saved:saved?.[r.field]??null,replayed:replay?.[r.field]??null,timestampsMatch:a.asOf===inputs.asOf,
   savedMatches:(saved?.[r.field]??null)===r.after,replayMatches:(replay?.[r.field]??null)===r.after,
   savedProvenance:saved?.provenance?.[r.field],replayProvenance:replay?.provenance?.[r.field]});
 }
}
writeFileSync(process.argv[2],JSON.stringify({count:results.length,results},null,2)+'\n');
console.log(JSON.stringify({count:results.length,savedMismatches:results.filter(x=>!x.savedMatches),replayMismatches:results.filter(x=>!x.replayMatches)},null,2));

if(results.some(x=>!x.savedMatches||!x.replayMatches||!x.timestampsMatch))process.exitCode=1;
