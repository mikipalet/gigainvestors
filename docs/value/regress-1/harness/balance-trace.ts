import {readFileSync,writeFileSync} from 'node:fs';
import {balanceSheetsFor,latestBalanceAt} from '../../../../lib/value/latest-balance';
const root='/Users/miki/data/regress',c=root+'/corpus';const read=(f:string)=>{try{return JSON.parse(readFileSync(c+'/'+f,'utf8'));}catch{return null;}};
const results=[];
for(const id of (process.env.BALANCE_IDS_FILE?JSON.parse(readFileSync(process.env.BALANCE_IDS_FILE,'utf8')):['ISRG.US','ANET.US','SAP.XETRA','PGR.US','CINF.US','105560.KO','DNB.OL','FG.US','LPP.WAR','AMXB.MX'])){
 const input=read(`analysis/inputs/${id}.json`),annual=input.memoYears.at(-1),raw=read(`raw/eodhd/${id}.json`),facts=read(`raw/sec-companyfacts/${id}.json`);
 const bs=latestBalanceAt(balanceSheetsFor(id,raw),'2026-10-06',annual.currency,annual);
 const primary=Object.entries(facts?.facts?.['us-gaap']??{}).flatMap(([tag,data]:any)=>Object.entries(data.units).flatMap(([unit,rows]:any)=>rows.filter((f:any)=>f.end===bs?.end&&!f.start&&f.form==='10-Q').map((f:any)=>({tag,unit,value:f.val,filed:f.filed,accn:f.accn}))));
 results.push({id,annual:{end:annual.end,cash:annual.cash,totalDebt:annual.totalDebt,equity:annual.equity,goodwill:annual.goodwill,intangibles:annual.intangibles},selected:bs,primary});
}
writeFileSync(root+'/evidence/balance-trace.json',JSON.stringify(results,null,2));console.log('Balance evidence:',results.length,'companies');
