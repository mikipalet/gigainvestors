/** Local read-only replay. Writes only staging/financials-1; never publishes. */
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync,mkdirSync,writeFileSync,statfsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {runNumericTests} from '../../lib/value/tests';
import {normalizeEodhd} from '../../lib/value/normalize-eodhd';
import {financialFields,supplementFinancialFacts,withFinancialPeers,financialFilingDates,yearsFromFinancialFacts} from '../../lib/value/financial-facts';
import {kindFor} from '../../lib/value/universe';
import {combine} from '../../lib/value/jev/combine';
import {valueCompany,valuationMargin} from '../../lib/value/valuation';
import {earningsVolatility} from '../../lib/value/history';
import {buyReturnInputs} from '../../lib/value/owner-return';
import {publishedBuyPrice} from '../../lib/value/buy-price';
import {readPrices} from '../../lib/value/price-files';
import {annualPrefix,quarterStart,scorePurchase} from '../../lib/value/buffett-calibration';
import {checkIntegrity} from '../../lib/value/integrity';
import {valuationFlags} from '../../lib/value/data-quality';
import type {Company,Year,Analysis,Fundamentals} from '../../lib/value/types';
const root=process.env.VALUE_CORPUS_DIR??path.join(os.homedir(),'value-corpus'),out=path.join(root,'staging/financials-1');
const disk=()=>{const s=statfsSync('/');if(s.bavail*s.bsize<5*1024**3)throw Error('Disk below 5 GB');};
const read=(p:string)=>existsSync(p)?JSON.parse(readFileSync(p,'utf8')):null;
const get=(p:string)=>read(path.join(root,p));
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const write=(n:string,x:unknown)=>{disk();writeFileSync(path.join(out,n),JSON.stringify(x,null,2)+'\n');};
disk();mkdirSync(out,{recursive:true});
const companies:Company[]=readFileSync(path.join(root,'universe.jsonl'),'utf8').trim().split('\n').map(l=>JSON.parse(l));
const cs=new Map(companies.map(c=>[c.id,c]));
const member=new Set<string>();for(const f of readdirSync(path.join(root,'staging/universe-1/index')).filter(n=>n.endsWith('.json')))for(const r of get('staging/universe-1/index/'+f))member.add(r.id);
const quotes={...readPrices(path.join(root,'publish-repo/prices')),...readPrices(path.join(root,'prices'))};
const code=(tests:ReturnType<typeof runNumericTests>)=>Object.values(tests).map(t=>t.numeric[0].toUpperCase()).join('');
const prepared=companies.filter(c=>member.has(c.id)&&['bank','insurer'].includes(c.kind)).flatMap(company=>{
 const f:Fundamentals=get(`fundamentals/${company.id}.json`),a:Analysis=get(`analysis/${company.id}.json`);if(!f||!a)return [];
 const raw=get(`raw/eodhd/${company.id}.json`),n=raw?normalizeEodhd(raw,company.id):null;
 const mapped=new Map(n?.fundamentals.years.map(y=>[y.end,y]));
 let years=f.years.map(y=>({...y,...(mapped.has(y.end)?financialFields(mapped.get(y.end)!):{})}));
 const facts=read(path.join(out,`${company.id}.companyfacts.json`));if(facts)years=supplementFinancialFacts(years,facts);
 const kind=kindFor({...company,lending:years.at(-1)});if(!['bank','insurer'].includes(kind))return [];
 return [{company:{...company,kind},years,a,f,factsHash:facts?hash(facts):null,inputHash:hash({f,a,raw})}];
});
const current=withFinancialPeers(prepared).map(({company,years,a,f,factsHash,inputHash})=>{
 const numeric=runNumericTests({years,kind:company.kind,industry:company.industry});
 const t5=Object.values(numeric).map(t=>combine({numeric:t.numeric,kind:company.kind,jev:a.tests[t.key as keyof typeof a.tests].jev??[]})[0].toUpperCase()).join('');
 const beforeT5=Object.values(a.tests).filter(t=>t.key!=='price').map(t=>t.result[0].toUpperCase()).join('');
 const old=a.valuation,vol=earningsVolatility({opMarginCv:numeric.understandable.metrics.roeCv??null});
 const v=old?valueCompany({years,kind:company.kind,currency:f.currency,bondYield:old.bondYield,cyclical:vol==='volatile',currentShares:old.shares,ttm:f.ttm,qualityPass:t5==='PPPPP'}).valuation:null;
 if(v&&old?.perShareTrading){const {currency,fxRate}=old.perShareTrading;v.perShareTrading={currency,fxRate,low:v.perShare.low*fxRate,mid:v.perShare.mid*fxRate,high:v.perShare.high*fxRate};}
 const mos=valuationMargin(v,vol),quote=quotes[company.id],price=quote?.[0]??null;
 const flags=[...(a.dataQualityFlags??[]),...valuationFlags({price,mid:v?.perShareTrading?.mid??v?.perShare.mid??null,assumptions:v?.assumptions??[]})];
 const publication=(val:typeof v,t:string,m:number)=>{const ps=val?.perShareTrading??(val?.currency===company.currency?val?.perShare:null);return publishedBuyPrice({st:a.status==='scored'?'s':'i',t,v:ps?[ps.low,ps.mid,ps.high]:null,m,dataQualityFlags:flags,buyReturnInputs:buyReturnInputs(val,company.currency),shareSources:val?.shareSources},quote);};
 const before=publication(old,beforeT5,a.requiredMos??.5),after=publication(v,t5,mos);
 return {id:company.id,name:company.name,kind:company.kind,currency:company.currency,price,beforeT5,t5,numericT5:code(numeric),before:before.b,after:after.b,score:scorePurchase(v,mos,price,t5,!flags.length&&a.status==='scored'),mos,flags,tests:numeric,latest:years.at(-1),years,inputHash,factsHash};
});
write('index-financials.json',current);
const baseline=get('staging/valuation-2/index-buy-zone.json');
write('index-buy-zone.json',{members:member.size,financials:current.length,priorV2Buys:baseline.after.map((r:any)=>r.id),before:current.filter(r=>r.before).map(r=>r.id),after:current.filter(r=>r.after),added:current.filter(r=>!r.before&&r.after),removed:current.filter(r=>r.before&&!r.after)});
const oldPurchases=get('staging/valuation-2/purchases.json');
const purchases=oldPurchases.map((p:any)=>{
 if(!p.financialInputs||p.id==='AXP.US'||p.id==='MCO.US')return {...p,financialBefore:p.after,financialAfter:p.after,beforeT5:p.t5};
 const c=cs.get(p.id)??get(`companies/${p.id}.json`),input=p.financialInputs;
 if(c&&kindFor({...c,lending:input.years.at(-1)})==='operating')return {...p,financialBefore:p.after,financialAfter:p.after,beforeT5:p.t5,sectorExcluded:true};
 const raw=get(`raw/eodhd/${p.id}.json`)??get(`staging/buffett-1/raw/${p.id}.json`);
 const normalized=raw?normalizeEodhd(raw,p.id).fundamentals.years:[];
 const m=new Map(normalized.map(y=>[y.end,y]));let years:Year[]=input.years.map((y:Year)=>({...y,...(m.has(y.end)?financialFields(m.get(y.end)!):{})}));
 const facts=read(path.join(out,`${p.id}.companyfacts.json`));if(facts)years=supplementFinancialFacts(years,facts,p.cutoff);
 const tests=runNumericTests({years,kind:input.kind,industry:c?.industry}),t5=code(tests);
 const vol=earningsVolatility({opMarginCv:tests.understandable.metrics.roeCv??null});
 const v=valueCompany({years,kind:input.kind,currency:input.reporting,bondYield:input.bondYield,cyclical:vol==='volatile',qualityPass:t5==='PPPPP'}).valuation;
 if(v&&p.proposedValuation?.perShareTrading){const {currency,fxRate}=p.proposedValuation.perShareTrading;v.perShareTrading={currency,fxRate,low:v.perShare.low*fxRate,mid:v.perShare.mid*fxRate,high:v.perShare.high*fxRate};}
 const flags=valuationFlags({price:p.price,mid:v?.perShareTrading?.mid??v?.perShare.mid??null,assumptions:v?.assumptions??[]});
 const after=scorePurchase(v,valuationMargin(v,vol),p.price,t5,p.integrity?.ok&&p.afterFlags?.length===0&&flags.length===0);
 return {...p,beforeT5:p.t5,t5,tests,financialBefore:p.after,financialAfter:after};
});
write('purchases.json',purchases);
const headline=purchases.filter((p:any)=>p.date>='2005'&&p.date<'2026');
const stats=(r:any[],field:string)=>({records:r.length,quality:r.filter(p=>p[field].quality).length,buys:r.filter(p=>p[field].buy).length,within20:r.filter(p=>p[field].within20).length});
write('purchase-summary.json',{before:stats(headline,'financialBefore'),after:stats(headline,'financialAfter'),changes:headline.filter((p:any)=>p.financialBefore.buy!==p.financialAfter.buy||p.financialBefore.within20!==p.financialAfter.within20).map((p:any)=>({id:p.id,date:p.date,before:p.financialBefore,after:p.financialAfter,t5:p.t5})),regretted:purchases.filter((p:any)=>p.regretted).map((p:any)=>({id:p.id,t5:p.t5,buy:p.financialAfter.buy}))});
const cases:Array<[string,number]>=[];
for(const fy of [2011,2012,2013,2014,2015,2016])cases.push(['WFC.US',fy]);
for(const [id,fys] of Object.entries({'USB.US':[2011,2015,2019],'BNY.US':[2011,2015,2019],'GS.US':[2020],'BAC.US':[2017,2019,2023],'JPM.US':[2019],'CB.US':[2023],'AXP.US':[2011,2019],'TRV.US':[2008,2009,2010,2011,2012],'DBK.XETRA':[2011,2015,2019],'C.US':[2008,2009,2010,2011,2012],'AIG.US':[2008,2009,2010,2011,2012]}))for(const fy of fys)cases.push([id,fy]);
const historical=cases.map(([id,fy])=>{
 const bad=['DBK.XETRA','C.US','AIG.US'].includes(id);
 const date=bad?`${fy+1}-09-30`:`${fy}-06-30`,cutoff=quarterStart(date),c=cs.get(id)??get(`companies/${id}.json`),raw=get(`raw/eodhd/${id}.json`);if(!c||!raw)return {id,date,missing:true};
 const filed:Record<string,string>={};for(const table of Object.values(raw.Financials) as any[])for(const [end,row] of Object.entries(table.yearly??{}) as [string,any][]){if(row.filing_date&&row.filing_date>end)filed[end]=[filed[end]??'',row.filing_date].sort().at(-1)!;if(end>=cutoff)delete table.yearly[end];}
 const facts=read(path.join(out,`${id}.companyfacts.json`));
 if(facts)for(const [end,date] of Object.entries(financialFilingDates(facts)))if(!filed[end]||filed[end]<=end||date<filed[end])filed[end]=date;
 let assumed=0;
 if(bad)for(const end of Object.keys(raw.Financials.Income_Statement.yearly))if(!filed[end]){filed[end]=new Date(Date.parse(end)+183*86400000).toISOString().slice(0,10);assumed++;}
 let years=annualPrefix(normalizeEodhd(raw,id).fundamentals.years,filed,date);if(facts)years=supplementFinancialFacts(years,facts,cutoff);
 if(bad&&facts&&years.length<10){const sec=yearsFromFinancialFacts(facts,id==='DBK.XETRA'?'EUR':'USD',cutoff);if(sec.length>years.length)years=sec;}

 const kind=kindFor({...c,lending:years.at(-1)}),tests=runNumericTests({years,kind,industry:c.industry});
 return {id,date,targetFiscalYear:bad?fy:undefined,assumedFilingDates:assumed,financialInputs:{years,kind,industry:c.industry},kind,years:years.length,last:years.at(-1)?.fy,t5:code(tests),tests,inputHash:hash(years)};
});
const creditSuisse=read(path.join(out,'CS.companyfacts.json'));
if(creditSuisse)for(let fy=2015;fy<=2022;fy++){
 const cutoff=`${fy+1}-09-01`,years=yearsFromFinancialFacts(creditSuisse,'CHF',cutoff),tests=runNumericTests({years,kind:'bank'});
 historical.push({id:'CS',date:cutoff,targetFiscalYear:fy,assumedFilingDates:0,financialInputs:{years,kind:'bank',industry:'Banks - Diversified'},kind:'bank',years:years.length,last:years.at(-1)?.fy,t5:code(tests),tests,inputHash:hash(years)});
}
write('historical-cases.json',historical);console.log(JSON.stringify({index:current.length,added:current.filter(r=>!r.before&&r.after).map(r=>r.id),purchases:stats(headline,'financialAfter'),historicalPass:historical.filter(r=>r.t5==='PPPPP').length},null,2));
