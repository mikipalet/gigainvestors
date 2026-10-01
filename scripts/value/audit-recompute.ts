/** Recompute corrected companies with cached filing judgments; local output only. */
import {readFileSync,readdirSync,writeFileSync,mkdirSync,statfsSync,rmSync,existsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {withReportedFacts} from '../../lib/value/completeness/reported-facts';
import auditFacts from '../../lib/value/completeness/audit-facts.json';
import {applyShareCheck,type ShareCheck} from '../../lib/value/share-check';
import {analyzeCompany} from '../../lib/value/analyze-company';
import {buildOutput} from '../../lib/value/build-output';
import {publishViews} from '../../lib/value/publish-views';
import type {Analysis,Dossier,Fundamentals,PriceHistory} from '../../lib/value/types';
const root=process.env.VALUE_CORPUS_DIR??path.join(os.homedir(),'value-corpus'),stage=path.resolve('.audit/staging'),store=path.join(stage,'store');
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const disk=()=>{const s=statfsSync('/');if(s.bavail*s.bsize<5*1024**3)throw Error('DISK STOP below 5 GiB');};
async function main(){
 disk();const baseline:Record<string,Dossier>=Object.assign({},...readdirSync(path.join(root,'publish-repo/dossiers')).filter(f=>f.endsWith('.json')).map(f=>read(path.join(root,'publish-repo/dossiers',f))));const dossiers:Record<string,Dossier>=Object.assign({},...readdirSync(path.join(store,'dossiers')).filter(f=>f.endsWith('.json')).map(f=>read(path.join(store,'dossiers',f))));
 const prices=Object.assign({},...readdirSync(path.join(store,'prices')).filter(f=>f.endsWith('.json')).map(f=>read(path.join(store,'prices',f))));
 const changes:any[]=[],fundamentals:Record<string,Fundamentals>={};
 for(const id of Object.keys(auditFacts)){
  disk();const before=dossiers[id]??baseline[id];if(!before)continue;
  const raw:Analysis=read(path.join(root,`analysis/${id}.json`)),original:Fundamentals=read(path.join(root,`fundamentals/${id}.json`));
  const f={...original,years:withReportedFacts(id,original.years)};fundamentals[id]=f;
  const v=raw.valuation,fx=v?.perShareTrading?.fxRate??1;
  const analyzed=await analyzeCompany({company:raw.company,fundamentals:f,sections:{},report:raw.report,bondYield:v?.bondYield??null,priceHistory:before.priceHistory??null,priceHistoryPending:false,currentShares:v?.shares??null,reportedShares:v?.shareSources===2,shareSource:raw.shareCount?.source==='yahoo-shares'?'yahoo-shares':undefined,ask:async()=>Object.values(raw.tests).flatMap(t=>t.jev),usdRate:async currency=>currency===f.currency?fx:currency===raw.company.currency?1:null});
  const checkFile=path.join(root,`enrichment-v7/share-checks/${id}.json`);
  const a=applyShareCheck(analyzed,existsSync(checkFile)?read(checkFile) as ShareCheck:null);
  // Filing evidence and judgments were cached; the audit never calls an LLM or publishes.
  dossiers[id]={...before,...a,company:before.company,thesis:before.thesis,series:{...Object.assign({},...Object.values(a.tests).map(t=>t.series)),...a.series}};
  changes.push({id,before:{latest:original.years.at(-1),valuation:baseline[id].valuation,tests:Object.fromEntries(Object.entries(baseline[id].tests).map(([k,t])=>[k,t.result]))},after:{latest:f.years.at(-1),valuation:a.valuation,tests:Object.fromEntries(Object.entries(a.tests).map(([k,t])=>[k,t.result]))}});
 }
 // Older published financial valuations already scaled the bridge and price, but
 // left the normalized book and distributable cash on the annual-share basis.
 const shareBasisRepairs:Array<{id:string;factor:number;beforeBook:number;afterBook:number}>=[];
 for(const d of Object.values(dossiers)){
  const v=d.valuation,book=v?.bridge.find(r=>/^(tangible|reported) book value per share$/.test(r.label))?.value;
  if(v?.method==='book_value'&&v.shareSources===2&&book!=null&&v.normalized>0&&Math.abs(book-v.normalized)>1e-9){
   const factor=book/v.normalized;shareBasisRepairs.push({id:d.id,factor,beforeBook:v.normalized,afterBook:book});
   v.normalized=book;if(v.financialReturn)v.financialReturn.cashPerShare*=factor;
  }
 }
 writeFileSync(path.join(stage,'share-basis-repairs.json'),JSON.stringify(shareBasisRepairs,null,2));
 const holdersByTicker:Record<string,string[]>={},investorNames:Record<string,string>={},priceHistories:Record<string,PriceHistory>={};
 for(const d of Object.values(dossiers)){
  const u=d.tests.understandable.series;if(d.company.kind!=='operating'&&u.roe){u.commonRoe=u.roe;delete u.roe;d.series.commonRoe=u.commonRoe;}
  if(d.priceHistory)priceHistories[d.id]=d.priceHistory;
  for(const h of d.holders){investorNames[h.code]=h.name;const ticker=d.id.replace(/\.US$/,'').replaceAll('-','.');holdersByTicker[ticker]=d.holders.map(h=>h.code);}
 }
 const {files}=buildOutput({analyses:Object.values(dossiers),prices,priceHistories,holdersByTicker,investorNames,fx:{},universe:read(path.join(store,'meta.json')).counts.universe});
 for(const f of readdirSync(path.join(store,'history')).filter(f=>f.endsWith('.json')))files[`history/${f}`]=read(path.join(store,'history',f));
 publishViews(files);
 for(const folder of ['dossiers','index','views']){rmSync(path.join(store,folder),{recursive:true,force:true});mkdirSync(path.join(store,folder),{recursive:true});}
 for(const [file,value]of Object.entries(files)){disk();mkdirSync(path.dirname(path.join(store,file)),{recursive:true});writeFileSync(path.join(store,file),JSON.stringify(value));}
 const cohort=read(path.join(stage,'cohort.json')),publishedIds=new Set(Object.entries(files).filter(([file])=>file.startsWith('dossiers/')).flatMap(([,shard])=>Object.keys(shard as object)));
 for(const row of cohort){row.published=publishedIds.has(row.id);if(!row.published&&baseline[row.id])row.publicationNote='Current source recomputation leaves unresolved numeric evidence; excluded by the existing publication gate.';}
 writeFileSync(path.join(stage,'cohort.json'),JSON.stringify(cohort,null,2));
 writeFileSync(path.join(stage,'recomputed.json'),JSON.stringify(changes,null,2));writeFileSync(path.join(stage,'corrected-fundamentals.json'),JSON.stringify(fundamentals));
 console.log(JSON.stringify({corrected:changes.map(c=>c.id),changes:changes.map(c=>({id:c.id,before:c.before.valuation?.perShare.mid,after:c.after.valuation?.perShare.mid}))},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
