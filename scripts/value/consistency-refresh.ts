/** Freeze published quality/quotes; refresh only return models, buy flags and business flags locally. */
import {readFileSync,readdirSync,writeFileSync,mkdirSync,existsSync,statfsSync,rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {shardOf} from '../../lib/value/shard';
import {buildOutput} from '../../lib/value/build-output';
import {publishViews} from '../../lib/value/publish-views';
import {computeFlags} from '../../lib/value/flags/compute';
import {inlineObservations} from '../../lib/value/flags/inline';
import {ownerReturn} from '../../lib/value/owner-return';
import {ruleReading} from '../../lib/value/rule-reading';
import {businessLines} from '../../lib/value/flags/presentation';
import type {Dossier,PriceMap,IndexRow} from '../../lib/value/types';
import type {FlagRecord} from '../../lib/value/flags/types';
const stage=path.resolve(process.argv[2]??'.audit/staging'),store=path.join(stage,'store'),root=process.env.VALUE_CORPUS_DIR??path.join(os.homedir(),'value-corpus');
const read=(f:string)=>JSON.parse(readFileSync(f,'utf8'));
const disk=()=>{const s=statfsSync('/');if(s.bavail*s.bsize<5*1024**3)throw Error('DISK STOP below 5 GiB');};
const shard=(folder:string)=>Object.assign({},...readdirSync(path.join(store,folder)).filter(f=>f.endsWith('.json')).map(f=>read(path.join(store,folder,f))));
disk();const ds:Record<string,Dossier>=shard('dossiers'),prices:PriceMap=shard('prices');
const beforeFile=path.join(stage,'before.json');
function snapshot(d:Dossier,legacy=false){
 const v=d.valuation,p=prices[d.id]?.[0],fx=v?.perShareTrading?.fxRate??1;
 const old=v&&p?(v.method==='nav'?v.normalized*v.navReturn!.cagr*fx/p:(v.method==='owner_earnings'?v.normalized/v.shares:v.financialReturn?.cashPerShare??NaN)*fx/p+v.growth):null;
 return {id:d.id,name:d.company.name,price:p,currency:d.company.currency,buy:d.b??false,quality:Object.values(d.tests).filter(t=>t.key!=='price').map(t=>t.result[0].toUpperCase()).join(''),method:v?.method,tier:v?.tier,value:v?.perShareTrading?.mid??v?.perShare.mid,buyPrice:v?(v.perShareTrading?.mid??v.perShare.mid)*(1-(d.requiredMos??.25)):null,expected:legacy?old:ownerReturn(v,d.company.currency,d.company.marketCapUsd,p??null)?.expected??null,required:v?.discountRate,flags:d.businessDepth?.flags.map(f=>({kind:f.kind,tone:f.tone,label:f.label})),lines:businessLines(d).map(l=>l.text),rules:Object.fromEntries(Object.values(d.tests).filter(t=>t.key!=='price').map(t=>[t.key,ruleReading(t,d.company.kind).sentence]))};
}
if(!existsSync(beforeFile))writeFileSync(beforeFile,JSON.stringify(Object.values(ds).map(d=>snapshot(d,true)),null,2));
for(const d of Object.values(ds)){
 disk();if(!d.businessDepth)continue;
 const file=path.join(root,'flags',d.id+'.json');if(!existsSync(file))continue;
 const record=read(file) as FlagRecord,sourceFile=path.join(root,'flags/sources',d.id+'.json');
 const source=existsSync(sourceFile)?read(sourceFile):null;
 const observations=[...record.observations];
 const reviewed=read('lib/value/flags/reviewed-observations.json')[d.id]??[];
 for(const o of reviewed)if(source&&o.evidence.url===source.url&&source.text.replace(/\s+/g,' ').includes(o.evidence.quote.replace(/\s+/g,' '))&&!observations.some(old=>old.metric===o.metric&&old.fy===o.fy))observations.push(o);
 const assetFile=path.join(stage,`assets-${d.id}.json`);
 if(source?.html){const assets=existsSync(assetFile)?read(assetFile):inlineObservations(source.html,source).filter(o=>o.metric==='total-assets');writeFileSync(assetFile,JSON.stringify(assets));observations.push(...assets.filter((o:{metric:string;fy:number})=>!observations.some(old=>old.metric===o.metric&&old.fy===o.fy)));}
 // OE is the published, normalized filing calculation, with the same fiscal/currency basis.
 const refreshed=computeFlags(observations,d.reportingCurrency?{series:d.tests.economics.series.ownerEarnings??[],currency:d.reportingCurrency}:undefined);
 const replace=new Set(['capital-intensity','goodwill-equity','goodwill-assets']);
 d.businessDepth={...d.businessDepth,flags:[...d.businessDepth.flags.filter(f=>!replace.has(f.kind)),...refreshed.filter(f=>replace.has(f.kind))]};
}
const holdersByTicker:Record<string,string[]>={},investorNames:Record<string,string>={},priceHistories:Record<string,NonNullable<Dossier['priceHistory']>>={};
for(const d of Object.values(ds)){if(d.priceHistory)priceHistories[d.id]=d.priceHistory;holdersByTicker[d.id.replace(/\.US$/,'').replaceAll('-','.')]=d.holders.map(h=>h.code);for(const h of d.holders)investorNames[h.code]=h.name;}
const {files}=buildOutput({analyses:Object.values(ds),prices,priceHistories,holdersByTicker,investorNames,fx:{},universe:read(path.join(store,'meta.json')).counts.universe});
// Preserve existing dossier-only records; this audit does not change publication eligibility.
for(const d of Object.values(ds)){const key=`dossiers/${shardOf(d.id)}.json`;const shard=files[key] as Record<string,Dossier>|undefined;if(!shard?.[d.id]){files[key]??={};(files[key] as Record<string,Dossier>)[d.id]=d;}}
for(const f of readdirSync(path.join(store,'history')).filter(f=>f.endsWith('.json')))files['history/'+f]=read(path.join(store,'history',f));
publishViews(files);
for(const folder of ['dossiers','index','views']){rmSync(path.join(store,folder),{recursive:true,force:true});mkdirSync(path.join(store,folder),{recursive:true});}
for(const [file,value]of Object.entries(files)){disk();mkdirSync(path.dirname(path.join(store,file)),{recursive:true});writeFileSync(path.join(store,file),JSON.stringify(value));}
const after=Object.values(shard('dossiers') as Record<string,Dossier>).map(d=>snapshot(d));
writeFileSync(path.join(stage,'after.json'),JSON.stringify(after,null,2));
const before=read(beforeFile) as ReturnType<typeof snapshot>[];
const changes=after.filter(a=>before.find(b=>b.id===a.id)?.buy!==a.buy);
writeFileSync(path.join(stage,'buy-diff.json'),JSON.stringify(changes.map(a=>({before:before.find(b=>b.id===a.id),after:a})),null,2));
const cohort=read(path.join(stage,'cohort.json'));
for(const row of cohort)row.published=!!ds[row.id];
for(const a of after.filter(a=>a.buy))if(!cohort.some((r:IndexRow)=>r.id===a.id))cohort.push({id:a.id,published:true,groups:['all buys after IRR']});
writeFileSync(path.join(stage,'cohort.json'),JSON.stringify(cohort,null,2));
console.log(JSON.stringify({dossiers:after.length,beforeBuys:before.filter(a=>a.buy).map(a=>a.id),afterBuys:after.filter(a=>a.buy).map(a=>a.id),changes:changes.map(a=>a.id)},null,2));
