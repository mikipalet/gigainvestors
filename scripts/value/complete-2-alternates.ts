import dotenv from 'dotenv';dotenv.config({path:'.env.local',quiet:true});
import {readFileSync,writeFileSync,existsSync,statfsSync} from 'node:fs';import {join} from 'node:path';import {homedir} from 'node:os';
import {getFundamentals} from '../../lib/value/eodhd';import {normalizeEodhd} from '../../lib/value/normalize-eodhd';
const root=join(homedir(),'value-corpus'),stage=join(root,'staging/release-8/complete-2');if(process.env.VALUE_CORPUS_DIR!==stage)throw Error('Staging only');
const read=(p:string)=>existsSync(p)?JSON.parse(readFileSync(p,'utf8')):null;
const aliases=read(join(stage,'alternate-symbols.json'));
const rows=read(join(stage,'numeric-audit.json')).filter((r:any)=>r.reasons.length&&!/\.(JP|NSE)$/.test(r.id));
const score=(f:any)=>Math.min(12,f.years.length)*10000+f.years.slice(-7).reduce((s:number,y:any)=>s+['netIncome','operatingIncome','totalAssets','equity','cash','totalDebt','goodwill','ocf','capex','da','dilutedShares','dividendsPaid'].filter(k=>y[k]!=null).length,0);
async function main(){let index=0;await Promise.all(Array.from({length:2},async()=>{while(index<rows.length){const row=rows[index++];
const disk=statfsSync('/');if(disk.bavail*disk.bsize<5*1024**3)throw Error('Disk below 5 GiB');
const path=join(stage,`completeness/verified/${row.id}.json`);let best=read(path);const original=read(join(root,`fundamentals/${row.id}.json`));
const anchors=[...(original?.years??[]),...(read(join(stage,`completeness/yahoo/${row.id}.json`))??[])];
if(best?.patch?.cik)anchors.push(...(read(join(stage,`completeness/sec/${Number(best.patch.cik)}.json`))??read(join(root,`completeness/sec/${Number(best.patch.cik)}.json`))??[]));
const candidates=(aliases[row.id]??[]).filter((a:any)=>a.id!==best?.sourceId).sort((a:any,b:any)=>Number(/\.LSE$/.test(a.id))-Number(/\.LSE$/.test(b.id))).slice(0,8);
for(const candidate of candidates){try{const rawPath=join(stage,`raw/eodhd/${candidate.id}.json`),raw=read(rawPath)??await getFundamentals(candidate.id);
if(!candidate.isin||raw.General?.ISIN?.toUpperCase()!==candidate.isin.toUpperCase())continue;
const n=normalizeEodhd(raw,row.id,{corroboratingYears:anchors});
if((n.fundamentals.years.at(-1)?.fy??0)<(original?.years.at(-1)?.fy??0)-1)continue;
if(!best||score(n.fundamentals)>score(best.fundamentals)){
 n.fundamentals.splits=[...new Map([...(best?.fundamentals.splits??[]),...(n.fundamentals.splits??[])].map((s:any)=>[s.date,s])).values()] as any;
 for(const y of n.fundamentals.years)for(const p of Object.values(y.provenance??{}))p.source=p.source.replace(`raw/eodhd/${row.id}`,`https://eodhd.com/api/fundamentals/${candidate.id}`);
 best={...best,id:row.id,sourceId:candidate.id,isin:candidate.isin,...n,patch:{...n.patch,cik:best?.patch?.cik??n.patch.cik}};
 writeFileSync(rawPath,JSON.stringify(raw));writeFileSync(path,JSON.stringify(best));console.log(row.id,candidate.id,n.fundamentals.years.length,score(n.fundamentals));
}
if(best?.fundamentals.years.length>=10&&score(best.fundamentals)%10000>=75)break;
}catch(e){console.log(row.id,candidate.id,(e as Error).message);}}
}}));}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
