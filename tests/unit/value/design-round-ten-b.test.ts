import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { CompanyTreemap } from '@/components/value/CompanyTreemap';
import { BuyZone } from '@/components/value/BuyZone';
import { DossierContent } from '@/components/value/DossierContent';
import { ownerReturn, expectedReturnCopy } from '@/lib/value/owner-return';
import type { Dossier, IndexRow, Valuation } from '@/lib/value/types';
import { readFileSync } from 'node:fs';
import fixtures from '../../fixtures/value/treemap-round-ten.json';

it.each(fixtures)('shows the published multiple for $row.id despite verification flags and absent owner-return inputs', ({ row, quote }) => {
 const html=renderToStaticMarkup(createElement(CompanyTreemap, {
  entries:[{row:row as IndexRow,quote,mos:1-quote/row.v[1]}],year:'Today',sort:'closest',onTable:()=>{},
 }));
 const multiple=(quote/(row.v[1]*(1-row.m))).toFixed(1);
 expect(html).toContain(`${multiple}x its buy price, too expensive`);
 expect(html).not.toContain('Value unavailable');
 expect(html).toContain('data-buy="false"');
});

it('retains unavailable when there is no comparable valuation', () => {
 const html=renderToStaticMarkup(createElement(CompanyTreemap, {
  entries:[{row:{...fixtures[0].row,v:null} as IndexRow,quote:367.74,mos:null}],year:'Today',sort:'closest',onTable:()=>{},
 }));
 expect(html).toContain('Value unavailable');
});

const valuation={method:'owner_earnings',currency:'USD',normalized:86,shares:10,growth:.039,netCash:0} as Valuation;
it('adds the valuation growth assumption to cash yield without using historical yield or terminal growth', () => {
 const result=ownerReturn({...valuation,equityBondYield:.5,terminalGrowth:.03},'USD',1000,100);
 expect(result).toMatchObject({yield:.086,growth:.039,expected:.125});
 const capped=ownerReturn({...valuation,growth:.08},'USD',1000,100)!;
 expect(capped.growth).toBe(.08);
 expect(capped.expected).toBeCloseTo(.166);
});

it('compares the combined expected return with the bar in buy cards', () => {
 const row={...fixtures[0].row,b:true,ownerReturnInputs:{valuation,marketCapUsd:1000}} as IndexRow;
 const html=renderToStaticMarkup(createElement(BuyZone,{entries:[{row,quote:100,mos:.4}]}));
 expect(html).toContain('About 12.5% a year expected (8.6% cash + 3.9% growth) vs Buffett&#x27;s 10% bar');
 expect(html).not.toContain('Owner return 8.6% a year');
});

it('uses the same return sentence in dossiers and buy cards', () => {
 const dossier:Dossier=JSON.parse(readFileSync('tests/fixtures/value/store/dossiers/027.json','utf8'))['KO.US'];
 dossier.valuation={...dossier.valuation!,...valuation};
 dossier.company.currency='USD';
 dossier.company.marketCapUsd=1000;
 const html=renderToStaticMarkup(createElement(DossierContent,{dossier}));
 expect(html).toContain('About 12.5% a year expected (8.6% cash + 3.9% growth) vs Buffett&#x27;s 10% bar');
});

it('rounds expected return and each component independently to one decimal', () => {
 const owner=ownerReturn({...valuation,normalized:85.79418,growth:.06951090},'USD',1000,100)!;
 expect(expectedReturnCopy(owner)).toBe("About 15.5% a year expected (8.6% cash + 7.0% growth) vs Buffett's 10% bar");
});

import { tileMetric, tileReason, tileSentence } from '@/lib/value/tile-metric';
import type { TestOutcome } from '@/lib/value/types';
const volatileMargins:TestOutcome={key:'understandable',result:'fail',numeric:'fail',metrics:{opMarginCv:9.36},series:{operatingMargin:[[2016,null],[2017,.1],[2018,.12],[2019,.11],[2020,-.65],[2021,-.03],[2022,.06],[2023,.1],[2024,.11],[2025,.1]]},reasons:['operating margin variation too high'],jev:[]};
it('plots actual operating margins over available fiscal years, including losses',()=>{
 const metric=tileMetric(volatileMargins,'operating');
 expect(metric.series).toEqual(volatileMargins.series.operatingMargin.slice(1));
 expect(metric.chart).toBe('Operating margin');
});
it('caps volatile margin copy and explains the loss years',()=>{
 const metric=tileMetric(volatileMargins,'operating');
 expect(tileSentence(volatileMargins,metric,'operating')).toBe('Margin variation >100%.');
 expect(tileReason(volatileMargins)).toBe('Margins swing wildly, including losses.');
});
