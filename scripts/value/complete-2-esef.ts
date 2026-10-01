import {readFileSync,writeFileSync,existsSync,mkdirSync,statfsSync} from 'node:fs';import {join} from 'node:path';import {homedir} from 'node:os';
import {yearsFromEsef,mergeEsefYears} from '../../lib/value/italy/facts';import type {Year} from '../../lib/value/types';
const root=join(homedir(),'value-corpus'),stage=join(root,'staging/release-8/complete-2');const read=(p:string)=>existsSync(p)?JSON.parse(readFileSync(p,'utf8')):null;
mkdirSync(join(stage,'completeness/issuer-years'),{recursive:true});
for(const {id} of read(join(stage,'baseline.json'))){const issuer=read(join(root,`raw/esef/issuers/${id}.json`));if(!issuer)continue;
const disk=statfsSync('/');if(disk.bavail*disk.bsize<5*1024**3)throw Error('Disk below 5 GiB');let years:Year[]=[];
for(const filing of issuer.filings){const raw=read(join(root,`raw/esef/facts/${filing}.json`));if(!raw)continue;const incoming=yearsFromEsef({raw:raw.data??raw,lei:issuer.company.lei});for(const y of incoming)for(const p of Object.values(y.provenance??{}))p.source=raw.url;years=mergeEsefYears(years,incoming);}
writeFileSync(join(stage,`completeness/issuer-years/${id}.json`),JSON.stringify(years));console.log(id,years.map(y=>[y.fy,y.netIncome,y.equity,y.dilutedShares]));
}
