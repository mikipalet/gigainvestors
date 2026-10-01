import dotenv from 'dotenv';dotenv.config({path:'.env.local',quiet:true});
import {readFileSync,writeFileSync,existsSync,statfsSync} from 'node:fs';import {join} from 'node:path';import {homedir} from 'node:os';
import {fillYears} from '../../lib/value/completeness/second-sources';
import {translatePresentationCurrency} from '../../lib/value/completeness/presentation-currency';
import {checkIntegrity} from '../../lib/value/integrity';
import type {Year} from '../../lib/value/types';
import {eodhd} from '../../lib/value/eodhd';import {normalizeEodhd} from '../../lib/value/normalize-eodhd';
const stage=join(homedir(),'value-corpus/staging/release-8/complete-2');if(process.env.VALUE_CORPUS_DIR!==stage)throw Error('Staging only');
const read=(p:string)=>existsSync(p)?JSON.parse(readFileSync(p,'utf8')):null;
async function main(){const disk=statfsSync('/');if(disk.bavail*disk.bsize<5*1024**3)throw Error('Disk below 5 GiB');
const path=join(stage,'sources/GBPUSD.json'),daily=read(path)??await eodhd<any[]>('eod/GBPUSD.FOREX',{from:'2005-01-01',to:'2026-10-01',order:'a'});writeFileSync(path,JSON.stringify(daily));
for(const [id,cik] of [['CPG.LSE',null],['DGE.LSE',835403],['RTO.LSE',930157]] as const){
 const file=join(stage,`completeness/verified/${id}.json`),entry=read(file),raw=read(join(stage,`raw/eodhd/${entry.sourceId}.json`));
 const anchors=cik?['USD','GBP'].flatMap(c=>read(join(stage,`completeness/sec/${cik}-${c}.json`))??[]):[];
 const rates=Object.keys(raw.Financials.Income_Statement.yearly).map(end=>{const start=new Date(end);start.setUTCFullYear(start.getUTCFullYear()-1);const observations=daily.filter((d:any)=>d.date>start.toISOString().slice(0,10)&&d.date<=end&&d.close>0);if(observations.length<200||Date.parse(end)-Date.parse(observations.at(-1).date)>7*86400000)throw Error('Incomplete dated FX '+end);return {from:'GBP',to:'USD',end,average:observations.reduce((s:number,d:any)=>s+d.close,0)/observations.length,closing:observations.at(-1).close,source:'https://eodhd.com/api/eod/GBPUSD.FOREX'};});
 let sourceYears:Year[]=[];const n=normalizeEodhd(raw,id,{corroboratingYears:anchors,onSourceYears:ys=>sourceYears=ys});
 if(cik){const usd=read(join(stage,`completeness/sec/${cik}-USD.json`))??[],gbp=read(join(stage,`completeness/sec/${cik}-GBP.json`))??[];sourceYears=sourceYears.map(y=>{const primary=usd.find((s:Year)=>s.end===y.end)??gbp.find((s:Year)=>s.end===y.end);return primary?fillYears([primary],y.currency===primary.currency?[y]:[])[0]:y;});}
 n.fundamentals.years=translatePresentationCurrency(sourceYears,rates);n.fundamentals.splits=entry.fundamentals.splits;n.fundamentals.integrity=checkIntegrity(n.fundamentals);
 if(cik)writeFileSync(join(stage,`completeness/sec/${cik}.json`),JSON.stringify(n.fundamentals.years));
 writeFileSync(file,JSON.stringify({...entry,...n,currencyTranslations:rates,patch:{...n.patch,cik:cik?String(cik):entry.patch.cik}}));console.log(id,n.fundamentals.years.length,n.fundamentals.integrity);
}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
