// Necessary price gate for the only two new all-quality-pass analyses.
// This is an analysis-level bound, not a successful full publication invariant.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {isDeepStrictEqual}=require('node:util');
const {priceTest}=require('../../../lib/value/price-test.ts');
const root=process.cwd(),work=path.join(root,'.audit/understand-2'),corpus=path.join(root,'.audit/understandable/corpus');
const read=p=>JSON.parse(fs.readFileSync(p));
const ids=read(path.join(work,'published-ids.json'));
const changedInputs=[];
for(const id of ids){
 const a=read(path.join(work,'master-analysis',id+'.json')),b=read(path.join(corpus,'analysis',id+'.json'));
 for(const key of ['requiredMos','volatility','status','valuation','thesis'])if(!isDeepStrictEqual(a[key],b[key]))changedInputs.push({id,key});
 if(a.company.currency!==b.company.currency)changedInputs.push({id,key:'company.currency'});
}
const prices=dir=>Object.assign({},...fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>read(path.join(dir,f))));
const sources={corpus:prices(path.join(corpus,'prices')),released:prices(path.join(corpus,'publish-repo/prices'))};
const quality=read(path.join(root,'research/understandable/outputs/understand-2/nightly-analysis-method-diff.json')).qualityPassChanges;
const rows=quality.map(({id,before,after})=>{
 assert.equal(before,false);assert.equal(after,true);
 const a=read(path.join(corpus,'analysis',id+'.json')),v=structuredClone(a.valuation);
 if(v.perShareTrading){assert.equal(v.perShareTrading.currency,a.company.currency);v.perShare=v.perShareTrading;}
 else assert.equal(v.currency,a.company.currency);
 const checks=Object.entries(sources).map(([source,map])=>{
  assert(map[id]);const quote=map[id];
  const result=priceTest({valuation:v,price:quote[0],requiredMos:a.requiredMos});
  assert.equal(result.result,'fail');return {source,quote,result};
 });
 return {id,before,after,checks};
});
assert.deepEqual(changedInputs,[]);
fs.writeFileSync('research/understandable/outputs/understand-2/method-buy-bound.json',JSON.stringify({compared:ids.length,changedPricingInputs:changedInputs,newAllQualityPass:rows,noNewBuysFromMethod:true,fullPublicationInvariant:'blocked before export'},null,2)+'\n');
console.log('PASS: unchanged pricing inputs; both new all-quality passes fail the price gate');
