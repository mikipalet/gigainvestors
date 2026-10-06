import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {publishedBuyPrice} from '../../../../lib/value/buy-price';
import {modelReturn,cashCoversPrice} from '../../../../lib/value/return-model';
const root='/Users/miki/data/value-rules/.audit/rules-2',c=root+'/corpus';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const index=(p:string)=>Object.fromEntries(readdirSync(p+'/index').filter(f=>/^[A-Z]{2}\.json$/.test(f)).flatMap(f=>read(p+'/index/'+f).map((v:any)=>[v.id,v])));
const a=index(root+'/baseline'),b=index(root+'/candidate-final');
const prices=Object.assign({},...readdirSync(root+'/candidate-final/prices').map(f=>read(root+'/candidate-final/prices/'+f)));
const changes=read(root+'/evidence/release-audit.json').buyChanges;
const results=changes.map((change:any)=>{
 const id=change.id,row=b[id],before=a[id],analysis=read(c+'/analysis/'+id+'.json'),inputs=read(c+'/analysis/inputs/'+id+'.json');
 const hash=(file:string)=>createHash('sha256').update(readFileSync(file)).digest('hex');
 return {...change,name:analysis.company.name,quote:prices[id],currency:row.cur,buyCeiling:row.v[1]*(1-row.m),gate:publishedBuyPrice(row,prices[id]),expectedReturn:row.buyReturnInputs?.model?modelReturn(row.buyReturnInputs.model,prices[id][0]):null,cashCoversPrice:row.buyReturnInputs?.model?cashCoversPrice(row.buyReturnInputs.model,prices[id][0]):false,returnInputs:row.buyReturnInputs,requiredReturn:row.buyReturnInputs?.requiredReturn,methodEvidence:analysis.tests.moat,operatingMarginEvidence:analysis.tests.understandable,valuationUnchanged:JSON.stringify(before.v)===JSON.stringify(row.v),marginUnchanged:before.m===row.m,annualMargins:inputs.memoYears.slice(-10).map((y:any)=>({fy:y.fy,revenue:y.revenue,grossProfit:y.grossProfit,grossMargin:y.grossProfit/y.revenue,operatingIncome:y.operatingIncome,provenance:y.provenance?.grossProfit??null})),sourceFiles:Object.fromEntries(['analysis/inputs/','raw/eodhd/','fundamentals/'].map(p=>[p+id+'.json',hash(c+'/'+p+id+'.json')])),cachedFiling:read(c+'/reports/'+id+'/meta.json')};
});
writeFileSync(root+'/evidence/buy-evidence.json',JSON.stringify(results,null,2)+'\n');
console.log(results.map(({id,before,after,quote,buyCeiling,gate,expectedReturn,requiredReturn,valuationUnchanged,marginUnchanged}:any)=>({id,before,after,quote,buyCeiling,gate,expectedReturn,requiredReturn,valuationUnchanged,marginUnchanged})));
