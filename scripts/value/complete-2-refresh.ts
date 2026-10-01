import {readFileSync,writeFileSync,readdirSync,existsSync,statfsSync} from 'node:fs';import {join} from 'node:path';import {homedir} from 'node:os';
import {normalizeEodhd} from '../../lib/value/normalize-eodhd';import type {Year} from '../../lib/value/types';
const root=join(homedir(),'value-corpus'),stage=join(root,'staging/release-8/complete-2');
const read=(p:string)=>existsSync(p)?JSON.parse(readFileSync(p,'utf8')):null;
for(const file of readdirSync(join(stage,'completeness/verified'))){
 const d=statfsSync('/');if(d.bavail*d.bsize<5*1024**3)throw Error('Disk below 5 GiB');
 const p=join(stage,'completeness/verified',file),entry=read(p),raw=read(join(stage,`raw/eodhd/${entry.sourceId}.json`));if(!raw)continue;
 let anchors:Year[]=read(join(stage,`raw/edinet/issuers/${entry.id}.json`))?.years??read(join(root,`raw/edinet/issuers/${entry.id}.json`))?.years??[];
 const ciks=new Set([entry.patch?.cik,read(join(root,`analysis/${entry.id}.json`))?.company.cik].filter(Boolean).map(c=>String(Number(c))));
 for(const cik of ciks)anchors.push(...(read(join(stage,`completeness/sec/${cik}.json`))??read(join(root,`completeness/sec/${cik}.json`))??[]));
 anchors.push(...(read(join(stage,`completeness/issuer-years/${entry.id}.json`))??[]));
 anchors.push(...(read(join(stage,`completeness/yahoo/${entry.id}.json`))??[]));
 if(entry.currencyTranslations)continue; // Its reviewed primary-currency reconstruction is retained.
 let sourceYears:Year[]=[];const n=normalizeEodhd(raw,entry.id,{corroboratingYears:anchors,onSourceYears:ys=>sourceYears=ys});
 n.fundamentals.years=sourceYears;
 n.fundamentals.splits=[...new Map([...(n.fundamentals.splits??[]),...(entry.fundamentals.splits??[])].map(s=>[s.date,s])).values()];
 for(const y of n.fundamentals.years)for(const p of Object.values(y.provenance??{}))p.source=p.source.replace(`raw/eodhd/${entry.id}`,`https://eodhd.com/api/fundamentals/${entry.sourceId}`);
 writeFileSync(p,JSON.stringify({...entry,...n,patch:{...n.patch,cik:entry.patch?.cik??n.patch.cik}}));
}
