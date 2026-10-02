/** Offline split-only release: frozen live dossiers, no analysis/source refresh. */
import {existsSync,mkdirSync,readdirSync,readFileSync,writeFileSync,statfsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {alignHistoryShares} from '../../lib/value/history-split-basis';
import {completeCachedSplits,completeCachedYears} from '../../lib/value/completeness/cached-years';
import {applyPublishedSplitFactors,nonShareDifferences} from '../../lib/value/split-replay';
import {buildOutput} from '../../lib/value/build-output';
import {numericMemo} from '../../lib/value/owner-memo';
import {publishViews} from '../../lib/value/publish-views';
import {writeOutput} from './stages/publish';
import type {Dossier,Fundamentals,PriceMap,Year} from '../../lib/value/types';
const source=path.join(os.homedir(),'value-corpus'),stage=path.resolve('.fix5'),live=path.join(source,'publish-repo');
const read=<T=any>(file:string):T=>JSON.parse(readFileSync(file,'utf8'));
const cached=<T>(file:string):T|null=>existsSync(path.join(source,file))?read<T>(path.join(source,file)):null;
function disk(){const d=statfsSync('/');if(d.bavail*d.bsize<6*1024**3)throw Error('DISK STOP below 6 GiB');}
const shard=<T>(dir:string):Record<string,T>=>Object.assign({},...readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>read(path.join(dir,f))));
async function main(){
 process.env.VALUE_NO_EODHD='1';disk();mkdirSync('.fix5c',{recursive:true});
 const ds=shard<Dossier>(path.join(live,'dossiers')),prices=shard<PriceMap[string]>(path.join(live,'prices'));
 const analyses:Dossier[]=[],changes:any[]=[];
 for(const old of Object.values(ds)){
  disk();const f=cached<Fundamentals>(`fundamentals/${old.id}.json`);let next=structuredClone(old);
  if(f){
   f.splits=completeCachedSplits(old.id,f.splits,cached);
   // Restrict this release to the mixed source histories detected by fix 5.
   // Reconstruct their *published* denominator before normalizing: much of the
   // live universe was already adjusted, and must not be split a second time.
   if(alignHistoryShares(f,[])!==f){
    const shares=new Map(old.tests.management.series.shares??[]),revenuePerShare=new Map(old.series.revenuePerShare??[]);
    const income=new Map(old.tests.understandable.series.netIncome??[]),perShare=new Map(old.tests.management.series.perShareValue??[]);
    const years=f.years.filter(y=>y.fy<=(old.historyCoverage?.last??Infinity)).map(y=>({...y,dilutedShares:shares.get(y.fy)??
     (income.get(y.fy)&&perShare.get(y.fy)?income.get(y.fy)!/perShare.get(y.fy)!:
      revenuePerShare.get(y.fy)&&y.revenue?y.revenue/revenuePerShare.get(y.fy)!:y.dilutedShares)}));
    const basis={...f,years},fixed=alignHistoryShares(basis,[]);
    const factors=new Map(fixed.years.flatMap((y,i)=>{const a=years[i].dilutedShares,b=y.dilutedShares;return a&&b&&Math.abs(b/a-1)>1e-8?[[y.fy,b/a] as [number,number]]:[];}));
    if(factors.size){
     let financialYears:Year[]=[];
     if('bookReturnCagr' in old.tests.economics.metrics){
      const supplemental=new Map(completeCachedYears(old.company,f.years,cached).map(y=>[y.fy,y]));
      // Reproduce the live retained-per-share sum before using these rows. Only
      // missing buybacks filled at the original analysis are needed here; the
      // replay function refuses any mismatch with the published aggregate.
      financialYears=years.map(y=>({...y,buybacks:y.provenance?.buybacks?.method==='absent-in-complete-statement'?supplemental.get(y.fy)?.buybacks??y.buybacks:y.buybacks}));
     }
     next=applyPublishedSplitFactors(old,factors,financialYears);
     changes.push({id:old.id,name:old.company.name,factors:[...factors],tests:Object.keys(next.tests).flatMap(k=>{const key=k as keyof Dossier['tests'];return next.tests[key]?.result!==old.tests[key]?.result?[{test:k,before:old.tests[key]?.result,after:next.tests[key]?.result}]:[]})});
    }
   }
   // Fix 5's computed Q2 window uses the published gross-margin observations,
   // never a rolling source refresh. Filing/research answers remain untouched.
   if(next.ownerMemo?.lines.some(l=>l.question===2&&l.basis==='computed')){
    const margins=new Map(old.tests.moat.series.grossMargin??[]),revenues=new Map(old.tests.understandable.series.revenue??[]);
    const ys=f.years.map(y=>({...y,revenue:revenues.get(y.fy)??y.revenue,grossProfit:margins.get(y.fy)!=null?(revenues.get(y.fy)??y.revenue??0)*margins.get(y.fy)!:null}));
    const q2=numericMemo(next,ys,null).find(l=>l.question===2);
    next.ownerMemo={...next.ownerMemo,lines:next.ownerMemo.lines.flatMap(l=>{
     if(l.question!==2||l.basis!=='computed')return [l];
     if(q2)return [{...q2,chart:l.chart}];
     // A missing new sentence must not discard published capital observations.
     const last=l.chart?.points.filter((p):p is [number,number]=>p[1]!=null).at(-1);
     return last?[{...l,answer:`${l.chart!.label.replace(/^./,c=>c.toUpperCase())} was ${Number((last[1]*100).toFixed(1))}% in FY${last[0]}.`}]:[];
    })};
   }
  }
  analyses.push(next);
 }
 const holdersByTicker:Record<string,string[]>={},investorNames:Record<string,string>={};
 for(const d of analyses){for(const h of d.holders)investorNames[h.code]=h.name;for(const id of [d.id,...d.company.listings].filter(id=>id.endsWith('.US')))holdersByTicker[id.slice(0,-3).replaceAll('-','.')]=d.holders.map(h=>h.code);}
 const fx:Record<string,number>={};for(const f of readdirSync(path.join(source,'raw/eodhd/universe')).filter(f=>/^fx-[A-Z]{3}\.json$/.test(f))){const n=cached<any>('raw/eodhd/universe/'+f)?.data?.[0]?.close;if(n>0)fx[f.slice(3,6)]=n;}
 const {files,unresolved}=buildOutput({analyses,holdersByTicker,investorNames,fx,prices,priceHistories:Object.fromEntries(analyses.filter(d=>d.priceHistory).map(d=>[d.id,d.priceHistory!])),universe:read<any>(path.join(live,'meta.json')).counts.universe});
 // Carry historical frames and logos from the live baseline, not the rejected replay.
 for(const dir of ['history','logos','forward','search'])if(existsSync(path.join(live,dir)))for(const f of readdirSync(path.join(live,dir)).filter(f=>f.endsWith('.json')))files[`${dir}/${f}`]=read(path.join(live,dir,f));
 publishViews(files);
 const fresh:Record<string,Dossier>=Object.assign({},...Object.entries(files).filter(([p])=>p.startsWith('dossiers/')).map(([,v])=>v));
 // Quotes and current valuations are frozen; preserve the live price-test payload,
 // including a historical omission, rather than refreshing publication metadata.
 for(const d of Object.values(ds)){if(!fresh[d.id])continue;if(d.tests.price)fresh[d.id].tests.price=structuredClone(d.tests.price);else delete fresh[d.id].tests.price;}
 const differences=Object.values(ds).flatMap(d=>!fresh[d.id]?[{id:d.id,path:'removed'}]:nonShareDifferences(d,fresh[d.id]).map(p=>({id:d.id,path:p})));
 if(Object.keys(fresh).length!==Object.keys(ds).length||differences.length){writeFileSync('.fix5c/replay-blocked.json',JSON.stringify({differences,unresolved},null,2));throw Error(`Split scope blocked: ${differences.length} non-share differences`);}
 writeOutput({repo:path.join(stage,'store'),files});
 writeFileSync(path.join(stage,'replay.json'),JSON.stringify(changes,null,2));writeFileSync('.fix5c/replay.json',JSON.stringify(changes,null,2));
 console.log(JSON.stringify({published:analyses.length,changed:changes.length,changes,nonShareDifferences:differences.length,unresolved},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
