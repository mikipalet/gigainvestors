import { describe, expect, it } from 'vitest';
import { snapshotForYear, filingMonth, summarizeSnapshots } from '@/lib/value/snapshots';
import { makeYears } from './synthetic';
import type { Company, Fundamentals, PriceHistory, SnapshotRow } from '@/lib/value/types';
const company: Company = { id:'TEST.US', code:'TEST', name:'Test', exchange:'US', country:'US', currency:'USD', isin:null,cik:null,lei:null,edinetCode:null,sector:null,industry:null,kind:'operating',listings:['TEST.US'],marketCapUsd:null,description:null,source:'eodhd' };
const fundamentals: Fundamentals = { id:company.id, currency:'USD', years:makeYears({from:2006,n:11,overrides:(_,i)=>({netIncome:100+i*10,operatingIncome:150+i*10,preTaxIncome:150+i*10,ocf:140+i*10,revenue:1000+i*100})}), integrity:{ok:true,reasons:[]}, fetchedAt:'2026-09-29' };
const prices: PriceHistory = [...fundamentals.years.map((y,i)=>[y.end.slice(0,7),50+i*30] as [string,number]), ['2017-02',50],['2017-03',100],['2026-08',150]];
const base = { company, fundamentals, prices, latestPrice:[150,'2026-09-28'] as [number,string], filedByPeriod:{'2016-12-31':'2017-02-20'}, bondYield:0.04, fxRate:1, asOf:'2026-09-29' };
describe('code-only fiscal snapshots', () => {
  it('uses the filing month, and adds three calendar months without end-of-month overflow', () => {
    expect(filingMonth('2016-12-31','2017-02-20')).toBe('2017-02');
    expect(filingMonth('2016-11-30')).toBe('2017-02');
    expect(filingMonth('2016-12-31','2015-01-01')).toBe('2017-03');
  });
  it('ignores all future fiscal data, current integrity verdict, TTM and input order', () => {
    const baseline = snapshotForYear({...base,fy:2016});
    const future = makeYears({from:2017,n:9,overrides:{equity:-999999,netIncome:-999999,dilutedShares:0}});
    const changed = {...fundamentals,years:[...fundamentals.years,...future].reverse(),ttm:future.at(-1),integrity:{ok:false,reasons:['future corruption']}};
    expect(snapshotForYear({...base,fundamentals:changed,fy:2016})).toEqual(baseline);
    expect(baseline?.[1]).toMatch(/^[PFUN]{5}$/);
    expect(baseline?.[2]).toBeGreaterThan(0);
    expect(baseline?.[4]).toBe(2); // 150 / February's 50 - 1, not March's 100.
    expect(fundamentals.years[0].marketCap).toBe(1000); // pure, no mutation
  });
  it('reruns the quality tests as of Y rather than copying a current verdict', () => {
    const good = snapshotForYear({...base,fy:2016})!;
    const bad = snapshotForYear({...base,fy:2016,fundamentals:{...fundamentals,years:fundamentals.years.map(y=>({...y,netIncome:-100,ocf:-100}))}})!;
    expect(bad[1]).not.toBe(good[1]);
    expect(bad[2]).toBeNull(); expect(bad[3]).toBe(false);
  });
  it('does not borrow a future/adjacent price and excludes unknown fiscal years', () => {
    expect(snapshotForYear({...base,fy:2016,prices:prices.filter(([m])=>m!=='2017-02')})).toBeNull();
    expect(snapshotForYear({...base,fy:2015,fundamentals:{...fundamentals,years:fundamentals.years.filter(y=>y.fy!==2015)}})).toBeNull();
    expect(snapshotForYear({...base,fy:2016,latestPrice:null})?.[4]).toBeNull();
    expect(snapshotForYear({...base,fy:2016,latestPrice:[150,'2016-01-01']})?.[4]).toBeNull();
    expect(snapshotForYear({...base,fy:2016,fxRate:null})?.slice(2,4)).toEqual([null,false]);
    expect(snapshotForYear({...base,fy:2016,asOf:'2017-02-15'})).toBeNull();
  });
  it('derives buy decisions from the same year value and its own margin of safety', () => {
    const low = snapshotForYear({...base,fy:2016,prices:[...prices.filter(([m])=>m!=='2017-02'),['2017-02',100]]})!;
    const high = snapshotForYear({...base,fy:2016,prices:[...prices.filter(([m])=>m!=='2017-02'),['2017-02',1000]]})!;
    expect(low[1]).toBe('PPPPP'); expect(low[3]).toBe(true);
    expect(high[3]).toBe(false); expect(high[2]!).toBeCloseTo(low[2]!*10,3);
  });
  it('averages finite returns only within the all, quality and buy cohorts', () => {
    expect(summarizeSnapshots([['A','PPPPP',.5,true,2],['B','PPPPP',2,false,0],['C','FFFFF',null,false,-.5],['D','PPPPP',null,false,null]])).toMatchObject({analysed:4,qualityPasses:3,atBuy:1,avgReturnAtBuy:2,avgReturnQuality:1,avgReturnAll:.5});
    expect(summarizeSnapshots([]).avgReturnAll).toBeNull();
  });
});

