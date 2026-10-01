import { readCorpusJson,writeCorpusJson } from '../../lib/value/corpus';
import type { Analysis } from '../../lib/value/types';
const holdings=['AAPL.US','AXP.US','BAC.US','KO.US','CVX.US','OXY.US','MCO.US','CB.US','KHC.US','GOOGL.US','8058.JP','8031.JP','8001.JP','8002.JP','8053.JP','VRSN.US','V.US','MA.US','DPZ.US','POOL.US'];
const traps=['PLUG.US','AMC.US','LCID.US','RIVN.US','CCL.US','BHC.US','GT.US','INTC.US'];
const rows=[...holdings,...traps].map(id=>{
 const a=readCorpusJson<Analysis>(`analysis/${id}.json`),b=readCorpusJson<Analysis>(`judgement/before/${id}.json`);
 return {id,group:holdings.includes(id)?'holdings/reference businesses':'traps',available:!!a,before:b?Object.values(b.tests).map(t=>t.result).join(','):null,quality:a&&Object.values(a.tests).every(t=>t.result==='pass'),tests:a?Object.fromEntries(Object.entries(a.tests).map(([k,t])=>[k,{numeric:t.rawNumeric??t.numeric,adjusted:t.numeric,result:t.result,reason:t.judgement?.reason??t.reasons.join('; ')}])):null,business:a?.judgement?.business.map(r=>r.id)??[]};
});
writeCorpusJson('judgement/validation/holdings-traps.json',rows);
console.table(rows.map(r=>({id:r.id,group:r.group,quality:r.quality,failed:r.tests?Object.entries(r.tests).filter(([,t])=>t.result==='fail').map(([k])=>k).join(','):'no data',business:r.business.join(',')})));
console.log('Holdings/reference quality',rows.filter(r=>r.group==='holdings/reference businesses'&&r.quality).length,'/',holdings.length);
if(rows.some(r=>r.group==='traps'&&r.quality))throw Error('A junk/value trap passed all five tests');
