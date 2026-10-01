import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {companyName,dossierReturn} from '@/lib/value/presentation';
import {enrichedCompany} from '@/lib/value/enrichment';
import {isInvestmentHolding} from '@/lib/value/investment-nav';
import {MarketScopeToggle} from '@/components/value/MarketScopeToggle';
import type {Analysis,Company} from '@/lib/value/types';

it.each(['JPMorgan Chase & Co.','Johnson & Johnson','AT&T','Procter & Gamble','Marks & Spencer'])('preserves the identity %s at publication and display',name=>{
 const c=enrichedCompany({id:'POLISH.US',name:name.replace('&','&amp;'),listings:[]} as unknown as Company);
 expect(c.name).toBe(name);
 expect(companyName(c)).toBe(name);
});
it('normalizes a terminal & Co without deleting the company half of the name',()=>{
 expect(companyName({id:'JPM.US',name:'JPMorgan Chase & Co'})).toBe('JPMorgan Chase & Co.');
});
it.each([false,true])('Western switch reflects the active scope when all=%s',all=>{
 const html=renderToStaticMarkup(React.createElement(MarketScopeToggle,{all,onChange:()=>{}}));
 expect(html).toContain(`aria-checked="${!all}"`);
 expect(html).toContain('Western markets');
});
it('uses acquisition-inclusive returns and never falls back to ex-goodwill',()=>{
 const a={company:{kind:'operating'},tests:{moat:{metrics:{roicMedian:1.29},series:{roic:[[2025,1.29]]},reasons:[]}},valuation:{capitalReturns:{includingAcquisitions:.13,observations:10}}} as unknown as Analysis;
 expect(dossierReturn(a).label).toBe('13.0%');
 expect(dossierReturn({...a,valuation:null}).label).toBe('');
});
it('routes SoftBank Group to NAV without confusing its telecom subsidiary',()=>{
 expect(isInvestmentHolding({name:'SoftBank Group Corp.',industry:'Telecom Services'},[])).toBe(true);
 expect(isInvestmentHolding({name:'SoftBank Corp.',industry:'Telecom Services'},[])).toBe(false);
});
it('publishes the inclusive card metric rather than the moat denominator',async()=>{
 const {qualityMetric}=await import('@/lib/value/quality-metric');
 expect(qualityMetric('operating',{roicMedian:1.29,totalRoicMedian:.13})).toMatchObject({label:'ROIC',value:.13});
 expect(qualityMetric('operating',{roicMedian:1.29,unlimitedYears:10})).toBeUndefined();
});
it('retains goodwill and acquired intangibles in the capital paid, even without a valuation',async()=>{
 const {withCapitalReturns}=await import('@/lib/value/capital-returns');
 const {makeYears}=await import('./synthetic');
 const {primaryTileMetric}=await import('@/lib/value/tile-metric');
 const years=makeYears({overrides:{equity:100,totalDebt:50,cash:10,revenue:100,goodwill:90,intangibles:20,netIncome:30,da:10,capex:10,sbc:0,leaseLiabilities:0,leaseCash:0,minorityInterest:0}});
 const a={company:{kind:'operating'},tests:{moat:{key:'moat',metrics:{roicMedian:1.29},series:{roic:[[2025,1.29]]},reasons:[]}},valuation:null} as unknown as Analysis;
 const inclusive=withCapitalReturns(a,years);
 expect(inclusive.tests.moat.metrics.totalRoicMedian).toBeCloseTo(30/142);
 expect(primaryTileMetric(inclusive.tests.moat,'operating').value).toBeCloseTo(30/142);
 expect(inclusive.tests.moat.metrics.roicMedian).toBe(1.29);
 expect(inclusive.tests.moat.series.totalRoic).toHaveLength(10);
});
