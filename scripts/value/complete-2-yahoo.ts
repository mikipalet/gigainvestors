import {readFileSync,writeFileSync,mkdirSync,existsSync,statfsSync} from 'node:fs';import {join} from 'node:path';import {homedir} from 'node:os';
import {YAHOO_FIELDS,yearsFromYahoo} from '../../lib/value/completeness/second-sources';import {yahooSymbol} from '../../lib/value/price-history';
const root=join(homedir(),'value-corpus'),stage=join(root,'staging/release-8/complete-2');
const read=(p:string)=>existsSync(p)?JSON.parse(readFileSync(p,'utf8')):null;
async function main(){mkdirSync(join(stage,'completeness/yahoo'),{recursive:true});
 const audit=read(join(stage,'numeric-audit.json'));
 for(const row of audit.filter((r:any)=>r.reasons.length&&!r.id.endsWith('.NSE'))){
  const disk=statfsSync('/');if(disk.bavail*disk.bsize<5*1024**3)throw Error('Disk below 5 GiB');
  const file=join(stage,`completeness/yahoo/${row.id}.json`);if(existsSync(file))continue;
  const company=read(join(root,`analysis/${row.id}.json`)).company;
  try{
   const url=`https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(yahooSymbol(company))}?${new URLSearchParams({type:Object.keys(YAHOO_FIELDS).map(k=>'annual'+k).join(','),period1:'1262304000',period2:String(Math.floor(Date.now()/1000))})}`;
   const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(20000)});if(r.status===429)throw Error('Rate limited; stop');if(!r.ok)throw Error(`HTTP ${r.status}`);
   const ys=yearsFromYahoo(await r.json(),'',url);writeFileSync(file,JSON.stringify(ys));console.log(row.id,ys.length);
   await new Promise(r=>setTimeout(r,1500));
  }catch(e){console.log(row.id,(e as Error).message);if((e as Error).message.includes('Rate limited'))throw e;}
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
