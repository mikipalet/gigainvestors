import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {valueCompany} from '../../../../lib/value/valuation';
import {valueCompany as beforeValue} from './baseline-valuation';
import {trailingInputs as beforeTrailing} from './baseline-inputs';
import {trailingInputs} from '../../../../lib/value/valuation-inputs';
import {balanceSheetsFor,latestBalanceAt} from '../../../../lib/value/latest-balance';
const corpus=process.env.VALUE_CORPUS_DIR!;
const read=(p:string)=>{try{return JSON.parse(readFileSync(corpus+'/'+p,'utf8'))}catch{return null}};
const ds=Object.assign({},...readdirSync(corpus+'/publish-repo/dossiers').map(f=>read('publish-repo/dossiers/'+f)));
const rows=[];
for(const [id,d] of Object.entries(ds) as any){
 if(!d.valuation)continue;
 const f=read(`fundamentals/${id}.json`),input=read(`analysis/inputs/${id}.json`),raw=read(`raw/eodhd/${id}.json`);
 const years=input?.memoYears??f?.years;if(!years?.length)continue;
 const annual=years.at(-1),currency=d.valuation.currency;
 const balance=latestBalanceAt(balanceSheetsFor(id,raw),'2026-10-05',currency,annual);
 if(!balance)continue;
 const args={years,kind:d.company.kind,bondYield:d.valuation.bondYield,cyclical:d.volatility==='volatile',currency,priceHistory:read(`prices-history/${id}.json`),qualityPass:Object.entries(d.tests).filter(([k])=>k!=='price').every(([,t]:any)=>t.result==='pass'),investmentHolding:d.valuation.method==='nav',version:d.valuation.version};
 const before=beforeValue({...args,ttm:beforeTrailing(raw,f.years.at(-1))}).valuation;
 const after=valueCompany({...args,ttm:trailingInputs(raw,f.years.at(-1),'2026-10-05'),balance}).valuation;
 const scale=(v:any)=>v&&v.perShare.mid*v.shares/d.valuation.shares;
 rows.push({id,stored:d.valuation.perShare.mid,before:scale(before),after:scale(after),balance,match:before&&Math.abs(scale(before)-d.valuation.perShare.mid)<1e-5});
}
writeFileSync('docs/value/jev-2/survey.json',JSON.stringify(rows,null,2));
console.log({rows:rows.length,match:rows.filter(r=>r.match).length,mismatch:rows.filter(r=>!r.match).map(r=>({id:r.id,stored:r.stored,before:r.before}))});
