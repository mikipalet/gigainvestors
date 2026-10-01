import { expect, it } from 'vitest';
import { tileMetric } from '@/lib/value/tile-metric';
import type { TestOutcome, Kind } from '@/lib/value/types';
const test = (key: TestOutcome['key'], result: TestOutcome['result']='pass'): TestOutcome => ({key,result,numeric:result,metrics:{opMarginCv:.36,historyYears:10,roicMedian:.18,roeMedian:.256,oeToNi:1.06,roiic:.312,marketCapGain:89,retainedEarnings:100,shareCagr:-.018,accruals:.03,sbcToOcf:.02},series:{ownerEarnings:[[2014,20],[2024,30],[2025,40]],netIncome:[[2024,30],[2025,20]]},reasons:result==='fail'?['market cap gain below cumulative retained earnings']:[],jev:[]});
it.each(['operating','bank','insurer'] as Kind[])('keeps six distinct headline metrics across outcomes for %s',kind=>{
 const keys=['understandable','moat','economics','management','accounting','price'] as const;
 const ids=keys.map(key=>tileMetric(test(key),kind).id);
 expect(new Set(ids).size).toBe(6);
 for(const key of keys)expect(tileMetric(test(key,'fail'),kind).id).toBe(tileMetric(test(key),kind).id);
 expect(tileMetric(test('economics'),kind)).toMatchObject({id:'oeToNi',value:1.06,threshold:.8});
 expect(tileMetric(test('management','fail'),kind)).toMatchObject({id:'retainedDollar',value:.89,threshold:1});
 expect(tileMetric(test('understandable'),kind)).toMatchObject({id:'opMarginCv',value:.36});
});
it('plots cash conversion for matching fiscal years in the latest ten-year window',()=>{
 const t=test('economics');
 const metric=tileMetric(t,'bank',[[2024,30],[2025,20]]);
 expect(metric.series).toEqual([[2024,1],[2025,2]]);
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { DossierContent } from '@/components/value/DossierContent';
import { TestSection } from '@/components/value/TestSection';
import { MiniPrice } from '@/components/value/viz/TileCharts';
import type { Dossier } from '@/lib/value/types';
const fixture:Dossier=JSON.parse(readFileSync('tests/fixtures/value/store/dossiers/027.json','utf8'))['KO.US'];
it.each(['operating','bank','insurer'] as Kind[])('tile and evidence use the quality rule metric for %s, including alternate failures',kind=>{
 const dossier=structuredClone(fixture);dossier.company.kind=kind;
 for(const key of ['understandable','moat','economics','management','accounting'] as const){
  dossier.tests[key]=test(key,'fail');
  const expected=tileMetric(dossier.tests[key],kind).id;
  const tile=renderToStaticMarkup(createElement(DossierContent,{dossier}));
  const panel=renderToStaticMarkup(createElement(TestSection,{test:dossier.tests[key],kind}));
  expect(tile).toContain(`data-testid="tile-${key}" data-metric="${expected}"`);
  expect(panel).toContain(`data-test="${key}" data-metric="${expected}"`);
 }
});
it('renders a price series starting after the last historical valuation without crashing',()=>{
 const dossier=structuredClone(fixture);dossier.valueHistory=[[2020,8,10,12]];dossier.priceHistory=[['2025-01',15],['2026-01',16]];
 const html=renderToStaticMarkup(createElement(MiniPrice,{dossier,quote:[17,'2026-09-28']}));
 expect(html).toContain('Monthly price against fiscal-year value range and buy line');
 expect(html).not.toMatch(/NaN|Infinity/);
});
