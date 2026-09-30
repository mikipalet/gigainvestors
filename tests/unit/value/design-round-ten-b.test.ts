import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { CompanyTreemap } from '@/components/value/CompanyTreemap';
import { BuyZone } from '@/components/value/BuyZone';
import { DossierContent } from '@/components/value/DossierContent';
import { ownerReturn, expectedReturnCopy, requiredReturnCopy } from '@/lib/value/owner-return';
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

const valuation={method:'owner_earnings',currency:'USD',normalized:86,shares:10,growth:.039,netCash:0,discountRate:.1,bondYield:.052} as Valuation;
it('adds the valuation growth assumption to cash yield without using historical yield or terminal growth', () => {
 const result=ownerReturn({...valuation,equityBondYield:.5,terminalGrowth:.03},'USD',1000,100);
 expect(result).toMatchObject({yield:.086,growth:.039,expected:.125});
 const capped=ownerReturn({...valuation,growth:.08},'USD',1000,100)!;
 expect(capped.growth).toBe(.08);
 expect(capped.expected).toBeCloseTo(.166);
});

it('compares the combined expected return with the bar in buy cards', () => {
 const row={...fixtures[0].row,c:'US',b:true,ownerReturnInputs:{valuation,marketCapUsd:1000}} as IndexRow;
 const html=renderToStaticMarkup(createElement(BuyZone,{entries:[{row,quote:100,mos:.4}]}));
 expect(html).toContain('About 12.5% a year expected (8.6% cash + 3.9% growth) vs required return 10.0% a year (10% floor; US 10-year bond 5.2% + 4 points)');
 expect(html).not.toContain('Owner return 8.6% a year');
});

it('uses the same return sentence in dossiers and buy cards', () => {
 const dossier:Dossier=JSON.parse(readFileSync('tests/fixtures/value/store/dossiers/027.json','utf8'))['KO.US'];
 dossier.valuation={...dossier.valuation!,...valuation};
 dossier.company.currency='USD';
 dossier.company.marketCapUsd=1000;
 const html=renderToStaticMarkup(createElement(DossierContent,{dossier}));
 expect(html).toContain('About 12.5% a year expected (8.6% cash + 3.9% growth) vs required return 10.0% a year (10% floor; US 10-year bond 5.2% + 4 points)');
});

it('keeps displayed addition consistent when one decimal would lose a rounding digit', () => {
 const owner=ownerReturn({...valuation,normalized:85.79418,growth:.06951090},'USD',1000,100)!;
 expect(expectedReturnCopy(owner,valuation,'US')).toBe("About 15.53% a year expected (8.58% cash + 6.95% growth) vs required return 10.0% a year (10% floor; US 10-year bond 5.2% + 4 points)");
});

it('shows the actual required return above the floor',()=>{
 expect(requiredReturnCopy({...valuation,discountRate:.12,bondYield:.08},'BR')).toBe('required return 12.0% a year (BR 10-year bond 8.0% + 4 points)');
});
