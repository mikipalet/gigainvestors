/** Single local staging directory; never touches the live corpus or publication. */
import {readFileSync,readdirSync,writeFileSync,mkdirSync,cpSync,existsSync,statfsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {withReportedFacts} from '../../lib/value/completeness/reported-facts';
import {netCashSeries} from '../../lib/value/net-cash';
import {publishViews} from '../../lib/value/publish-views';
const root=process.env.VALUE_CORPUS_DIR??path.join(os.homedir(),'value-corpus');
const out=path.resolve('.audit/staging');
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const disk=()=>{const s=statfsSync('/');if(s.bavail*s.bsize<5*1024**3)throw Error('DISK STOP below 5 GiB');};
disk();mkdirSync(out,{recursive:true});
const store=path.join(out,'store');mkdirSync(store,{recursive:true});
if(!existsSync(path.join(store,'meta.json')))for(const file of readdirSync(path.join(root,'publish-repo')).filter(f=>!f.startsWith('.'))) {disk();cpSync(path.join(root,'publish-repo',file),path.join(store,file),{recursive:true});}
const files:Record<string,any>={};
for(const folder of ['index','prices','dossiers','history'])for(const f of readdirSync(path.join(store,folder)).filter(f=>f.endsWith('.json')))files[`${folder}/${f}`]=read(path.join(store,folder,f));
files['meta.json']=read(path.join(store,'meta.json'));
const ds:Record<string,any>=Object.assign({},...Object.entries(files).filter(([f])=>f.startsWith('dossiers/')).map(([,d])=>d));
const rows:any[]=Object.values(Object.fromEntries(Object.entries(files).filter(([f])=>/^index\/[A-Z]{2}.json$/.test(f)).flatMap(([,r])=>r.map((row:any)=>[row.id,row]))));
const selected=new Map<string,string[]>();
function add(id:string,reason:string){selected.set(id,[...(selected.get(id)??[]),reason]);}
rows.filter(r=>r.b).forEach(r=>add(r.id,'all buys (global)'));
rows.filter(r=>ds[r.id]?.company.indexes?.length).sort((a,b)=>(b.mc??0)-(a.mc??0)).slice(0,10).forEach(r=>add(r.id,'10 largest published index members by market cap'));
// Latest synced Berkshire positions, sorted by reported market value.
const holdings=read('data/store/investors/BRK.json').quarters.at(-1);
const aliases=read(path.join(store,'aliases.json'));
const topHoldings=holdings.positions.sort((a:any,b:any)=>b.value-a.value).slice(0,15);
for(const p of topHoldings){const id=aliases[`${p.ticker}.US`]??`${p.ticker}.US`;add(id,`Berkshire top 15 positions ${holdings.q}: ${p.ticker}`);}
writeFileSync(path.join(out,'berkshire.json'),JSON.stringify({quarter:holdings.q,positions:topHoldings},null,2));
['JPM.US','CBG.LSE','USB.US','CB.US','BAC.US'].forEach(id=>add(id,'banks/insurers'));
for(const country of ['JP','IN','IT']){
 const names=rows.filter(r=>r.c===country).sort((a,b)=>(b.mc??0)-(a.mc??0)).slice(0,5);
 if(names.length!==5)throw Error(`Not enough ${country} dossiers`);
 names.forEach(r=>add(r.id,`${country} sample`));
}
const prices=Object.assign({},...Object.entries(files).filter(([f])=>f.startsWith('prices/')).map(([,d])=>d));
const near=rows.filter(r=>!r.b&&r.t==='PPPPP'&&r.v?.[1]>0&&prices[r.id]).sort((a,b)=>prices[a.id][0]/(a.v[1]*(1-a.m))-prices[b.id][0]/(b.v[1]*(1-b.m)));
for(const r of near){if(selected.size>=60)break;add(r.id,'next closest');}
if(selected.size!==60)throw Error(`Cohort requires ${selected.size} companies, expected 60`);
// Two extra published examples retain sixty complete dossiers if a required holding is absent or quarantined.
add('BAJFINANCE.NSE','additional Indian source-audit coverage');add('BR.US','additional next-closest coverage');
const cohort=[...selected].map(([id,groups])=>({id,groups,name:ds[id]?.company.name??id,country:ds[id]?.company.country??'US',published:!!ds[id]}));
writeFileSync(path.join(out,'cohort.json'),JSON.stringify(cohort,null,2));
// Publish annual cash series for every existing dossier, using only source fundamentals.
for(const [file,shard] of Object.entries(files).filter(([f])=>f.startsWith('dossiers/'))){
 for(const d of Object.values(shard) as any[]){const f=path.join(root,`fundamentals/${d.id}.json`);if(existsSync(f))d.series.netCash=netCashSeries(withReportedFacts(d.id,read(f).years));
 const u=d.tests.understandable?.series;if(d.company.kind!=='operating'&&u?.roe){u.commonRoe=u.roe;delete u.roe;d.series.commonRoe=u.commonRoe;}}
 disk();writeFileSync(path.join(store,file),JSON.stringify(shard));
}
publishViews(files);
for(const [file,data]of Object.entries(files))if(file==='meta.json'||file.startsWith('views/')){mkdirSync(path.dirname(path.join(store,file)),{recursive:true});writeFileSync(path.join(store,file),JSON.stringify(data));}
console.log(JSON.stringify({store,companies:cohort.length,cohort},null,2));
