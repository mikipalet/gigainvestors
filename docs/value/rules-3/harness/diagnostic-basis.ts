import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {grossMarginBasis} from '../../../../lib/value/gross-margin-basis';
import {ruleReading} from '../../../../lib/value/rule-reading';
const root='/Users/miki/data/value-rules/.audit/rules-3';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const retained:any[]=[],current:any[]=[];
for(const file of readdirSync(root+'/candidate-final/dossiers'))for(const d of Object.values(read(root+'/candidate-final/dossiers/'+file)) as any[]){
 const t=d.tests.moat;if(t.grossMarginBasis!=='recent-typical')continue;
 const raw=read(root+'/corpus/analysis/'+d.id+'.json').tests.moat;
 const basis=grossMarginBasis(t);
 if(raw.metrics.grossMarginDrop===null){
  assert.equal(basis.applied,false,d.id);
  assert.equal(ruleReading(t,d.company.kind).checks.at(-1)?.pass,null,d.id);
  if(t.metrics.grossMarginDrop!=null)retained.push({id:d.id,value:t.metrics.grossMarginDrop,label:basis.label,currentCheckApplied:false});
 }else{
  assert.equal(basis.applied,true,d.id);assert.equal(t.metrics.grossMarginDrop,raw.metrics.grossMarginDrop,d.id);current.push(d.id);
 }
}
assert(retained.length>0);assert(current.length>0);
const proof={passed:true,currentChecks:current.length,retainedLegacyDiagnostics:retained};
writeFileSync(root+'/evidence/diagnostic-basis-proof.json',JSON.stringify(proof,null,2)+'\n');
console.log(current.length,'current checks;',retained.length,'legacy diagnostics kept without applying them as current checks');
