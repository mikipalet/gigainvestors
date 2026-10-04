import {describe,it,expect} from 'vitest';
import {compactMoney,formatMoney,formatPct,formatRate} from '@/lib/format';
import {formatMetric} from '@/lib/value/metric-labels';
import {sharePrice} from '@/lib/value/listing-details';
import {forwardPercent} from '@/lib/value/forward';
import {dateLabel} from '@/lib/value/presentation';
describe('original house formats across products',()=>{
 it('uses the same precision and currency for the same USD total',()=>{
  for(const value of [1.2e9,28e9,483.7e6,4e9,1.25e12])expect(compactMoney(value,'USD')).toBe(formatMoney(value));
 });
 it('retains currency and a leading zero for small amounts',()=>{
  expect(compactMoney(.2,'EUR')).toBe('EUR 0.20');
  expect(sharePrice(.2,'USD')).toBe('$0.20');
  expect(sharePrice(.2,'EUR')).toBe('EUR 0.20');
  expect(sharePrice(null,'USD')).toBe('');
 });
 it('preserves financial rate precision for threshold comparisons without changing portfolio weights or ratio caps',()=>{
  for(const [value,want] of [[.043,'4.3%'],[.126,'12.6%'],[.13,'13.0%'],[.153,'15.3%'],[-.153,'-15.3%'],[0,'0.0%']] as const){
   expect(formatRate(value)).toBe(want);
   expect(formatMetric({value,format:'pct'})).toBe(want);
  }
  expect(formatPct(12.6)).toBe('13%');
  expect(formatMetric({value:1.4,format:'pct',returnRatio:true})).toBe('>100%');
  expect(formatMetric({value:.891,format:'x'})).toBe('0.89×');
 });
 it('uses the same percentage precision in forward and historical records',()=>{
  expect(forwardPercent(.618)).toBe('+61.8%');
  expect(forwardPercent(-.046)).toBe('−4.6%');
  expect(forwardPercent(null)).toBe('unavailable');
 });
 it('uses a UTC date with the same month abbreviation',()=>{
  expect(dateLabel('2026-09-29T23:30:00Z')).toBe('29 Sep 2026');
  expect(dateLabel('invalid')).toBe('');
 });
});
