import {it,expect} from 'vitest';
import {withCapitalReturns} from '../../../lib/value/capital-returns';
import {emptyYear} from '../../../lib/value/completeness/second-sources';
import type {Analysis} from '../../../lib/value/types';
it('replaces a stale public capital-return series when the input-derived test is refreshed',()=>{
 const a={company:{kind:'operating'},series:{totalRoic:[[2025,.33]]},tests:{moat:{metrics:{},series:{}}}} as unknown as Analysis;
 const refreshed=withCapitalReturns(a,[emptyYear('2025-12-31','USD')]);
 expect(refreshed.series!.totalRoic).toEqual(refreshed.tests.moat.series.totalRoic);
});

it('keeps one capital observation per fiscal year when empty placeholder years coexist with full statements',()=>{
 const a={company:{kind:'operating'},series:{},tests:{moat:{metrics:{},series:{}}}} as unknown as Analysis;
 const empty=emptyYear('2025-12-31','USD');
 const full={...empty,revenue:1000,netIncome:100,ocf:120,capex:20,da:20,equity:500,totalDebt:0,cash:0,goodwill:0,intangibles:0};
 const result=withCapitalReturns(a,[empty,full,empty]);
 expect(result.series!.totalRoic).toHaveLength(1);
 expect(result.series!.totalRoic[0][1]).not.toBeNull();
});
