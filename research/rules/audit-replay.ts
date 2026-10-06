/** Paired offline extension of research-1 replay.ts to every stored identity. */
import {readFileSync,writeFileSync,mkdirSync,existsSync,statfsSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
import {snapshotForQuarter as baseline} from '../../.audit/rules/baseline/lib/value/quarterly-snapshots';

import {eodInterims,secInterims,secAnnualFilings} from '../../lib/value/quarterly-inputs';
import {alignHistoryShares} from '../../lib/value/history-split-basis';
import {reconcilePriceSplits} from '../../lib/value/price-history';
import {completeCachedSplits} from '../../lib/value/completeness/cached-years';
globalThis.fetch=async()=>{throw Error('NETWORK DISABLED for understandable replay');};
const root=homedir()+'/data/value-research', corpus=homedir()+'/value-corpus';
const out=new URL('./outputs/',import.meta.url), cache=new URL('../../.audit/rules/replay/',import.meta.url);
mkdirSync(cache,{recursive:true});mkdirSync(new URL('audit/',out),{recursive:true});
const guard=()=>{for(const p of ['/',homedir()+'/data']){const s=statfsSync(p);if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP: commit and stop');}};
const hashes:Record<string,string>={};
const json=(p:string)=>{const b=readFileSync(p);return JSON.parse(p.endsWith('.gz')?gunzipSync(b).toString():b.toString());};
const read=(rel:string)=>{const p=corpus+'/'+rel;if(!existsSync(p))return null;const b=readFileSync(p);hashes[rel]=createHash('sha256').update(b).digest('hex');return JSON.parse(b.toString());};
const save=(name:string,data:any)=>{guard();writeFileSync(new URL(name,out),name.endsWith('.gz')?gzipSync(JSON.stringify(data)):JSON.stringify(data,null,2)+'\n');};
const companies=json(root+'/inputs/companies.json.gz'),bonds=json(root+'/inputs/bonds.json');
const qs=json(root+'/inputs/history/index.json').quarters.filter((q:string)=>q<='2026Q2');
const frames=Object.fromEntries(qs.map((q:string)=>[q,new Map(json(root+`/inputs/history/${q}.json`).map((r:any)=>[r[0],r.slice(0,4)]))]));
const results:any[]=[];let n=0,total=0;const statuses:Record<string,number>={};
for(const id of Object.keys(companies).sort()){
 if(existsSync(new URL('audit/'+id+'.json.gz',out)))continue;guard();const relevant=qs.filter((q:string)=>frames[q].has(id));if(!relevant.length)continue;
 const original=root+`/inputs/replay/${id}.json.gz`,cached=new URL(id+'.json.gz',cache);
 let input:any;
 if(existsSync(original))input=json(original);
 else if(existsSync(cached))input=JSON.parse(gunzipSync(readFileSync(cached)).toString());
 else{
  let f=json(new URL(`../../.audit/rules/fundamentals/${id}.json.gz`,import.meta.url).pathname);if(!f)continue;let prices=read(`prices-history-long/${id}.json`)??read(`prices-history/${id}.json`)??[];
  f={...f,splits:completeCachedSplits(id,f.splits,read)};f=alignHistoryShares(f,prices);prices=reconcilePriceSplits(prices,f);
  const raw=read(`raw/eodhd/${id}.json`),sec=read(`raw/sec-companyfacts/${id}.json`),report=read(`reports/${id}/meta.json`),filed:any={};
  for(const table of Object.values(raw?.Financials??{}) as any[])for(const [period,row] of Object.entries(table.yearly??{}) as any){const d=row.filing_date?.slice(0,10);if(d&&d>=period&&(!filed[period]||d<filed[period]))filed[period]=d;}
  if(report?.period&&report.filed>=report.period&&(!filed[report.period]||report.filed<filed[report.period]))filed[report.period]=report.filed;
  if(sec){const ds=secAnnualFilings(sec);for(const y of f.years){if(filed[y.end]&&filed[y.end]>y.end)continue;const d=Object.entries(ds).filter(([end])=>end.slice(0,7)===y.end.slice(0,7)).map(([,v])=>v).sort()[0];if(d)filed[y.end]=d;}}
  const interims=eodInterims(raw),allInterims:any={};
  for(const q of relevant){const cutoff=`${q.slice(0,4)}-${String(Number(q.slice(-1))*3).padStart(2,'0')}-${['1','4'].includes(q.slice(-1))?'31':'30'}`;
   const target=f.years.filter((y:any)=>y.end<cutoff&&(filed[y.end]??new Date(Date.parse(y.end)+90*864e5).toISOString().slice(0,10))<cutoff).at(-1);
   if(!target)continue;const currency=target.currency??f.currency;const rows=sec?secInterims(sec,currency,cutoff):[];
   allInterims[q]=[...new Map([...interims,...rows].map((p:any)=>[p.end.slice(0,7),p])).values()];
  }
  input={company:companies[id],fundamentals:f,prices,latestPrice:null,filedByPeriod:filed,judgement:read(`judgement/${id}.json`),bondYield:bonds[companies[id].country]?.yield??null,allInterims,asOf:'2026-10-05'};
  writeFileSync(cached,gzipSync(JSON.stringify(input)));
 }
 for(const quarter of relevant){
  const stored:any=frames[quarter].get(id);
  const cutoff=`${quarter.slice(0,4)}-${String(Number(quarter.slice(-1))*3).padStart(2,'0')}-${['1','4'].includes(quarter.slice(-1))?'31':'30'}`;
  const target=input.fundamentals.years.filter((y:any)=>y.end<cutoff&&(input.filedByPeriod[y.end]??new Date(Date.parse(y.end)+90*864e5).toISOString().slice(0,10))<cutoff).at(-1);
  const currency=target?.currency??input.fundamentals.currency;
  // Match research-1 treatment; preserve an unavailable row in both variants.
  if(currency!==input.company.currency&&!(currency==='GBP'&&input.company.currency==='GBX')){results.push({id,quarter,stored,status:'reporting/trading currency mismatch'});continue;}
  try{
   const args={...input,quarter,interims:input.allInterims[quarter]??[],fxRate:currency==='GBP'&&input.company.currency==='GBX'?100:1};
   const a=baseline(args);if(!a){results.push({id,quarter,stored,status:'snapshot unavailable'});continue;}
   const b=a;
   const tests=(r:any)=>Object.fromEntries(Object.entries(r.numeric).map(([k,t]:any)=>[k,{numeric:t.numeric,metrics:t.metrics,reasons:t.reasons,series:t.series,checks:t.auditChecks,provisional:t.provisional}]));
   const changed=JSON.stringify(a.row.slice(0,4))!==JSON.stringify(b.row.slice(0,4));
   results.push({id,quarter,stored,baseline:a.row,candidate:b.row,status:'paired',changed,qualityMatch:stored[1]===a.row[1],buyMatch:stored[3]===a.row[3],numeric:tests(a),integrity:a.integrity});
  }catch(e){results.push({id,quarter,stored,status:'error',error:String(e)});}
 }
 total+=results.length;for(const r of results)statuses[r.status]=(statuses[r.status]??0)+1;save('audit/'+id+'.json.gz',results);results.length=0;if(++n%25===0)console.log(n,'identities;',total,'rows');if(n>=50)break;
}
save('audit-summary.json',{identities:n,rows:total,statuses});console.log('DONE',n,total);
