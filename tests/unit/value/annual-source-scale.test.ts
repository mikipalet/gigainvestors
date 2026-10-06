import {expect,it} from 'vitest';
import {correctAnnualSources} from '@/lib/value/annual-source-corrections';
import {emptyYear} from '@/lib/value/completeness/second-sources';
const y=(fy:number,shares:number|null)=>({...emptyYear(`${fy}-12-31`,'USD'),dilutedShares:shares});
const f=(fy:number,val:number,extra={})=>({start:`${fy}-01-01`,end:`${fy}-12-31`,val,filed:'2026-02-24',form:'10-K',...extra});
const facts=(rows:ReturnType<typeof f>[],unit='shares')=>({facts:{'us-gaap':{WeightedAverageNumberOfDilutedSharesOutstanding:{units:{[unit]:rows}}}}});
const options={source:'https://data.sec.gov/companyfacts'};
it('normalizes million-scale comparisons using earlier same-period facts and independent annual counts',()=>{
 const source=facts([f(2021,751800000,{filed:'2022-02-24'}),f(2021,751.8),f(2022,741.3)]);
 const fixed=correctAnnualSources([y(2021,751700000),y(2022,741000000)],source,options);
 expect(fixed.map(v=>v.dilutedShares)).toEqual([751800000,741300000]);
 expect(fixed[0].provenance?.dilutedShares.method).toBe('derived');
 expect(fixed[0].provenance?.dilutedShares.inputs?.join(' ')).toContain('1000000');
 expect(correctAnnualSources(fixed,source,options)).toEqual(fixed);
});
it('normalizes thousands while retaining current-basis share changes',()=>{
 const fixed=correctAnnualSources([y(2022,418000000),y(2023,410000000)],facts([f(2022,419192),f(2023,409948000)]),options);
 expect(fixed.map(v=>v.dilutedShares)).toEqual([419192000,409948000]);
});
it('never overwrites valid pre-spin shares with zero or absent observations',()=>{
 const before=[y(2020,326664000),y(2021,326664000)];
 expect(correctAnnualSources(before,facts([f(2020,0)]),options).map(v=>v.dilutedShares)).toEqual([326664000,326664000]);
});
it('rejects a scale jump without independent corroboration rather than inventing a multiplier',()=>{
 expect(correctAnnualSources([y(2025,750000000)],facts([f(2025,716.4)]),options)[0].dilutedShares).toBe(750000000);
});
it('treats XBRL decimals as precision, not a scale multiplier',()=>{
 expect(correctAnnualSources([y(2024,410000000),y(2025,399000000)],facts([f(2024,409948000,{decimals:-3}),f(2025,399861000,{decimals:-3})]),options).map(v=>v.dilutedShares)).toEqual([409948000,399861000]);
});
it('reads explicit thousands units without applying decimals a second time',()=>{
 expect(correctAnnualSources([y(2024,410000000),y(2025,399000000)],facts([f(2024,409948,{decimals:0}),f(2025,399861,{decimals:0})],'shares in thousands'),options).map(v=>v.dilutedShares)).toEqual([409948000,399861000]);
});
it('ignores zero revenue corrections and ambiguous scaled facts',()=>{
 const before={...y(2025,400000000),revenue:1000000000};
 const source={facts:{'us-gaap':{Revenues:{units:{USD:[f(2025,0)]}},WeightedAverageNumberOfDilutedSharesOutstanding:{units:{shares:[f(2025,400),f(2025,401)]}}}}};
 const [after]=correctAnnualSources([before],source,{...options,financial:true});
 expect(after.revenue).toBe(before.revenue);expect(after.dilutedShares).toBe(before.dilutedShares);
});
it('retains a reviewed conversion of the exact same source fact instead of losing its documented split basis',()=>{
 const prior={...y(2015,439387422.75),provenance:{dilutedShares:{source:options.source+'#original',field:'dilutedShares',method:'derived' as const,inputs:['Reported 130188866; subsequent splits 3.375, current share units']}}};
 const [after]=correctAnnualSources([prior],facts([f(2015,130188866,{filed:'2018-02-23',accn:'original'})]),options);
 expect(after.dilutedShares).toBe(prior.dilutedShares);expect(after.provenance).toEqual(prior.provenance);
});
it('keeps valid share counts when a reviewed cached transcription contains a zero count',async()=>{
 const {correctCachedAnnualSources}=await import('@/lib/value/annual-source-corrections');
 const company={id:'SPIN.US',kind:'operating',sector:'Utilities'} as any;
 const reviewed={source:options.source,facts:{facts:{}},reportedFacts:[{end:'2025-12-31',currency:'USD',source:options.source,quote:'Pre-spin count unavailable',correction:true,values:{dilutedShares:0,sharesOutstanding:0}}]};
 const read=<T>(p:string)=>p==='raw/annual-reviewed/SPIN.US.json'?reviewed as T:null;
 expect(correctCachedAnnualSources(company,[{...y(2025,326664000),sharesOutstanding:326664000}],null,read)[0]).toMatchObject({dilutedShares:326664000,sharesOutstanding:326664000});
});
it('rejects dimensionless shares from a filing whose statement currency contradicts the annual inputs',()=>{
 const before={...y(2025,434777900),currency:'EUR',netIncome:1400000000};
 const source=facts([f(2025,2549000000)]);
 Object.assign(source.facts['us-gaap'],{NetIncomeLoss:{units:{USD:[f(2025,18000000000)]}},Revenues:{units:{USD:[f(2025,65000000000)]}}});
 expect(correctAnnualSources([before],source,options)[0].dilutedShares).toBe(434777900);
});
it('rejects unproven ordinary-share or split basis changes even below thousand-scale units',()=>{
 for(const factor of [1/25,1/5,8,10]){
  const before=[y(2024,2100000000),y(2025,2100000000)];
  const after=correctAnnualSources(before,facts([f(2025,2100000000*factor)]),options);
  expect(after.map(v=>v.dilutedShares)).toEqual(before.map(v=>v.dilutedShares));
 }
});
it('does not fill absent shares with a different basis than the neighbouring annual counts',()=>{
 expect(correctAnnualSources([y(2024,2100000000),y(2025,null)],facts([f(2025,16800000000)]),options)[1].dilutedShares).toBeNull();
});
it('repairs an isolated bad cached basis when neighbouring years corroborate the source',()=>{
 const before=[y(2023,184000000),y(2024,23000000),y(2025,194000000)];
 expect(correctAnnualSources(before,facts([f(2024,185000000)]),options)[1].dilutedShares).toBe(185000000);
});
it('does not introduce an adjacent-year break even when the same-year difference is under twofold',()=>{
 const before=[y(2019,388000000),y(2020,93000000),y(2021,95000000)];
 expect(correctAnnualSources(before,facts([f(2020,55000000)]),options).map(v=>v.dilutedShares)).toEqual(before.map(v=>v.dilutedShares));
});
it('keeps a valid share basis when cached completion would reintroduce a pre-reverse-split count',async()=>{
 const {completeCachedYears}=await import('@/lib/value/completeness/cached-years');
 const before=Array.from({length:9},(_,i)=>y(2017+i,1754250));
 const incoming=before.map(v=>({...v,dilutedShares:v.fy===2022?28068000:v.dilutedShares}));
 const read=<T>(path:string):T|null=>path==='completeness/verified/TEST.US.json'?{id:'TEST.US',fundamentals:{years:incoming,splits:[]},patch:{}}as T:null;
 expect(completeCachedYears({id:'TEST.US',cik:null,source:'eodhd'},before,read).map(v=>v.dilutedShares)).toEqual(before.map(v=>v.dilutedShares));
});
it('uses the same inclusive jump boundary as the integrity gate',()=>{
 const before=[y(2024,100000000),y(2025,400000000)];
 expect(correctAnnualSources(before,facts([f(2025,500000000)]),options)[1].dilutedShares).toBe(400000000);
});
