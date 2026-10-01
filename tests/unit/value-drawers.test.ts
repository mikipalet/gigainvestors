import {describe,it,expect} from 'vitest';
import {retainedWindow,retainedSentence,yearTable} from '@/lib/value/drawer-data';
import type {Dossier,TestOutcome} from '@/lib/value/types';
const management={key:'management',result:'pass',numeric:'pass',metrics:{retainedEarnings:-1.347e9,marketCapGain:10.258856e9,retainedStartFy:2016,retainedEndFy:2025},series:{retainedEarnings:[[2016,20],[2017,30]],marketCap:[[2016,100],[2025,200]]},jev:[],reasons:[]} as TestOutcome;
describe('drawer evidence',()=>{
 it('describes net capital returned without a negative passing bar',()=>{
  expect(retainedSentence(management,'EUR')).toBe('Returned EUR 1.35bn more than it earned to owners while market value rose EUR 10.3bn: passes.');
 });
 it('keeps the actual window totals without inventing annual retained equity changes',()=>{
  expect(retainedWindow(management)).toEqual({start:2016,end:2025,retained:-1.347e9,created:10.258856e9});
 });
 it('keeps missing fiscal observations as gaps rather than a passing mark',()=>{
  const t={key:'moat',result:'pass',numeric:'pass',metrics:{roicMedian:.2},series:{roic:[[2023,.2],[2024,null],[2025,.1]],grossMargin:[[2023,.4],[2024,.4],[2025,.4]]},jev:[],reasons:[]} as TestOutcome;
  const d={company:{kind:'operating'},series:{},tests:{understandable:{series:{}}}} as unknown as Dossier;
  const table=yearTable(d,t);
  expect(table.rows.map(r=>r.year)).toEqual([2023,2024,2025]);
  expect(table.rows.map(r=>r.pass)).toEqual([true,null,false]);
 });
});
