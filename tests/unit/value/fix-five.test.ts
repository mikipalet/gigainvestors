import {createElement} from 'react';
import {expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {alignHistoryShares} from '@/lib/value/history-split-basis';
import {humanVerdict} from '@/lib/value/judgement/apply';
import {numericMemo} from '@/lib/value/owner-memo';
import {BusinessDepth} from '@/components/value/BusinessDepth';
import type {Analysis,Fundamentals,Year} from '@/lib/value/types';
const f={id:'7203.JP',fetchedAt:'2026-10-02',currency:'JPY',integrity:{ok:true,reasons:[]},years:Array.from({length:10},(_,i)=>({fy:2013+i,end:`${2013+i}-03-31`,currency:'JPY',dilutedShares:i<5?3:15,sharesOutstanding:i<5?3:15,netIncome:300,equity:1000,basicEps:i<5?100:20,dividendsPaid:30,dividendsPerShare:i<5?10:2}))} as unknown as Fundamentals;
it('reconciles Toyota comparative shares before the actual split without double adjusting',()=>{
 const out=alignHistoryShares(f,[['2021-09',2000],['2021-10',2050]]);
 expect(out.years.map(y=>y.dilutedShares)).toEqual(Array(10).fill(15));
 expect(out.years.map(y=>y.basicEps)).toEqual(Array(10).fill(20));
 expect(out.years.map(y=>y.dividendsPerShare)).toEqual(Array(10).fill(2));
 expect(out.years.map(y=>y.sharesOutstanding)).toEqual(Array(10).fill(15));
 expect(alignHistoryShares(out,[])).toEqual(out);expect(f.years[0].dilutedShares).toBe(3);
});
it('uses observed assets when older Toyota equity is absent',()=>{
 const input={...f,years:f.years.map(y=>({...y,equity:null,totalAssets:1000}))};
 expect(alignHistoryShares(input,[]).years.map(y=>y.dilutedShares)).toEqual(Array(10).fill(15));
});
it('supports reverse splits and leaves already-restated EPS intact',()=>{
 const input={...f,id:'X.US',splits:[{date:'2021-10-01',factor:.1}],years:f.years.map((y,i)=>({...y,dilutedShares:i<5?150:15,basicEps:20,sharesOutstanding:15}))};
 const out=alignHistoryShares(input,[]);
 expect(out.years.map(y=>y.dilutedShares)).toEqual(Array(10).fill(15));
 expect(out.years.map(y=>y.basicEps)).toEqual(Array(10).fill(20));
 expect(out.years.map(y=>y.sharesOutstanding)).toEqual(Array(10).fill(15));
});
it('never erases genuine dilution without a corporate action',()=>{
 expect(alignHistoryShares({...f,id:'X.US'},[])).toEqual({...f,id:'X.US'});
});
const a={id:'X.US',company:{kind:'operating',currency:'USD'},report:{},series:{},tests:Object.fromEntries(['understandable','moat','economics','management','accounting'].map(k=>[k,{result:'pass',metrics:{},series:{}}]))} as unknown as Analysis;
it('distinguishes fair value from expensive across exact boundaries',()=>{
 for(const ratio of [.99,1])expect(humanVerdict(a,false,true,ratio)).toBe('A wonderful business, almost at a fair price');
 expect(humanVerdict(a,false,true,1.01)).toBe('A wonderful business at too high a price');
 expect(humanVerdict(a,true,true,.8)).toBe('A wonderful business at a fair price');
 expect(humanVerdict(a,false,false,null)).not.toContain('assumes');
});
it('uses latest three fiscal years and never bridges missing fiscal years',()=>{
 const years=[2021,2022,2023,2024,2025].map((fy,i)=>({fy,revenue:100,grossProfit:30-i} as Year));
 expect(numericMemo(a,years,null).find(l=>l.question===2)?.answer).toContain('26% to 28% during 2023–25');
 expect(numericMemo(a,years.filter(y=>y.fy!==2024),null).find(l=>l.question===2)).toBeUndefined();
});
it('caps capital returns in memo annual cells and omits meaningless change precision',()=>{
 const analysis={...a,ownerMemo:{version:1,asOf:'2026-10-02',inputHash:'test',lines:[{question:2,answer:'Returns exceed 100%.',evidence:[],basis:'computed',chart:{label:'return on capital',unit:'percent',points:[[2020,3.4224555735],[2021,4.8844488828]]}}]}} as Analysis;
 vi.stubGlobal('innerWidth',1728);vi.stubGlobal('innerHeight',970);
 let html:string;
 try {html=renderToStaticMarkup(createElement(BusinessDepth,{analysis,selected:'2'}));} finally {vi.unstubAllGlobals();}
 expect(html).not.toMatch(/342\.2%|488\.4%|146\.2pp/);expect(html).toContain('&gt;100%');
 expect(analysis.ownerMemo!.lines[0].chart!.points[0][1]).toBe(3.4224555735);
});

it('normalizes intermittent original-share observations between restated comparative blocks',()=>{
 const input={...f,years:f.years.map((y,i)=>({...y,dilutedShares:i===7||i<5?3:15,basicEps:i===7?0:i<5?100:20}))};
 const out=alignHistoryShares(input,[]);
 expect(out.years.map(y=>y.dilutedShares)).toEqual(Array(10).fill(15));
 expect(alignHistoryShares(out,[])).toEqual(out);
});
it('keeps the memo window on the published analysis year during a rolling source refresh',()=>{
 const analysis={...a,historyCoverage:{years:10,first:2016,last:2025,source:'eodhd'}} as Analysis;
 const years=[2022,2023,2024,2025,2026].map((fy,i)=>({fy,revenue:100,grossProfit:30-i} as Year));
 expect(numericMemo(analysis,years,null).find(l=>l.question===2)?.answer).toContain('27% to 29% during 2023–25');
});
