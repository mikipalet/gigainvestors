import {readFileSync,writeFileSync,existsSync,mkdirSync,statfsSync} from 'node:fs';import {join} from 'node:path';import {homedir} from 'node:os';
import {resolveItalianLei,allEsefFilings,filingFacts} from '../../lib/value/italy/client';import {yearsFromEsef,mergeEsefYears} from '../../lib/value/italy/facts';import type {Year} from '../../lib/value/types';
const root=join(homedir(),'value-corpus'),stage=join(root,'staging/release-8/complete-2');if(process.env.VALUE_CORPUS_DIR!==stage)throw Error('Staging only');const read=(p:string)=>existsSync(p)?JSON.parse(readFileSync(p,'utf8')):null;
const guard=()=>{const d=statfsSync('/');if(d.bavail*d.bsize<5*1024**3)throw Error('Disk below 5 GiB');};
async function main(){mkdirSync(join(stage,'completeness/issuer-years'),{recursive:true});const rows=read(join(stage,'numeric-audit.json')).filter((r:any)=>r.reasons.length&&/\.(LS|LSE|CO|ST|HE|OL|SW|BR|AS|PA|MI|XETRA|IR)$/.test(r.id));
for(const row of rows){guard();const file=join(stage,`completeness/issuer-years/${row.id}.json`);if(existsSync(file))continue;
try{const c=read(join(root,`companies/${row.id}.json`))??read(join(root,`analysis/${row.id}.json`)).company;const lei=await resolveItalianLei(c);if(!lei){console.log(row.id,'no LEI');continue;}const all=await allEsefFilings(lei),selected=[...new Map(all.map(f=>[f.attributes.period_end,f])).values()].filter(f=>f.attributes.period_end>='2019-12-31');let years:Year[]=[];
for(const f of selected){guard();const raw=await filingFacts(f),incoming=yearsFromEsef({raw,lei});for(const y of incoming)for(const p of Object.values(y.provenance??{}))p.source=new URL(f.attributes.json_url,'https://filings.xbrl.org').href;years=mergeEsefYears(years,incoming);}
writeFileSync(file,JSON.stringify(years));console.log(row.id,lei,selected.length,years.map(y=>[y.fy,y.netIncome,y.ocf]));
}catch(e){console.log(row.id,(e as Error).message);if((e as Error).message.includes('Disk below'))throw e;}
}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
