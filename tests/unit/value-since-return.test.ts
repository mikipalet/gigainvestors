import {expect,it} from 'vitest';
import {sinceLabel,historyHeadline,refreshReturn} from '@/lib/value/since-return';
import {summarizeSnapshots} from '@/lib/value/snapshots';
import type {SnapshotRow} from '@/lib/value/types';
const row:SnapshotRow=['OLD.US','PPPPP',.8,true,.1,{price:100,buyPrice:120,discount:.25},undefined,{annual:2017,ttm:'2018-06-30',expected:.12}];
it('shows signed absolute changes, including losses and zero, with no annualisation',()=>{
 expect(sinceLabel(1.42)).toBe('Since then +142%');expect(sinceLabel(-.48)).toBe('Since then −48%');expect(sinceLabel(0)).toBe('Since then 0%');expect(sinceLabel(null)).toBe('');expect(sinceLabel(NaN)).toBe('');
});
it('refreshes only realised return using a consistent split-adjusted local price series',()=>{
 const fresh=refreshReturn(row,'2018Q3',{currency:'USD',fetchedAt:'2026-10-02',prices:[['2018-09',25]],latest:[60.5,'2026-10-01']});
 expect(fresh[4]).toBe(1.42);expect(fresh.slice(0,4)).toEqual(row.slice(0,4));expect(fresh.slice(5,8)).toEqual(row.slice(5,8));expect(fresh[8]).toEqual({date:'2026-10-01'});
});
it('retains a delisted loser and its exact terminal trade date',()=>{
 const fresh=refreshReturn(row,'2018Q3',{currency:'USD',fetchedAt:'2026-10-02',prices:[['2018-09',100]],latest:[52,'2021-04-09'],lastTraded:true});
 expect(fresh[0]).toBe('OLD.US');expect(fresh[4]).toBe(-.48);expect(fresh[8]).toEqual({date:'2021-04-09',lastTraded:true});
});
it('does not silently retain a stale gain when a return price is absent',()=>{
 expect(refreshReturn(row,'2018Q3',undefined)[4]).toBeNull();
});
it('uses the equal-weight mean of all analysed companies, including failures and losses',()=>{
 const summary=summarizeSnapshots([row].concat([
 ['FAIL.US','FFFFF',2,false,-.5],['WIN.US','PPPPP',.7,true,2.9],
 ]));
 expect(summary.avgReturnAtBuy).toBe(1.5);expect(summary.avgReturnAll).toBeCloseTo(.8333);
 expect(historyHeadline('2018Q3',summary)).toBe('2018Q3: 2 at a fair price. Up 150% since; all index companies +83%.');
 expect(historyHeadline('2020Q1',{...summary,avgReturnAtBuy:-.48})).toContain('Down 48% since');
});

it('adjusts terminal EOD closes for splits only and preserves the last traded date',async()=>{
 const {eodReturnPrices}=await import('@/scripts/value/stages/history-returns');
 const prices=eodReturnPrices([{date:'2018-09-28',close:100,adjusted_close:20},{date:'2021-04-09',close:52,adjusted_close:51}], [{date:'2020-01-01',split:'2/1'}], 'USD','2026-10-03',true);
 expect(prices.prices).toEqual([['2018-09',50],['2021-04',52]]);
 expect(prices.latest).toEqual([52,'2021-04-09']);
 expect(refreshReturn(row,'2018Q3',prices)[4]).toBe(.04);
 expect(prices.lastTraded).toBe(true);
});
