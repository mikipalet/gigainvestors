import {it,expect} from 'vitest';
import {quantities,flagFromExtraction,relationshipFromExtraction} from '../../../lib/value/flags/extract';
import {extractionVersion} from '../../../lib/value/flags/questions';
const p={url:'https://www.sec.gov/Archives/a.htm',filed:'2026-02-01',period:'2025-12-31',section:'Notes',quote:'We increased server lives to 5.5 years.'};
const grade={version:extractionVersion('signal'),accuracy:1,n:20,positive:10,negative:10};
it('reads money, bounded percentages and useful lives without turning years into amounts',()=>{
 expect(quantities('Guarantees of $28 billion; more than ten percent; from six years to five years.')).toEqual([
 {text:'$28 billion',value:28e9,unit:'money',currency:'USD'},
 {text:'more than ten percent',value:.1,unit:'percent',bound:'more-than'},
 {text:'six years',value:6,unit:'years'},{text:'five years',value:5,unit:'years'},
 ]);
});
it('hides untrusted or quantity-mismatched narrative flags',()=>{
 const r={signal:'life_extended',confidence:.99,quantity:{text:'5.5 years',value:5.5,unit:'years' as const},version:grade.version,recording:{state:'',questions:{},answers:{}}};
 expect(flagFromExtraction(p,r,grade)?.label).toBe('Server life lengthened to 5.5 years');
 expect(flagFromExtraction(p,r)).toBeNull();
 expect(flagFromExtraction(p,{...r,quantity:{text:'$28 billion',value:28e9,unit:'money'}},grade)).toBeNull();
});
it('does not turn a lower bound into an exact concentration percentage',()=>{
 const version=extractionVersion('relationship');
 const r={relation:'customer',confidence:.99,quantityConfidence:.99,quantity:{text:'more than ten percent',value:.1,unit:'percent' as const,bound:'more-than' as const},metric:'revenue',version,recording:{state:'',questions:{},answers:{}}};
 const edge=relationshipFromExtraction(p,{id:'QCOM.US',name:'Qualcomm'},'Apple',r,[{id:'AAPL.US',name:'Apple'}],{...grade,version});
 expect(edge?.to).toBe('AAPL.US');expect(edge?.percent).toBeUndefined();
});
it('suppresses a class without positive calibration cases even if the overall model grade passes',()=>{
 const r={signal:'auditor_change',confidence:1,quantity:undefined,version:grade.version,recording:{state:'',questions:{},answers:{}}};
 expect(flagFromExtraction(p,r,{...grade,classes:{life_extended:1}} as typeof grade)).toBeNull();
});
it('preserves a trailing lower bound rather than claiming an exact share',()=>{
 expect(quantities('Each customer accounts for 10% or more.')[0]).toMatchObject({value:.1,bound:'at-least'});
});
