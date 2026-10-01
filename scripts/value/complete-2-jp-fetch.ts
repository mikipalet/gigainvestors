import dotenv from 'dotenv';dotenv.config({path:'.env.local',quiet:true});
import {getFundamentals} from '../../lib/value/eodhd';import {normalizeEodhd} from '../../lib/value/normalize-eodhd';
import {readFileSync,writeFileSync,existsSync,statfsSync} from 'node:fs';import {join} from 'node:path';import {homedir} from 'node:os';
const root=join(homedir(),'value-corpus'),stage=join(root,'staging/release-8/complete-2');
if(process.env.VALUE_CORPUS_DIR!==stage)throw Error('Staging only');
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
async function main(){for(const [id,c] of Object.entries(read(join(stage,'jp-alternates.json'))) as [string,any][]){
 const d=statfsSync('/');if(d.bavail*d.bsize<5*1024**3)throw Error('Disk below 5 GiB');
 try{
 const path=join(stage,`raw/eodhd/${c.id}.json`),raw=existsSync(path)?read(path):await getFundamentals(c.id);writeFileSync(path,JSON.stringify(raw));
 if(raw.General?.ISIN!==c.Isin)throw Error('ISIN mismatch');
 const original=read(join(root,`raw/edinet/issuers/${id}.json`)).years;
 const n=normalizeEodhd(raw,id,{corroboratingYears:original});
 const matches=n.fundamentals.years.filter(y=>original.some((o:any)=>o.end===y.end&&o.currency===y.currency&&o.netIncome&&y.netIncome&&Math.abs(o.netIncome/y.netIncome-1)<.02));
 if(matches.length<2)throw Error('Fewer than two matching annual income observations');
 for(const y of n.fundamentals.years)for(const p of Object.values(y.provenance??{}))p.source=p.source.replace(`raw/eodhd/${id}`,`https://eodhd.com/api/fundamentals/${c.id}`);
 writeFileSync(join(stage,`completeness/verified/${id}.json`),JSON.stringify({id,sourceId:c.id,isin:c.Isin,...n}));console.log(id,c.id,n.fundamentals.years.length,n.patch.industry,matches.length);
 }catch(e){console.log(id,(e as Error).message);}
}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
