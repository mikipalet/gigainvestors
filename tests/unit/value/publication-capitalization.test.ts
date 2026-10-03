import {describe,it,expect} from 'vitest';
import {publicationCapitalization} from '@/lib/value/publication-capitalization';
import type {Analysis} from '@/lib/value/types';
import {readFileSync,readdirSync} from 'node:fs';
const base=readdirSync('tests/fixtures/value/store/dossiers').flatMap(f=>Object.values(JSON.parse(readFileSync(`tests/fixtures/value/store/dossiers/${f}`,'utf8')))).find((a:any)=>a.id==='KO.US') as Analysis;
function inputs(){
 const a=structuredClone(base);a.company.currency='USD';a.company.marketCapUsd=6000;a.valuation!.shares=100;a.valuation!.assumptions=[];
 const raw={General:{Type:'Common Stock',CurrencyCode:'USD',UpdatedAt:'2026-10-02'},SharesStats:{SharesOutstanding:100},Highlights:{MarketCapitalization:6000},Financials:{Balance_Sheet:{quarterly:{'2026-06-30':{commonStockSharesOutstanding:100}}}}};
 return {a,raw};
}
describe('publication capitalization evidence',()=>{
 it('normalizes a pence quote and a major-unit cap without rejecting reported shares',()=>{
  const {a,raw}=inputs();a.company.currency='GBX';a.company.exchange='LSE';a.company.country='GB';a.company.marketCapUsd=7800;
  raw.General.CurrencyCode='GBX';a.valuation!.assumptions=['current share sources disagree by more than 1.5x; share count not corrected'];
  const r=publicationCapitalization(a,raw,[6000,'2026-10-02'],.013);
  expect(r.capShares).toBe(100);expect(r.analysis.company.marketCapUsd).toBe(7800);expect(r.analysis.valuation!.assumptions).toEqual([]);
 });
 it('checks a split-adjusted balance count before accepting corrected current shares',()=>{
  const {a,raw}=inputs();raw.Financials.Balance_Sheet.quarterly['2026-06-30'].commonStockSharesOutstanding=50;
  a.valuation!.assumptions=['share count corrected to current 100'];
  expect(publicationCapitalization(a,raw,[60,'2026-10-02'],1).capShares).toBeUndefined();
  const r=publicationCapitalization(a,raw,[60,'2026-10-02'],1,[{date:'2026-07-01',factor:2}]);
  expect(r.capShares).toBe(100);expect(r.analysis.valuation!.assumptions).toEqual([]);
 });
 it('does not use cap divided by price as evidence for a conflicting share count',()=>{
  const {a,raw}=inputs();raw.SharesStats.SharesOutstanding=200;
  expect(publicationCapitalization(a,raw,[60,'2026-10-02'],1).capShares).toBeUndefined();
 });
 it('keeps an unexplained same-date or large cap discrepancy unresolved',()=>{
  const {a,raw}=inputs();a.company.marketCapUsd=9000;
  expect(publicationCapitalization(a,raw,[60,'2026-10-02'],1).capShares).toBeUndefined();
  raw.General.UpdatedAt='2026-10-01';
  expect(publicationCapitalization(a,raw,[60,'2026-10-02'],1).capShares).toBeUndefined();
 });
 it('rejects future balance periods and stale current share observations',()=>{
  const {a,raw}=inputs();
  const future={...raw,Financials:{Balance_Sheet:{quarterly:{'2026-12-31':{commonStockSharesOutstanding:100}}}}};
  expect(publicationCapitalization(a,future,[60,'2026-10-02'],1).capShares).toBeUndefined();
  raw.General.UpdatedAt='2026-09-01';expect(publicationCapitalization(a,raw,[60,'2026-10-02'],1).capShares).toBeUndefined();
 });
});
