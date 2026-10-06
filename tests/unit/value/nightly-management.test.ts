import {expect,it} from 'vitest';
import cb from '../../fixtures/value/nightly-management/CB.US.json';
import dpz from '../../fixtures/value/nightly-management/DPZ.US.json';
import {correctAnnualSources} from '@/lib/value/annual-source-corrections';
import {analyzeCompany} from '@/lib/value/analyze-company';
import {runNumericTests} from '@/lib/value/tests';
import {ruleReading} from '@/lib/value/rule-reading';
import {tileMetric} from '@/lib/value/tile-metric';
import type {Company,Year,ReportMeta,PriceHistory} from '@/lib/value/types';

it('recognizes sustained financial share shrinkage after an older acquisition without changing per-share capital',()=>{
 const test=runNumericTests({years:cb.years as unknown as Year[],kind:'insurer'}).management;
 expect(test.numeric).toBe('pass');
 expect(test.metrics.shareCagr).toBeCloseTo(.020169051016474482,12);
 expect(test.metrics.shareCagr5).toBeCloseTo(-.024031636508239917,12);
 expect(test.metrics.retainedBookGain).toBeCloseTo(95.09694480797913,10);
 const display={...test,result:test.numeric,jev:[]};
 expect(ruleReading(display,'insurer').numeric).toBe('pass');
 expect(tileMetric(display,'insurer').value).toBeCloseTo(-.024031636508239917,12);
});
it('still rejects persistent financial dilution and requires a complete recent window',()=>{
 const growing=(cb.years as unknown as Year[]).map((y,i)=>({...y,dilutedShares:328835378*1.04**i}));
 expect(runNumericTests({years:growing,kind:'insurer'}).management.numeric).toBe('fail');
 const gapped=(cb.years as unknown as Year[]).filter(y=>y.fy!==2022);
 expect(runNumericTests({years:gapped,kind:'insurer'}).management.numeric).not.toBe('pass');
});
it('values a first-week fiscal year end with the nearby preceding month, not the following month-end',async()=>{
 let years:readonly Year[]=[];
 const a=await analyzeCompany({company:dpz.company as Company,
  fundamentals:{id:'DPZ.US',currency:'USD',fetchedAt:'2026-10-06T00:00:00Z',years:correctAnnualSources(dpz.years as unknown as Year[],dpz.shareFacts,{source:'https://data.sec.gov/api/xbrl/companyfacts/CIK0001286681.json'}),integrity:{ok:true,reasons:[]}},
  sections:{},report:dpz.report as ReportMeta,bondYield:.04,ask:async()=>[],
  priceHistory:dpz.priceHistory as PriceHistory,onMemoYears:y=>{years=y;}});
 // 2 January 2022 is a Sunday: December's close, not 31 January's, belongs to FY2021.
 expect(years.find(y=>y.fy===2021)!.marketCap).toBeCloseTo(36138273*564.3300170898438,2);
 expect(a.tests.management.result).toBe('pass');
 expect(a.tests.management.metrics.buybackYieldSpearman).toBeCloseTo(-.45454545454545453,12);
 expect(a.tests.management.metrics.shareCagr).toBeCloseTo(-.047214122296531325,12);
});

it('keeps real allocation failures after a share-window pass',()=>{
 const ys=(cb.years as unknown as Year[]).map(y=>({...y,equity:1,buybacks:0}));
 const test=runNumericTests({years:ys,kind:'insurer'}).management;
 expect(test.numeric).toBe('fail');
 expect(test.reasons).toContain('book per share gain below retained common earnings per share');
});
