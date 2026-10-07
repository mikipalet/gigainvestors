import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {modelReturn} from '../../../../lib/value/return-model';
const root='/Users/miki/data/value-rules/.audit/rules-6';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
function store(dir:string){return {ds:Object.assign({},...readdirSync(dir+'/dossiers').map(f=>read(dir+'/dossiers/'+f))),ix:Object.fromEntries(readdirSync(dir+'/index').flatMap(f=>read(dir+'/index/'+f).map((r:any)=>[r.id,r]))),prices:Object.assign({},...readdirSync(dir+'/prices').map(f=>read(dir+'/prices/'+f))) };}
const before=store(root+'/baseline'),after=store(root+'/candidate-final'),proposals=read(root+'/evidence/proposed-buy-approvals.json');
function facts(s:ReturnType<typeof store>,id:string){const d=s.ds[id],r=s.ix[id],q=s.prices[id];return {quality:r.t,qualityTests:Object.fromEntries(Object.entries(d.tests).map(([k,t]:any)=>[k,t.result])),value:r.v,normalized:d.valuation?.normalized??null,normalizedCurrency:d.valuation?.currency??null,margin:r.m,buyPrice:r.v?.[1]*(1-r.m),price:q?.[0],quote:q,buy:r.b,expectedReturn:r.buyReturnInputs?.model&&q?modelReturn(r.buyReturnInputs.model,q[0]):null,filingSource:d.report,method:d.methodVersion,valuationMethod:d.valuation?.method};}
const rows=['GOOGL.US','NVDA.US','MSFT.US','AAPL.US','COST.US'].map(id=>({id,before:facts(before,id),released:facts(after,id),heldProposal:proposals.find((p:any)=>p.id===id)??null}));
writeFileSync(root+'/evidence/company-summary.json',JSON.stringify(rows,null,2)+'\n');
if(!rows.slice(3).every(r=>JSON.stringify(r.before.value)!==JSON.stringify(r.released.value)||r.before.quality!==r.released.quality))throw Error('Additional browser companies must have shipped changes');
