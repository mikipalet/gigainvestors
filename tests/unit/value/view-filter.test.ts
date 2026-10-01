import {expect,it} from 'vitest';
import {matchesView} from '@/lib/value/view-filter';
import type {BrowserRow} from '@/lib/value/browser-view';
const row=(values:Partial<BrowserRow>={}):BrowserRow=>({id:'A.US',n:'Alpha',c:'US',s:'Technology',cur:'USD',t:'PPPPP',st:'s',k:'operating',v:null,mc:100,h:1,g:['software'],w:'A.US',quote:null,...values});
it('respects market scope, near misses and the other facet together',()=>{
 const rows=[row(),row({id:'B.US',t:'PPFPP'}),row({id:'C.US',s:'Energy'}),row({id:'D.JP',c:'JP',w:null}),row({id:'E.JP',c:'JP',w:null,t:'PPFPP'})];
 const ids=(filter:Record<string,string>)=>rows.filter(r=>matchesView(r,filter)).map(r=>r.id);
 expect(ids({})).toEqual(['A.US','C.US']);
 expect(ids({near:'1',sector:'Technology'})).toEqual(['A.US','B.US']);
 expect(ids({near:'1',sector:'Technology',markets:'all'})).toEqual(['A.US','B.US','D.JP','E.JP']);
 expect(ids({near:'1',sector:'Technology',markets:'all',country:'JP'})).toEqual(['D.JP','E.JP']);
 expect(ids({sector:'Energy',country:'US'})).toEqual(['C.US']);
});
it('preserves country-only neutral dossiers and all advanced filters',()=>{
 const neutral=row({st:'i',t:'UUUUU'});
 expect(matchesView(neutral,{})).toBe(false);
 expect(matchesView(neutral,{country:'US'})).toBe(true);
 expect(matchesView(neutral,{country:'US',sector:'Energy'})).toBe(false);
 expect(matchesView(row({h:0}),{held:'1'})).toBe(false);
 expect(matchesView(row(),{q:'unrelated'})).toBe(false);
 expect(matchesView(row(),{tags:'software'})).toBe(true);
 expect(matchesView(row(),{tags:'retail'})).toBe(false);
 expect(matchesView(row({t:'PPFPP'}),{economics:'fail'})).toBe(true);
 expect(matchesView(row({t:'PPUPP'}),{awaiting:'1'})).toBe(true);
 expect(matchesView(row(),{awaiting:'1'})).toBe(false);
 expect(matchesView(row({t:'PPFFF'}),{gate:'2'})).toBe(true);
 expect(matchesView(row({t:'PPFFF'}),{gate:'3'})).toBe(false);
});
