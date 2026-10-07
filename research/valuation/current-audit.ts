/** Read-only inventory; no candidate rules or outcomes. */
import {readFileSync,readdirSync,existsSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {ownerEarningsBridge} from '../../lib/value/owner-earnings';
import {median,withZeroDefaults} from '../../lib/value/metrics';
import {earningsPath} from '../../lib/value/return-model';
import {compounderGrowth} from '../../lib/value/valuation';
const root='/Users/miki/value-corpus';
const read=(p:string)=>existsSync(root+'/'+p)?JSON.parse(readFileSync(root+'/'+p,'utf8')):null;
const rows:any[]=[];
for(const f of readdirSync(root+'/publish-repo/dossiers').filter(f=>/^\d{3}\.json$/.test(f)))for(const d of Object.values(read('publish-repo/dossiers/'+f)) as any[]){
 const inputs=read('analysis/inputs/'+d.id+'.json'),v=d.valuation,ys=withZeroDefaults(inputs?.memoYears??[]),history=ownerEarningsBridge(ys),recent=history.slice(-5),latest=recent.at(-1);
 const income=recent.map(r=>r.year.netIncome??0).reduce((a,b)=>a+b,0),owner=recent.map(r=>r.value??0).reduce((a,b)=>a+b,0);
 const flows=v?.method==='owner_earnings'?earningsPath(v.normalized,v.growth,v.terminalGrowth,v.tier==='compounder'):null;
 rows.push({id:d.id,name:d.company.name,kind:d.company.kind,country:d.company.country,quality:Object.values(d.tests).slice(0,5).map((t:any)=>t.result[0].toUpperCase()).join(''),buy:d.b,valuation:v,requiredMos:d.requiredMos,volatility:d.volatility,metrics:d.tests.economics.metrics,opMarginCv:d.tests.understandable.metrics.opMarginCv,conversion:income>0?owner/income:null,annualMedian:median(recent.map(r=>r.value!=null&&r.year.netIncome? r.value/r.year.netIncome:null).filter((x):x is number=>x!==null)),latestOwner:latest?.value,medianOwner:median(recent.flatMap(r=>r.value===null?[]:[r.value])),compounderGrowth:compounderGrowth(ys),terminalShare:flows?flows[9]*(1+v.terminalGrowth)/(v.discountRate-v.terminalGrowth)/(1+v.discountRate)**10/(v.perShare.mid*v.shares-v.netCash):null,annual:recent.map(r=>({fy:r.year.fy,revenue:r.year.revenue,netIncome:r.year.netIncome,ocf:r.year.ocf,sbc:r.year.sbc,da:r.year.da,capex:r.year.capex,growthCapex:r.growthCapex,maintenance:r.maintenanceCapex,lease:r.leaseCashCost,cashFlowBasis:r.cashFlowBasis,owner:r.value}))});
}
writeFileSync('research/valuation/outputs/current-audit.json.gz',gzipSync(JSON.stringify(rows)));console.log('Current inventory',rows.length);
