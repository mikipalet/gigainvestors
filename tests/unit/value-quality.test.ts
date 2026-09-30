import {expect,it} from 'vitest';
import {qualityMetric} from '@/lib/value/quality-metric';
it('uses the published median and financial metric, never ROIC for a bank',()=>{
 expect(qualityMetric('operating',{roicMedian:.23,roeMedian:.1})).toEqual({label:'ROIC',value:.23});
 expect(qualityMetric('bank',{roteMedian:.21,roeMedian:.17})).toEqual({label:'ROTE',value:.21});
 expect(qualityMetric('insurer',{roeMedian:.19})).toEqual({label:'ROTE',value:.19});
 expect(qualityMetric('bank',{roicMedian:.23})).toBeUndefined();
 expect(qualityMetric('operating',{roicMedian:NaN})).toBeUndefined();
});
it('retains an explicitly unbounded median without inventing a finite ROIC',()=>{
 expect(qualityMetric('operating',{roicMedian:Infinity,unlimitedYears:6})).toEqual({label:'ROIC',value:'unlimited'});
 expect(qualityMetric('operating',{roicMedian:null,unlimitedYears:8})).toEqual({label:'ROIC',value:'unlimited'});
 expect(qualityMetric('operating',{roicMedian:null})).toBeUndefined();
});
