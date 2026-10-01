import dotenv from 'dotenv';dotenv.config({path:'.env.local',quiet:true});import {getFundamentals} from '../../lib/value/eodhd';
import {normalizeEodhd} from '../../lib/value/normalize-eodhd';import {readFileSync,writeFileSync,existsSync,statfsSync} from 'node:fs';import {join} from 'node:path';import {homedir} from 'node:os';
const stage=join(homedir(),'value-corpus/staging/release-8/complete-2');if(process.env.VALUE_CORPUS_DIR!==stage)throw Error('Staging only');const read=(p:string)=>existsSync(p)?JSON.parse(readFileSync(p,'utf8')):null;
async function main(){for(const [id,candidates] of Object.entries({'TIT.MI':['TQI.F','TIIAY.US','TIIAF.US'],'FCT.MI':['FNCNF.US','1F8.F'],'BMPS.MI':['BMDPF.US','BMPSF.US'],'BAMI.MI':['BNCZF.US','BAMI.F']})){
 const disk=statfsSync('/');if(disk.bavail*disk.bsize<5*1024**3)throw Error('Disk below 5 GiB');const anchors=read(join(stage,`completeness/issuer-years/${id}.json`))??[];
 for(const sourceId of candidates){try{const p=join(stage,`raw/eodhd/${sourceId}.json`),raw=read(p)??await getFundamentals(sourceId);writeFileSync(p,JSON.stringify(raw));let all:any[]=[];const n=normalizeEodhd(raw,id,{corroboratingYears:anchors,onSourceYears:ys=>all=ys});
 const matches=all.filter(y=>anchors.some((a:any)=>a.end===y.end&&a.totalAssets&&y.totalAssets&&Math.abs(a.totalAssets/y.totalAssets-1)<.01&&[a.netIncome,a.totalNetIncome].some(ni=>ni&&y.netIncome&&Math.abs(ni/y.netIncome-1)<.01)));
 console.log(id,sourceId,raw.General?.Name,raw.General?.ISIN,'all',all.length,'retained',n.fundamentals.years.length,'matches',matches.length);
 if(matches.length<2)continue;
 const dest=join(stage,`completeness/verified/${id}.json`),entry=read(dest);
 if(all.length<entry.fundamentals.years.length)continue;
 n.fundamentals.years=all;
 for(const y of all)for(const p of Object.values(y.provenance??{}) as any[])p.source=p.source.replace(`raw/eodhd/${id}`,`https://eodhd.com/api/fundamentals/${sourceId}`);
 writeFileSync(dest,JSON.stringify({...entry,...n,sourceId,isin:raw.General?.ISIN,corroboration:{dates:matches.map(y=>y.end),basis:'Consolidated annual assets and parent or total earnings agree with ESEF issuer statements within 1%'}}));break;
 }catch(e){console.log(id,sourceId,(e as Error).message);}}
}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
