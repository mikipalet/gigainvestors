import { DossierContent } from '@/components/value/DossierContent';
import { expectedReturnCopy,ownerReturn,requiredReturnCopy } from '@/lib/value/owner-return';
import type { Dossier,Valuation } from '@/lib/value/types';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect,it } from 'vitest';

const valuation={method:'owner_earnings',currency:'USD',normalized:86,shares:10,growth:.039,netCash:0,discountRate:.1,bondYield:.052} as Valuation;
it('adds the valuation growth assumption to cash yield without using historical yield or terminal growth', () => {
 const result=ownerReturn({...valuation,equityBondYield:.5,terminalGrowth:.03},'USD',1000,100);
 expect(result).toMatchObject({yield:.086,growth:.039,expected:.125});
 const capped=ownerReturn({...valuation,growth:.08},'USD',1000,100)!;
 expect(capped.growth).toBe(.08);
 expect(capped.expected).toBeCloseTo(.166);
});

it('uses the same return sentence in dossiers and buy cards', () => {
 const dossier:Dossier=JSON.parse(readFileSync('tests/fixtures/value/store/dossiers/027.json','utf8'))['KO.US'];
 dossier.valuation={...dossier.valuation!,...valuation};
 dossier.company.currency='USD';
 dossier.company.marketCapUsd=1000;
 const html=renderToStaticMarkup(createElement(DossierContent,{dossier}));
 expect(html).toContain('About 12.5% a year expected (8.6% cash + 3.9% growth) vs required return 10.0% a year (10% floor; US 10-year bond 5.2% + 4 points)');
});

it('rounds expected return and each component independently to one decimal', () => {
 const owner=ownerReturn({...valuation,normalized:85.79418,growth:.06951090},'USD',1000,100)!;
 expect(expectedReturnCopy(owner,valuation,'US')).toBe("About 15.53% a year expected (8.58% cash + 6.95% growth) vs required return 10.0% a year (10% floor; US 10-year bond 5.2% + 4 points)");
});

it('shows the actual required return above the floor',()=>{
 expect(requiredReturnCopy({...valuation,discountRate:.12,bondYield:.08},'BR')).toBe('required return 12.0% a year (BR 10-year bond 8.0% + 4 points)');
});

import { tileMetric,tileReason,tileSentence } from '@/lib/value/tile-metric';
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
