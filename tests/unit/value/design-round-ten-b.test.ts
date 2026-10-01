import { DossierContent } from '@/components/value/DossierContent';
import { expectedReturnCopy,ownerReturn,requiredReturnCopy } from '@/lib/value/owner-return';
import type { Dossier,Valuation } from '@/lib/value/types';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect,it } from 'vitest';

const valuation={method:'owner_earnings',currency:'USD',normalized:86,shares:10,growth:.039,terminalGrowth:.03,netCash:0,discountRate:.1,bondYield:.052} as Valuation;
it('solves the valuation cash flows with fading growth rather than adding growth to yield', () => {
 const result=ownerReturn({...valuation,equityBondYield:.5,terminalGrowth:.03},'USD',1000,100);
 expect(result).toMatchObject({yield:.086,growth:.039});
 const capped=ownerReturn({...valuation,growth:.08},'USD',1000,100)!;
 expect(capped.growth).toBe(.08);
 expect(capped.expected).toBeLessThan(.166);
 expect(result!.expected).toBeCloseTo(.12288549285229078,12);
});

it('uses the same return sentence in dossiers and buy cards', () => {
 const dossier:Dossier=JSON.parse(readFileSync('tests/fixtures/value/store/dossiers/027.json','utf8'))['KO.US'];
 dossier.valuation={...dossier.valuation!,...valuation};
 dossier.company.currency='USD';
 dossier.company.marketCapUsd=1000;
 const html=renderToStaticMarkup(createElement(DossierContent,{dossier,quote:[100,"2026-09-30"]}));
 expect(html).toContain("About 12.3% a year at today&#x27;s price (needs 10.0%)");
});

it('rounds the solved IRR once without presenting an additive shortcut', () => {
 const owner=ownerReturn({...valuation,normalized:85.79418,growth:.06951090},'USD',1000,100)!;
 expect(expectedReturnCopy(owner,valuation,'US')).toBe(`About ${(owner.expected*100).toFixed(1)}% a year at today's price (needs 10.0%)`);
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
 expect(tileSentence(volatileMargins,metric,'operating')).toContain('Margin variation 9.36 > 0.35');
 expect(tileReason(volatileMargins)).toBe('Margins swing wildly, including losses.');
});
