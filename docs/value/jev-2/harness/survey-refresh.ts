import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {refreshBalanceValuation} from '../../../../lib/value/refresh-balance-valuation';
const corpus=process.env.VALUE_CORPUS_DIR!;const read=(p:string)=>{try{return JSON.parse(readFileSync(corpus+'/'+p,'utf8'))}catch{return null}};
const freeze=new Set(read('verdict-freeze.json').ids);
const rows=[];
for(const file of readdirSync(corpus+'/publish-repo/dossiers'))for(const d of Object.values(read('publish-repo/dossiers/'+file)) as any[]){
 if(freeze.has(d.id))continue;
 const after=refreshBalanceValuation(d,read,'2026-10-05');if(after===d)continue;
 const fields=['normalized','growth','tier','discountRate','shares','netCash','netDebt','leverage'];
 const delta=Object.fromEntries(fields.filter(k=>JSON.stringify(d.valuation?.[k])!==JSON.stringify(after.valuation?.[k])).map(k=>[k,[d.valuation?.[k],after.valuation?.[k]]]));
 rows.push({id:d.id,before:d.valuation,after:after.valuation,delta});
}
writeFileSync('docs/value/jev-2/model-survey.json',JSON.stringify(rows,null,2));
console.log('Refreshed',rows.length,'growth/tier differences',rows.filter(r=>'growth' in r.delta||'tier' in r.delta).map(r=>({id:r.id,delta:r.delta})),'earnings',rows.filter(r=>'normalized'in r.delta).map(r=>({id:r.id,delta:r.delta})));
