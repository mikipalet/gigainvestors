import {expect,it} from 'vitest';
import {deriveYears} from '@/lib/value/derive';
import {emptyYear} from '@/lib/value/completeness/second-sources';
it('keeps the EBIT proxy basis when a secondary source fills total operating expenses',()=>{
 const year={...emptyYear('2024-03-31','JPY'),revenue:19567601000000,grossProfit:2359709000000,costOfSales:17207892000000,
  operatingExpenses:18900174000000,operatingIncome:1575417000000,preTaxIncome:1362594000000,interestExpense:212823000000,
  provenance:{operatingIncome:{source:'statements',field:'operatingIncome',method:'derived' as const,inputs:['preTaxIncome','interestExpense','EBIT proxy']}}};
 expect(deriveYears([year])[0].operatingIncome).toBe(1575417000000);
 expect(deriveYears([{...year,preTaxIncome:1400000000000}])[0].operatingIncome).toBe(1612823000000);
});

import {applyPublishedSplitFactors} from '@/lib/value/split-replay';
import type {Dossier} from '@/lib/value/types';
it('changes share units and their consequences without recomputing published economics',()=>{
 const series={shares:[[2020,10],[2021,50]],perShareValue:[[2020,20],[2021,4]],marketCap:[[2020,100],[2021,500]],roic:[[2020,.2],[2021,.3]]};
 const test={key:'management',numeric:'fail',result:'fail',jev:[],reasons:[],metrics:{shareCagr5:.38,nonAcquisitionShareCagr5:.38,retainedEarnings:80,marketCapGain:400,retainedStartFy:2020,retainedEndFy:2021,roicLast3Median:.3},series};
 const d={id:'X.US',company:{kind:'operating'},tests:{management:test,economics:{...test,key:'economics',metrics:{roiic:1.62,ownerEarningsTotal:100},series:{ownerEarnings:[[2020,50],[2021,50]]}}},series:{...series,revenuePerShare:[[2020,100],[2021,20]],netCash:[[2020,30]]},valueHistory:[[2020,80,100,120]],valuation:null} as unknown as Dossier;
 const fixed=applyPublishedSplitFactors(d,new Map([[2020,5]]));
 expect(fixed.series.revenuePerShare).toEqual([[2020,20],[2021,20]]);
 expect(fixed.valueHistory).toEqual([[2020,16,20,24]]);
 expect(fixed.tests.management.series.shares).toEqual([[2020,50],[2021,50]]);
 expect(fixed.tests.management.metrics.marketCapGain).toBe(0);
 expect(fixed.tests.economics).toEqual(d.tests.economics);
 expect(fixed.series.netCash).toEqual(d.series.netCash);
 expect(fixed.tests.management.series.roic).toEqual(d.tests.management.series.roic);
 expect(fixed.tests.management.metrics.retainedEarnings).toBe(80);
 expect(d.series.revenuePerShare[0][1]).toBe(100);
});

import {nonShareDifferences} from '@/lib/value/split-replay';
it('blocks any unrelated metric, series or valuation change including raw metrics',()=>{
 const d={series:{netCash:[[2024,100]]},tests:{economics:{series:{ownerEarnings:[[2024,50]]},metrics:{roiic:1.62},rawMetrics:{roiic:1.62}}},valuation:{normalized:50}} as unknown as Dossier;
 const altered=structuredClone(d);altered.tests.economics.metrics.roiic=-22.8;altered.tests.economics.rawMetrics!.roiic=-22.8;altered.series.netCash[0][1]=90;altered.tests.economics.series.ownerEarnings[0][1]=60;altered.valuation!.normalized=60;
 expect(nonShareDifferences(d,altered)).toEqual(['series.netCash','tests.economics.series.ownerEarnings','tests.economics.metrics.roiic','tests.economics.rawMetrics.roiic','valuation']);
});

it('protects memo return charts and capital-allocation totals too',()=>{
 const d={series:{},tests:{},valuation:null,ownerMemo:{lines:[{question:2,chart:{label:'return on capital',points:[[2024,.2]]}},{question:4,capitalAllocation:[{fy:2024,buybacks:100}]}]}} as unknown as Dossier;
 const altered=structuredClone(d);altered.ownerMemo!.lines[0].chart!.points=[];altered.ownerMemo!.lines[1].capitalAllocation![0].buybacks=90;
 expect(nonShareDifferences(d,altered)).toEqual(['ownerMemo.question2.chart','ownerMemo.question4.capitalAllocation']);
});
