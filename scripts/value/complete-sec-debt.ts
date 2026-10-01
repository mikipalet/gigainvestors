// Refresh normalized SEC caches that predate complete-statement and disjoint debt mappings.
import {readdirSync} from 'node:fs';
import {corpusPath,readCorpusJson,readJsonl,writeCorpusJson} from '../../lib/value/corpus';
import {yearsFromCompanyFacts,fillYears} from '../../lib/value/completeness/second-sources';
import {createLimiter,pool} from '../../lib/value/http';
import type {Year,Fundamentals,Company} from '../../lib/value/types';
async function main(){
 const limit=createLimiter({perSecond:2}), updates=new Map<string,{before:Year[];after:Year[]}>();
 const files=readdirSync(corpusPath('completeness/sec')).filter(f=>f.endsWith('.json'));
 await pool({items:files,concurrency:5,run:async file=>{
  const before=readCorpusJson<Year[]>(`completeness/sec/${file}`)!;
  if(!before.some(y=>!y.statementCoverage))return;
  const cik=file.slice(0,-5),source=`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik.padStart(10,'0')}.json`;
  const response=await limit(()=>fetch(source,{headers:{'User-Agent':'GigaInvestors value hello@gigainvestors.com'},signal:AbortSignal.timeout(30000)}));
  if(!response.ok)throw new Error(`SEC migration ${cik}: HTTP ${response.status}`);
  const after=yearsFromCompanyFacts(await response.json(),before.at(-1)?.currency??'',source);
  updates.set(cik.replace(/^0+/,''),{before,after});writeCorpusJson(`completeness/sec/${file}`,after);
 }});
 const tickers=readCorpusJson<any>('sec/company-tickers-exchange.json')?.data;
 const cikByTicker=new Map<string,string>();
 if(tickers?.fields&&tickers?.data){const ti=tickers.fields.indexOf('ticker'),ci=tickers.fields.indexOf('cik');for(const row of tickers.data)cikByTicker.set(String(row[ti]),String(row[ci]));}
 let corrections=0,added=0,companies=0;
 const count=(ys:Year[])=>ys.reduce((s,y)=>s+Object.values(y).filter(v=>typeof v==='number').length,0);
 for(const row of readJsonl<Company>('universe.jsonl')){
  const c={...row,...readCorpusJson<Partial<Company>>(`companies/${row.id}.json`)};
  const cik=String(c.cik??(c.country==='US'?cikByTicker.get(c.code.replaceAll('.','-')):null)??'').replace(/^0+/,'');
  const pair=updates.get(cik);if(!pair)continue;
  const f=readCorpusJson<Fundamentals>(`fundamentals/${c.id}.json`);if(!f)continue;
  for(const y of f.years){
   const old=pair.before.find(p=>p.end===y.end),fresh=pair.after.find(p=>p.end===y.end);
   if(!old||!fresh)continue;
   for(const key of ['totalDebt','leaseLiabilities'] as const)if(y.provenance?.[key]?.source.includes('data.sec.gov')&&y[key]===old[key]&&fresh[key]!==old[key]){
    y[key]=fresh[key]??null;y.provenance![key]=fresh.provenance![key];corrections++;
   }
   if(y.provenance?.totalDebt?.source.includes('data.sec.gov'))y.debtIncludesLeases=fresh.debtIncludesLeases;
  }
  const before=count(f.years);f.years=fillYears(f.years,pair.after);added+=count(f.years)-before;
  writeCorpusJson(`fundamentals/${c.id}.json`,f);companies++;
 }
 writeCorpusJson('completeness/sec-debt-correction.json',{sources:updates.size,companies,corrections,added});console.log({sources:updates.size,companies,corrections,added});
}
main().catch(e=>{console.error(e);process.exitCode=1;});