describe('history cohort medians and hit rates', () => {
  it('resists outliers and benchmarks every cohort against the whole universe median', () => {
    const rows: SnapshotRow[] = [
      ['A','PPPPP',.5,true,100], ['B','PPPPP',.5,true,1],
      ['C','PPPPP',.5,true,0], ['D','PPPPP',.5,true,null],
      ['E','PPPPP',2,false,2], ['F','FFFFF',null,false,-1],
      ['G','FFFFF',null,false,0], ['H','FFFFF',null,false,0],
    ];
    expect(summarizeSnapshots(rows)).toEqual({
      analysed:8, qualityPasses:5, atBuy:4,
      returnCountAll:7, returnCountQuality:4, returnCountAtBuy:3,
      medianReturnAll:0, medianReturnQuality:1.5, medianReturnAtBuy:1,
      hitRateAll:.4286, hitRateQuality:.75, hitRateAtBuy:.6667,
      avgReturnAll:14.5714, avgReturnQuality:25.75, avgReturnAtBuy:33.6667,
    });
  });
  it('averages the middle pair and compares against the unrounded median', () => {
    expect(summarizeSnapshots([
      ['A','PPPPP',.5,true,.0001], ['B','FFFFF',null,false,0],
    ])).toMatchObject({medianReturnAll:.0001, hitRateAll:.5, hitRateAtBuy:1});
  });
  it('excludes missing and nonfinite returns without shrinking total cohort sizes', () => {
    const summary = summarizeSnapshots([
      ['A','PPPPP',.5,true,null], ['B','PPPPP',.5,true,NaN],
      ['C','PPPPP',.5,true,Infinity], ['D','FFFFF',null,false,-.5],
    ]);
    expect(summary).toMatchObject({
      analysed:4, qualityPasses:3, atBuy:3,
      returnCountAll:1, returnCountQuality:0, returnCountAtBuy:0,
      medianReturnAll:-.5, medianReturnQuality:null, medianReturnAtBuy:null,
      hitRateAll:0, hitRateQuality:null, hitRateAtBuy:null,
      avgReturnAll:-.5, avgReturnQuality:null, avgReturnAtBuy:null,
    });
    expect(summarizeSnapshots([])).toEqual({
      analysed:0, qualityPasses:0, atBuy:0,
      returnCountAll:0, returnCountQuality:0, returnCountAtBuy:0,
      medianReturnAll:null, medianReturnQuality:null, medianReturnAtBuy:null,
      hitRateAll:null, hitRateQuality:null, hitRateAtBuy:null,
      avgReturnAll:null, avgReturnQuality:null, avgReturnAtBuy:null,
    });
  });
});

it('includes a cash-rich historical company when the same cash flows clear the price and return hurdles', () => {
  const rich = {...fundamentals,years:fundamentals.years.map(y=>({...y,cash:10000,totalAssets:10900,totalLiabilities:500,equity:10400}))};
  const row = snapshotForYear({...base,fundamentals:rich,fy:2016,prices:[...prices.filter(([m])=>m!=='2017-02'),['2017-02',900]]})!;
  // The excess-cash adjustment belongs to both value and the return gate.
  expect(row[2]).toBeLessThan(.75);
  expect(row[3]).toBe(true);
});
