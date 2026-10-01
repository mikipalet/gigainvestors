import {readFileSync,writeFileSync,mkdirSync,existsSync,statfsSync} from 'node:fs';import {join} from 'node:path';import {homedir} from 'node:os';
import {yearsFromScreener,screenerIndustry,type Schedules} from '../../lib/value/completeness/screener';
import type {Fundamentals} from '../../lib/value/types';
import {checkIntegrity} from '../../lib/value/integrity';
const root=join(homedir(),'value-corpus'),stage=join(root,'staging/release-8/complete-2');
const ids=JSON.parse(readFileSync(join(stage,'baseline.json'),'utf8')).filter((c:any)=>c.id.endsWith('.NSE')).map((c:any)=>c.id) as string[];
const dir=join(stage,'sources/screener');mkdirSync(dir,{recursive:true});
const requests=[['Cash from Investing Activity','cash-flow'],['Cash from Financing Activity','cash-flow'],['Other Assets','balance-sheet'],['Other Liabilities','balance-sheet'],['Net Profit','profit-loss']];
async function get(url:string,path:string){
 if(existsSync(path))return readFileSync(path,'utf8');
 await new Promise(r=>setTimeout(r,5000));
 const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0','Referer':'https://www.screener.in/'},signal:AbortSignal.timeout(30000)});
 if(r.status===429)throw Error('Rate limited; stop. Retry-After: '+r.headers.get('retry-after'));if(!r.ok)throw Error(`HTTP ${r.status}`);
 const s=await r.text();writeFileSync(path,s);return s;
}
async function main(){for(const id of ids){
 const disk=statfsSync('/');if(disk.bavail*disk.bsize<5*1024**3)throw Error('Disk below 5 GiB');
 try{
 const symbol=id.split('.')[0],url=`https://www.screener.in/company/${symbol}/consolidated/`;
 const html=await get(url,join(dir,id+'.html')),companyId=/data-company-id="(\d+)"/.exec(html)?.[1];if(!companyId)throw Error('No company identifier');
 const schedules:Schedules={};
 for(const [parent,section] of requests){
  const endpoint=`https://www.screener.in/api/company/${companyId}/schedules/?${new URLSearchParams({parent,section,consolidated:''})}`;
  schedules[parent]=JSON.parse(await get(endpoint,join(dir,id+'-'+parent+'.json')));
 }
 const years=yearsFromScreener(html,schedules,url),f:Fundamentals={id,currency:'INR',years,integrity:{ok:true,reasons:[]},fetchedAt:new Date().toISOString()};
 f.integrity=checkIntegrity(f);
 writeFileSync(join(stage,`completeness/verified/${id}.json`),JSON.stringify({id,sourceId:url,fundamentals:f,patch:{industry:screenerIndustry(html)}}));console.log(id,years.length,f.integrity);
 }catch(e){console.log(id,(e as Error).message);if((e as Error).message.includes('Rate limited'))throw e;}
}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
