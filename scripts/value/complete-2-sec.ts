import {readFileSync,writeFileSync,existsSync,mkdirSync,statfsSync} from 'node:fs';import {join} from 'node:path';import {homedir} from 'node:os';
import {yearsFromCompanyFacts} from '../../lib/value/completeness/second-sources';
import {normalizeEodhd} from '../../lib/value/normalize-eodhd';
const root=join(homedir(),'value-corpus'),stage=join(root,'staging/release-8/complete-2');
const read=(p:string)=>existsSync(p)?JSON.parse(readFileSync(p,'utf8')):null;
async function main(){mkdirSync(join(stage,'completeness/sec'),{recursive:true});
 for(const [id,candidates] of Object.entries(read(join(stage,'sec-candidates.json'))) as [string,any[]][]){
  const disk=statfsSync('/');if(disk.bavail*disk.bsize<5*1024**3)throw Error('Disk below 5 GiB');
  const file=join(stage,`completeness/verified/${id}.json`),entry=read(file),original=read(join(root,`fundamentals/${id}.json`));
  const raw=entry&&read(join(stage,`raw/eodhd/${entry.sourceId}.json`));
  const incomes=raw?.Financials?.Income_Statement?.yearly??{},balances=raw?.Financials?.Balance_Sheet?.yearly??{};
  const observations=[...(original?.years??[]),...Object.entries(incomes).map(([end,i]:[string,any])=>({end,netIncome:Number(i.netIncome),totalAssets:Number(balances[end]?.totalAssets)}))];
  for(const c of candidates){try{
   const source=`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(c.cik).padStart(10,'0')}.json`;
   const path=join(stage,`completeness/sec/${c.cik}.json`);let ys=process.argv.includes('--refresh')?null:read(path);
   if(!ys){
    const r=await fetch(source,{headers:{'User-Agent':'GigaInvestors value hello@gigainvestors.com'},signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error(`HTTP ${r.status}`);
    ys=yearsFromCompanyFacts(await r.json(),original?.currency||entry?.fundamentals.currency||'',source);writeFileSync(path,JSON.stringify(ys));
    await new Promise(r=>setTimeout(r,200));
   }
   const matches=ys.filter((y:any)=>observations.some(o=>Math.abs(Date.parse(o.end)-Date.parse(y.end))<=7*86400000&&['netIncome','totalAssets'].every(k=>o[k]&&y[k]&&Math.abs(o[k]/y[k]-1)<.005)));
   if(matches.length<2)throw Error(`Only ${matches.length} corroborated income/assets observations`);
   if(entry){
    entry.patch.cik=String(c.cik);entry.corroboration={source,dates:matches.map((y:any)=>y.end)};
    if(raw&&!entry.currencyTranslations){const n=normalizeEodhd(raw,id,{corroboratingYears:ys});n.fundamentals.splits=entry.fundamentals.splits;entry.fundamentals=n.fundamentals;}
    writeFileSync(file,JSON.stringify(entry));
   }
   console.log(id,c.cik,ys.length,'matched',matches.length);break;
  }catch(e){console.log(id,c.cik,(e as Error).message);}}
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
