import {readFileSync,readdirSync} from 'node:fs';
import {valueCompany} from './baseline-valuation';
import {trailingInputs,currentShareInputs} from './baseline-inputs';
const c='/Users/miki/value-corpus';const read=(s:string)=>JSON.parse(readFileSync(c+'/'+s,'utf8'));
for(const id of ['FIX.US','WMT.US']){const d=Object.assign({},...readdirSync(c+'/publish-repo/dossiers').map(f=>read('publish-repo/dossiers/'+f)))[id],f=read(`fundamentals/${id}.json`),input=read(`analysis/inputs/${id}.json`),raw=read(`raw/eodhd/${id}.json`);const ttm=trailingInputs(raw,f.years.at(-1));const v=valueCompany({years:input.memoYears,ttm,kind:d.company.kind,currency:d.valuation.currency,bondYield:d.valuation.bondYield,cyclical:d.volatility==='volatile',qualityPass:true}).valuation;
console.log(id,JSON.stringify({stored:d.valuation,rebuilt:v,ttm},null,2));}
