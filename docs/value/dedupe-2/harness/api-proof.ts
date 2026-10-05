import fs from 'node:fs';
import assert from 'node:assert/strict';
import {executeEndpoint,parseQuery} from '/Users/miki/GitHub/superinvestors-wt/value-cover/lib/agent-api/data';
import {getDossier,getCompanyStock,readStore} from '/Users/miki/GitHub/superinvestors-wt/value-cover/lib/value/store';
import {getStock} from '/Users/miki/GitHub/superinvestors-wt/value-cover/lib/data';
import {HISTORY_POPULATION_COPY,HISTORY_RETURN_COPY} from '/Users/miki/GitHub/superinvestors-wt/value-cover/lib/value/history-copy';
import registry from '/Users/miki/GitHub/superinvestors-wt/value-cover/lib/value/issuer-registry.json';
async function main(){
 const proof=JSON.parse(fs.readFileSync('docs/value/dedupe-2/publication-proof.json','utf8'));const rows=[];
 for(const {id,canonical} of proof.removed)for(const endpoint of ['dossier','verdict','memo','priceStory']){
  const r={id:endpoint} as any;const result=await executeEndpoint(r,'/api/v1/companies/'+id,parseQuery(new URLSearchParams(),r)) as any;
  assert.equal(result.id,canonical);rows.push({id,canonical,endpoint,resolved:result.id,pass:true});
 }
 const aliases=await readStore<Record<string,string>>('aliases.json');const holders=[];const ownership=[];
 for(const g of registry.groups){
  const d=await getDossier(g.canonical);assert.ok(d);const stock=await getCompanyStock(d);
  const ids=[g.canonical,...Object.keys(aliases??{}).filter(id=>aliases![id]===g.canonical)];
  const tickers=[...new Set(ids.filter(id=>id.endsWith('.US')).map(id=>id.slice(0,-3).replaceAll('-','.')))];
  const sources=(await Promise.all(tickers.map(getStock))).filter(Boolean);
  let quarters=0,positions=0;
  for(const q of new Set(sources.flatMap(s=>s!.quarters.map(q=>q.q)))){
   const expected=new Map<string,{value:number,pct:number}>();
   for(const source of sources)for(const row of source!.quarters.filter(row=>row.q===q))for(const h of row.holders){const old=expected.get(h.code)??{value:0,pct:0};expected.set(h.code,{value:old.value+h.value,pct:old.pct+h.pct});}
   const actual=stock?.quarters.find(row=>row.q===q);assert.ok(actual);assert.equal(actual.holders.length,expected.size);
   for(const h of actual.holders){assert.deepEqual({value:h.value,pct:h.pct},expected.get(h.code));positions++;}
   quarters++;
  }
  if(stock){for(const id of ids){const r={id:'ownership'} as any;const actual=await executeEndpoint(r,'/api/v1/ownership/'+id,parseQuery(new URLSearchParams(),r)) as any;assert.equal(actual.id,g.canonical);ownership.push({id,canonical:g.canonical,holderCount:actual.holderCount});}}
  holders.push({id:g.canonical,dossierHolders:d.holders.map(h=>h.code),listings:stock?.combinedListings??[stock?.ticker],quarters,positions,pass:true});
 }
 const historyRoute={id:'history'} as any;const history=await executeEndpoint(historyRoute,'/api/v1/time-travel',parseQuery(new URLSearchParams(),historyRoute)) as any;assert.ok(history.assumptions.includes(HISTORY_POPULATION_COPY));assert.ok(history.assumptions.includes(HISTORY_RETURN_COPY));
 const sspg=await getDossier('SSPG.LSE');assert.ok(sspg?.holders.some(h=>h.code==='GR'));
 fs.writeFileSync('docs/value/dedupe-2/api-holder-proof.json',JSON.stringify({rows,ownership,holders,historyCopy:history.assumptions,failures:[]},null,2)+'\n');console.log('API alias checks',rows.length,'ownership',ownership.length,'holder groups',holders.length);
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
