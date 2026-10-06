import {expect,it} from 'vitest';
import {run as understandable} from '../../../lib/value/tests/understandable';
import {run as moat} from '../../../lib/value/tests/moat';
import {run as baseline} from '../../../research/rules/baseline-understandable';
import {makeYears} from './synthetic';
const margins=[.33045,.32468,.26067,.27178,.37308,.15660,.54122,.62418,.60382,.65214];
const years=()=>makeYears({n:10,from:2018,overrides:(_,i)=>({revenue:1000,operatingIncome:1000*margins[i],netIncome:100})});
it('admits one fully recovered dip while retaining raw risk and observed margins',()=>{
 const ys=years(),b=baseline({years:ys,kind:'operating'}),c=understandable({years:ys,kind:'operating'});
 expect(b.numeric).toBe('fail');expect(c.numeric).toBe('pass');
 expect(c.metrics.opMarginCv).toBe(b.metrics.opMarginCv);expect(c.series).toEqual(b.series);
 expect(c.metrics.opMarginRecoveredDip).toBe(1);expect(c.metrics.opMarginRecoveredCv).toBeCloseTo(.33316,4);
});
it.each(['latest dip','partial recovery','repeat dip','net loss','negative margin','gap','missing margin'])(
 'does not waive %s',(bad)=>{
 let ys=years();
 if(bad==='latest dip')ys[9].operatingIncome=100;
 if(bad==='partial recovery')ys[6].operatingIncome=200;
 if(bad==='repeat dip')ys[8].operatingIncome=100;
 if(bad==='net loss')ys[5].netIncome=-1;
 if(bad==='negative margin')ys[5].operatingIncome=-1;
 if(bad==='gap')ys.splice(3,1);
 if(bad==='missing margin')ys[4].revenue=null;
 expect(understandable({years:ys,kind:'operating'}).numeric).toBe('fail');
});
const gm=(xs:number[],start=2016)=>makeYears({n:xs.length,from:start,overrides:(_,i)=>({revenue:1000,grossProfit:xs[i]*1000})});
it('ignores a recovered old gross-margin dip but rejects current deterioration',()=>{
 const good=gm([.60,.60,.60,.60,.60,.60,.60,.55,.70,.75]);
 expect(moat({years:good,kind:'operating'}).numeric).toBe('pass');
 good.at(-1)!.grossProfit=550;
 expect(moat({years:good,kind:'operating'}).numeric).toBe('fail');
});
it('uses typical and recent margins on every historical calendar, including latest-three weakness',()=>{
 const xs=[.6,.6,.6,.6,.6,.6,.6,.5,.5,.65];
 for(const start of [2000,2016,2030])expect(moat({years:gm(xs,start),kind:'operating'}).numeric).toBe('fail');
});
it('retains the four-point boundary and leaves gapped optional history unknown',()=>{
 expect(moat({years:gm([.6,.6,.6,.6,.6,.6,.6,.6,.6,.56]),kind:'operating'}).numeric).toBe('pass');
 const ys=gm([.6,.6,.6,.6,.6,.6,.6,.6,.6,.50]);ys.splice(4,1);
 expect(moat({years:ys,kind:'operating'}).metrics.grossMarginDrop).toBeNull();
});
