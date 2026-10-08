import {expect,it} from 'vitest';
import {valueCompany,valuationMargin} from '@/lib/value/valuation';
import {run as management} from '@/lib/value/tests/management';
import {makeYears} from './synthetic';

it('keeps the legacy valuation discount after rejecting the government-discount candidate',()=>{
 const v=valueCompany({years:makeYears(),kind:'operating',currency:'USD',bondYield:.04,cyclical:false}).valuation!;
 expect(v.discountRate).toBe(.10);
 expect(valuationMargin(v,'stable')).toBe(.25);
});
it.each([null,NaN])('still requires a finite government bond input at %s',bondYield=>{
 expect(valueCompany({years:makeYears(),kind:'operating',bondYield,cyclical:false}).valuation).toBeNull();
});
it('uses economic progress despite a shrinking market premium',()=>{
 const years=makeYears({overrides:(_,i)=>({netIncome:100+i*10,marketCap:5000-i*100})});
 const result=management({years,kind:'operating'});
 expect(result.metrics.marketCapGain).toBeLessThan(0);
 expect(result.metrics.perShareValueGrowth).toBeGreaterThan(0);
 expect(result.numeric).toBe('pass');
});
it('does not let market rerating mask falling earnings per share',()=>{
 const years=makeYears({overrides:(_,i)=>({netIncome:200-i*10,marketCap:1000+i*1000})});
 expect(management({years,kind:'operating'}).numeric).toBe('fail');
});
it('does not substitute rising stock prices for missing economic evidence',()=>{
 const years=makeYears({overrides:(_,i)=>({netIncome:i===7?null:100,marketCap:1000+i*1000,retainedEarningsChange:80})});
 expect(management({years,kind:'operating'}).numeric).toBe('unclear');
});
it('shows the economic decision on tiles and rule evidence, preserving the old dollar observation as context',async()=>{
 const {primaryTileMetric}=await import('@/lib/value/tile-metric');
 const {ruleReading}=await import('@/lib/value/rule-reading');
 const {retainedWindow}=await import('@/lib/value/drawer-data');
 const r=management({years:makeYears({overrides:(_,i)=>({netIncome:100+i*10,marketCap:5000-i*100})}),kind:'operating'});
 const t={...r,result:r.numeric,jev:[]};
 expect(primaryTileMetric(t,'operating').id).toBe('perShareValueGrowth');
 expect(ruleReading(t,'operating').checks.some(c=>c.core&&c.pass===false)).toBe(false);
 expect(retainedWindow(t)).toBeNull();
 expect(t.metrics.marketCapGain).toBeLessThan(0);
});
it('names the management tile for capital allocation and charts earnings per share, not the retained-dollar window',async()=>{
 const {testLabels}=await import('@/components/value/TestChips');
 const {primaryTileMetric}=await import('@/lib/value/tile-metric');
 const r=management({years:makeYears({overrides:(_,i)=>({netIncome:100+i*10,marketCap:5000-i*100})}),kind:'operating'});
 expect(testLabels.management).toBe('Capital allocation');
 expect(primaryTileMetric({...r,result:r.numeric,jev:[]},'operating').chart).toBe('Earnings per share');
});
