import { expect, it } from 'vitest';
import { run } from '@/lib/value/tests/management';
import { makeYears } from './synthetic';
import { buildOutput } from '@/lib/value/build-output';
import { assertIndexConsistency } from '@/lib/value/consistency';
import { displayName } from '@/lib/value/presentation';
import type { Analysis, IndexRow, StoreMeta } from '@/lib/value/types';

it('marks only unresolved price-input checks as pending, never measured failures or missing filings', () => {
 const years=makeYears({overrides:{marketCap:null}});
 expect(run({years,kind:'operating',priceHistoryPending:true}).pending).toBe(true);
 expect(run({years,kind:'operating',priceHistoryPending:false}).pending).not.toBe(true);
 expect(run({years:years.map(y=>({...y,netIncome:null})),kind:'operating',priceHistoryPending:true}).pending).not.toBe(true);
 expect(run({years:years.map((y,i)=>({...y,dilutedShares:10*1.2**i})),kind:'operating',priceHistoryPending:true}).pending).not.toBe(true);
});
it('counts near misses against quality gates regardless of price; partitions every cumulative gate',()=>{
 const a=(id:string,state:'pass'|'fail'|'unclear',pending=false)=>({id,company:{id,name:id,country:'US',currency:'USD',listings:[],kind:'operating'},status:'scored',asOf:'2026-09-29',versions:{pipeline:'6',questions:'1'},tests:Object.fromEntries(['understandable','moat','economics','management','accounting'].map(key=>[key,{key,result:key==='management'?state:'pass',numeric:key==='management'?state:'pass',pending:key==='management'&&pending,metrics:{},series:{},reasons:[],jev:[]}]))}) as unknown as Analysis;
 const {files}=buildOutput({analyses:[a('F.US','fail'),a('C.US','unclear',true),a('U.US','unclear'),a('P.US','pass')],holdersByTicker:{},investorNames:{},fx:{}});
 const meta=files['meta.json'] as StoreMeta, rows=files['index/default.json'] as IndexRow[];
 expect(rows.map(r=>r.t).sort()).toEqual(['PPPCP','PPPFP','PPPPP','PPPUP']);
 expect(meta.funnel!.gates[3]).toMatchObject({passing:1,fail:1,checking:1,unclear:1,failsOnlyThis:1});
 expect(()=>assertIndexConsistency({meta,rows})).not.toThrow();
 expect(()=>assertIndexConsistency({meta,rows:rows.filter(r=>!r.t.includes('F'))})).toThrow('near-miss');
});
it('normalises legal names without leaving a dangling article',()=>{
 expect(displayName('The Coca-Cola Company')).toBe('Coca-Cola');
 expect(displayName('Coca-Cola FEMSA S.A.B. de C.V')).toBe('Coca-Cola FEMSA');
});

it('carries pending provenance from analysis to publish and settles it when prices arrive',async()=>{
 const {analyzeCompany}=await import('@/lib/value/analyze-company');
 const company={id:'TEST.US',name:'Test',code:'TEST',exchange:'US',country:'US',currency:'USD',kind:'operating',listings:['TEST.US'],industry:null} as Analysis['company'];
 const fundamentals={id:company.id,currency:'USD',years:makeYears(),integrity:{ok:true,reasons:[]},fetchedAt:'2026-09-29'};
 const args:Parameters<typeof analyzeCompany>[0]={company,fundamentals,sections:{},report:{id:company.id,kind:'description',url:null,filed:null,period:null,sections:[]},bondYield:.04,ask:async()=>[]};
 const pending=await analyzeCompany(args as Parameters<typeof analyzeCompany>[0]);
 expect(pending.tests.management).toMatchObject({result:'unclear',pending:true});
 const exhausted=await analyzeCompany({...args,priceHistoryPending:false} as Parameters<typeof analyzeCompany>[0]);
 expect(exhausted.tests.management.result).toBe('unclear');expect(exhausted.tests.management.pending).not.toBe(true);
 const settled=await analyzeCompany({...args,priceHistory:fundamentals.years.map((y,i)=>[y.end.slice(0,7),100+i*10])} as Parameters<typeof analyzeCompany>[0]);
 expect(settled.tests.management.result).toBe('pass');expect(settled.tests.management.pending).not.toBe(true);
});
it('classifies brokers and exchanges for ROE without turning payment networks into banks',async()=>{
 const {kindFor}=await import('@/lib/value/universe');
 for(const industry of ['Capital Markets','Financial Data & Stock Exchanges','Securities Brokerage']) expect(kindFor({sector:'Financial Services',industry})).toBe('financial');
 expect(kindFor({sector:'Financial Services',industry:'Credit Services',id:'MA.US'})).toBe('operating');
});
it('formats axis ticks independently of data precision',async()=>{
 const {axisTick}=await import('@/lib/value/viz/layout');
 expect([0,5,50,1000,.5,.1,30e9].map(axisTick)).toEqual(['0','5','50','1K','0.5','0.1','30B']);
});
