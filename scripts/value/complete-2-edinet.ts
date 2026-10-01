import {existsSync,readdirSync,readFileSync,writeFileSync,mkdirSync,statfsSync} from 'node:fs';
import {join} from 'node:path';import {homedir} from 'node:os';
import {annualReportDocuments,csvFilesFromZip} from '../../lib/value/japan/edinet';
import {mergeYears,parseEdinetCsv,yearsFromEdinet} from '../../lib/value/japan/xbrl-csv';
const root=join(homedir(),'value-corpus'),stage=join(root,'staging/release-8/complete-2');
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const ids=new Set<string>(read(join(stage,'baseline.json')).filter((c:any)=>c.id.endsWith('.JP')).map((c:any)=>c.id));
const docs=new Map<string,Map<string,any>>();
const excluded=new Map<string,Set<string>>();
for(const file of readdirSync(join(root,'raw/edinet/days')).sort()){
 if(!file.endsWith('.json'))continue;const day=read(join(root,'raw/edinet/days',file));
 if(!day.results)continue;
 for(const d of day.results){const id=String(d.secCode).slice(0,4)+'.JP';if(ids.has(id)&&d.docTypeCode==='120'&&(d.fundCode||d.ordinanceCode&&d.ordinanceCode!=='010')){if(!excluded.has(id))excluded.set(id,new Set());excluded.get(id)!.add(d.periodEnd);}}
 for(const d of annualReportDocuments(day)){const id=d.secCode.slice(0,4)+'.JP';if(!ids.has(id)||!existsSync(join(root,`raw/edinet/csv/${d.docID}.zip`)))continue;
 if(!docs.has(id))docs.set(id,new Map());docs.get(id)!.set(d.docID,d);}
}
mkdirSync(join(stage,'raw/edinet/issuers'),{recursive:true});
for(const id of ids){
 const disk=statfsSync('/');if(disk.bavail*disk.bsize<5*1024**3)throw Error('Disk below 5 GiB');
 const path=join(root,`raw/edinet/issuers/${id}.json`);if(!existsSync(path))continue;
 const raw=read(path);const excludedPeriods=[...(excluded.get(id)??[])].filter(end=>![...(docs.get(id)?.values()??[])].some(d=>d.periodEnd===end));let years=raw.years.filter((y:any)=>!excludedPeriods.includes(y.end));
 for(const doc of [...(docs.get(id)?.values()??[])].sort((a,b)=>a.submitDateTime.localeCompare(b.submitDateTime))){
 const rows=csvFilesFromZip(join(root,`raw/edinet/csv/${doc.docID}.zip`)).flatMap(parseEdinetCsv);
 const parsed=yearsFromEdinet(rows);
 for(const y of parsed)for(const p of Object.values(y.provenance??{}))p.source=`https://disclosure2.edinet-fsa.go.jp/WEEK0010.aspx?docId=${doc.docID}`;
 years=mergeYears(years,parsed);
 if(['4901.JP','6301.JP','6981.JP','7751.JP','9602.JP','6178.JP'].includes(id)&&doc===([...docs.get(id)!.values()].sort((a,b)=>a.submitDateTime.localeCompare(b.submitDateTime))).at(-1)){
  mkdirSync(join(stage,'sources/edinet'),{recursive:true});writeFileSync(join(stage,`sources/edinet/${id}.json`),JSON.stringify(rows));
 }
 }
 writeFileSync(join(stage,`raw/edinet/issuers/${id}.json`),JSON.stringify({...raw,years,excludedPeriods}));console.log(id,docs.get(id)?.size,years.length);
}
