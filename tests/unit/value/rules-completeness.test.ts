import {expect,it} from 'vitest';
import {completionYears} from '../../../lib/value/completeness/needs';
import {makeYears} from './synthetic';
import type {Fundamentals} from '../../../lib/value/types';
it('requests a missing recent gross margin instead of permanently requesting old calendar years',()=>{
 const years=makeYears({n:10,from:2030,overrides:y=>({grossProfit:y.fy===2034?null:400})});
 const f={id:'TEST.US',currency:'USD',years,integrity:{ok:true,reasons:[]},fetchedAt:'2040-01-01'} as Fundamentals;
 expect([...completionYears(f,'operating')]).toEqual([2034]);
});
