import {readFileSync,writeFileSync} from 'node:fs';
import {correctCachedAnnualSources} from '../../../../lib/value/annual-source-corrections';
import {checkIntegrity} from '../../../../lib/value/integrity';
const source='/Users/miki/value-corpus';
const read=<T>(file:string):T|null=>{try{return JSON.parse(readFileSync(`${source}/${file}`,'utf8'));}catch{return null;}};
const result=[];
for(const id of ['MCD.US','WRB.US','GRMN.US','CEG.US','GE.US','KDP.US','TSLA.US','CSNA3.SA','KOFUBL.MX','BRO.US','COP.US','EG.US','HST.US','MRK.XETRA','VIVT3.SA']){
 const fundamentals:any=read(`fundamentals/${id}.json`),company:any=read(`companies/${id}.json`);
 const before=fundamentals.years;
 const corrected=correctCachedAnnualSources(company,before,read(`raw/eodhd/${id}.json`),read,fundamentals.splits);
 const next={...fundamentals,years:corrected};next.integrity=checkIntegrity(next,{source:company.source,priceHistory:read(`prices-history/${id}.json`)});
 result.push({id,beforeYears:before.length,correctedYears:corrected.length,integrityYears:next.years.length,integrity:next.integrity,shares:corrected.filter(y=>y.fy>=2015).map(y=>({fy:y.fy,before:before.find((p:any)=>p.fy===y.fy)?.dilutedShares,after:y.dilutedShares,provenance:y.provenance?.dilutedShares}))});
}
writeFileSync('/Users/miki/data/regress/evidence/source-proof.json',JSON.stringify(result,null,2));
console.log(result.map(({id,beforeYears,correctedYears,integrityYears})=>({id,beforeYears,correctedYears,integrityYears})));
