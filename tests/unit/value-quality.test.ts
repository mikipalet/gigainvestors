import {expect,it} from 'vitest';
import {qualityMetric} from '@/lib/value/quality-metric';
it('uses the published median and financial metric, never ROIC for a bank',()=>{
 expect(qualityMetric('operating',{totalRoicMedian:.23,roicMedian:.71,roeMedian:.1})).toEqual({label:'ROIC',value:.23,basis:'including-acquisitions'});
 expect(qualityMetric('bank',{roteMedian:.21,roeMedian:.17})).toEqual({label:'ROTE',value:.21});
 expect(qualityMetric('insurer',{roeMedian:.19})).toEqual({label:'ROTE',value:.19});
 expect(qualityMetric('bank',{roicMedian:.23})).toBeUndefined();
 expect(qualityMetric('operating',{roicMedian:NaN})).toBeUndefined();
});
it('does not reuse legacy unlimited capital when acquisitions are included',()=>{
 expect(qualityMetric('operating',{roicMedian:Infinity,unlimitedYears:6})).toBeUndefined();
 expect(qualityMetric('operating',{roicMedian:null,unlimitedYears:8})).toBeUndefined();
 expect(qualityMetric('operating',{roicMedian:null})).toBeUndefined();
});

it('labels life-insurer common equity returns and completeness unlimited capital consistently',()=>{
 expect(qualityMetric('insurer',{roeMedian:.19,tangibleReturn:0})).toEqual({label:'ROE',value:.19});
 expect(qualityMetric('operating',{roicMedian:1.000001})).toBeUndefined();
});
