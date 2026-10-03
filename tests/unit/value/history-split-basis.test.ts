import {expect,it} from 'vitest';
import {alignHistoryShares} from '@/lib/value/history-split-basis';
import {emptyYear} from '@/lib/value/completeness/second-sources';
import type {Fundamentals} from '@/lib/value/types';
const f={id:'TEST.US',fetchedAt:'2026-10-03',currency:'USD',integrity:{ok:true,reasons:[]},years:[]};

it('uses an observed post-year-end split to reconcile a comparative share block',()=>{
 const input:Fundamentals={...f,id:'POST.US',fetchedAt:'2026-10-03',splits:[{date:'2026-04-13',factor:5}],years:Array.from({length:10},(_,i)=>({...emptyYear(`${2016+i}-12-31`,'USD'),dilutedShares:i<6?30:150,netIncome:300,equity:1000,basicEps:i<6?10:2}))};
 const out=alignHistoryShares(input,[]);
 expect(out.years.map(y=>y.dilutedShares)).toEqual(Array(10).fill(150));
 expect(alignHistoryShares(out,[])).toEqual(out);
 expect(alignHistoryShares({...input,fetchedAt:'2026-03-01'},[])).toEqual({...input,fetchedAt:'2026-03-01'});
});
