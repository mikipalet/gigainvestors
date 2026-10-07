import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {modelReturn} from '../../../../lib/value/return-model';
const root='/Users/miki/data/value-rules/.audit/rules-6';
const rows=JSON.parse(readFileSync(root+'/corpus/staging/preserved-buy-transitions.json','utf8'));
const keys=['understandable','moat','economics','management','accounting'];
function evidence(e:any){
 const d=e.dossier,r=e.index,q=e.price;
 if(!d||!r)throw Error('Missing full proposal evidence');
 return {quality:r.t,qualityEvidence:Object.fromEntries(keys.map(k=>[k,d.tests[k]])),buy:r.b,
  value:r.v,valuation:d.valuation,buyPrice:r.v&&Number.isFinite(r.m)?r.v[1]*(1-r.m):null,
  price:q??null,tradingCurrency:d.company.currency,
  expectedReturn:q&&r.buyReturnInputs?.model?modelReturn(r.buyReturnInputs.model,q[0]):null,
  requiredReturn:r.buyReturnInputs?.requiredReturn??d.valuation?.discountRate??null,
  filingSource:d.report??null,balanceSource:d.valuation?.balanceSheet??null,
  dossierSha256:createHash('sha256').update(JSON.stringify(d)).digest('hex'),
  completeDossier:d,completeIndex:r};
}
function sourceEvidence(id:string,filing:any){
 const files=[`analysis/inputs/${id}.json`,`fundamentals/${id}.json`,`raw/eodhd/${id}.json`,`raw/sec-companyfacts/${id}.json`,`reports/${id}/meta.json`].filter(rel=>existsSync(root+'/corpus/'+rel));
 return {primaryFilingAvailable:Boolean(filing?.url),filingStatus:filing?.url?'Bound filing URL retained':'No primary filing URL in bound corpus; cached statement provenance only. Not ready for Buy approval without filing verification.',files:files.map(rel=>({path:rel,sha256:createHash('sha256').update(readFileSync(root+'/corpus/'+rel)).digest('hex')}))};
}
const proposals=rows.map((p:any)=>({id:p.id,name:p.evidence.proposed.dossier.company.name,approved:false,disposition:'Complete live record preserved pending explicit owner approval',methodVersion:'3.6.0',sourceEvidence:sourceEvidence(p.id,p.evidence.proposed.dossier.report),before:evidence(p.evidence.before),proposed:evidence(p.evidence.proposed)}));
writeFileSync(root+'/evidence/proposed-buy-approvals.json',JSON.stringify(proposals,null,2)+'\n');
console.log('Proposed Buy flips:',proposals.length,'approved: 0');
