/** currency-1 preview (read-only): run the statement-currency checks over the analysis
 * years every published company currently uses. Usage: VALUE_CORPUS_DIR=… tsx preview.ts <ids.json> <out.json> */
import {readFileSync,writeFileSync} from 'node:fs';
import {readCorpusJson} from '../../../../lib/value/corpus';
import {verifyCachedStatementCurrency} from '../../../../lib/value/annual-source-corrections';
import {consistentBalanceSheets,consistentTrailing} from '../../../../lib/value/statement-currency';
import {balanceSheetsFor} from '../../../../lib/value/latest-balance';
import type {Company,Year} from '../../../../lib/value/types';
const ids:string[]=JSON.parse(readFileSync(process.argv[2],'utf8'));
const out:unknown[]=[];
for(const id of ids){
 const company=readCorpusJson<Company>(`companies/${id}.json`);const inputs=readCorpusJson<{memoYears?:Year[]}>(`analysis/inputs/${id}.json`);
 if(!company||!inputs?.memoYears?.length)continue;
 const years=inputs.memoYears;
 const r=verifyCachedStatementCurrency(company,years,readCorpusJson);
 const relabelled=r.years.filter(y=>{const b=years.find(o=>o.fy===y.fy&&o.end===y.end)??years.find(o=>o.revenue===y.revenue&&o.totalAssets===y.totalAssets);return b&&b.currency!==y.currency;}).map(y=>({fy:y.fy,end:y.end,currency:y.currency,inputs:y.provenance?.currency?.inputs}));
 const raw=readCorpusJson<unknown>(`raw/eodhd/${id}.json`);
 const bal=raw?consistentBalanceSheets(balanceSheetsFor(id,raw),r.years,r.home,r.rates).rejected:[];
 const ttm=readCorpusJson<{ttm?:Year}>(`fundamentals/${id}.json`)?.ttm;
 const tr=consistentTrailing(ttm,r.years,r.home,r.rates).rejected;
 if(relabelled.length||r.dropped.length||bal.length||tr)out.push({id,label:years.at(-1)?.currency,home:r.home,relabelled,dropped:r.dropped,balanceRejected:bal,trailingRejected:tr});
}
writeFileSync(process.argv[3],JSON.stringify(out,null,1));
console.log(out.length,'companies affected');
