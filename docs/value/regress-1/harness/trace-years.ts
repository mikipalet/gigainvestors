import {readFileSync,writeFileSync} from 'node:fs';
import {normalizeEodhd} from '../../../../lib/value/normalize-eodhd';
import {checkIntegrity} from '../../../../lib/value/integrity';
import {deriveYears} from '../../../../lib/value/derive';
import {fillYears} from '../../../../lib/value/completeness/second-sources';
import {completeCachedYears,completeCachedSplits} from '../../../../lib/value/completeness/cached-years';
import {correctCachedAnnualSources} from '../../../../lib/value/annual-source-corrections';
import {supplementFinancialFacts} from '../../../../lib/value/financial-facts';
const root='/Users/miki/data/regress',source=root+'/corpus';
const read=<T=any>(p:string):T|null=>{try{return JSON.parse(readFileSync(source+'/'+p,'utf8'));}catch{return null;}};
const traces=[];
for(const id of (process.env.TRACE_IDS?.split(',')??['BRO.US','COP.US','EG.US','HST.US','MRK.XETRA','VIVT3.SA','MCD.US','WRB.US','GRMN.US'])){
 const f:any=read(`fundamentals/${id}.json`),c:any=read(`companies/${id}.json`),raw=read(`raw/eodhd/${id}.json`),trace:any[]=[];
 const capture=(step:string)=>trace.push({step,years:f.years.length,start:f.years[0]?.end,reason:f.integrity,shares:f.years.filter((y:any)=>y.fy>=2014).map((y:any)=>[y.fy,y.dilutedShares]),currency:[...new Set(f.years.map((y:any)=>y.currency))]});
 const p:any=read(`prices-history/${id}.json`);const priceHistory=Array.isArray(p)?p:p?.prices??null;
 capture('cached');
 const normalized=raw?normalizeEodhd(raw,id).fundamentals:null;
 f.years=deriveYears(normalized?fillYears(f.years,normalized.years):f.years);
 f.integrity=checkIntegrity(f,{source:c.source,priceHistory});capture('merged-provider');
 const facts:any=read(`raw/sec-companyfacts/${id}.json`);
 if(facts){f.years=supplementFinancialFacts(f.years,facts);f.integrity=checkIntegrity(f,{source:c.source,priceHistory});}capture('financial-facts');
 f.splits=completeCachedSplits(id,f.splits,read);f.years=completeCachedYears(c,f.years,read);capture('completion');
 f.years=correctCachedAnnualSources(c,f.years,raw,read,f.splits);capture('source-correction');
 f.integrity=checkIntegrity(f,{source:c.source,priceHistory});capture('final-integrity');
 traces.push({id,trace});
}
writeFileSync(root+'/evidence/trace-years.json',JSON.stringify(traces,null,2));console.log(traces.map(x=>({id:x.id,steps:x.trace.map((t:any)=>[t.step,t.years])})));
