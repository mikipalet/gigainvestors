import {expect,it} from 'vitest';
import {valueOutliers} from '@/lib/value/value-outliers';
import type {IndexRow} from '@/lib/value/types';

const row=(id:string,mid:number,oe:number,b=false):IndexRow=>({id,n:id,c:'US',s:null,k:'operating',mc:null,v:[mid*.9,mid,mid*1.1],cur:'USD',t:'PPPPP',pr:'P',g:[],h:0,st:'s',w:id,b,
 buyReturnInputs:{cashPerShare:oe,growth:0,requiredReturn:.1,model:{cashNow:0,annual:Array(10).fill(oe),terminalCash:oe*1.03,terminalGrowth:.03}}} as IndexRow);
it('lists Buys first with the reasons a value looks too good (PRG.US before 3.8.1)',()=>{
 const out=valueOutliers([row('OK.US',110,8),row('PRG.US',569.42,45.71,true),row('CHEAP.US',450,30)],{'OK.US':[100,'2026-10-09'],'PRG.US':[30.48,'2026-10-09'],'CHEAP.US':[100,'2026-10-09']});
 expect(out.map(o=>o.id)).toEqual(['PRG.US','CHEAP.US']);
 expect(out[0].reasons).toEqual(['central value 18.7× price','expected return 150% a year','owner earnings 150% of price']);
 expect(out[1].reasons).toEqual(['central value 4.5× price']);
});
it('ignores rows without a quote or a value',()=>{
 expect(valueOutliers([{...row('A.US',500,50),v:null}],{'A.US':[10,'2026-10-09']})).toEqual([]);
 expect(valueOutliers([row('A.US',500,50)],{})).toEqual([]);
});
