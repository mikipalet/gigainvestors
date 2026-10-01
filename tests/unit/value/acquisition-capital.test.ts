import { describe, expect, it } from 'vitest';
import { returnOnTotalCapital } from '@/lib/value/metrics';
import { valueCompany } from '@/lib/value/valuation';
import { makeYears } from './synthetic';

const fixture = (roic: number, totalReturn: number) => makeYears({ overrides: (_, i) => {
 const profit = 100 * 1.08 ** i, capital = profit / totalReturn;
 return { revenue: profit * 10, operatingIncome: profit / .8, preTaxIncome: profit / .8, taxExpense: profit / 4, netIncome: profit,
  equity: capital, goodwill: capital - profit / roic, intangibles: capital * .1, cash: 0, totalDebt: 0, da: 0, capex: 0 };
}});
const value = (years: ReturnType<typeof makeYears>) => valueCompany({ years, kind: 'operating', currency: 'EUR', bondYield: .03, cyclical: false, qualityPass: true }).valuation!;
describe('return on all capital paid for acquisitions', () => {
 it.each([['SOP', .707, .10], ['IPS', .57, .07], ['GIB', 1.29, .12]] as const)('%s falls back to standard despite high goodwill-excluded ROIC', (_, tangible, total) => {
  const v = value(fixture(tangible, total));
  expect(v.tier).toBe('standard');
  expect(v.capitalReturns?.excludingGoodwill).toBeCloseTo(tangible);
  expect(v.capitalReturns?.includingAcquisitions).toBeCloseTo(total);
 });
 it.each([['ACN',1.31,.38],['WKL',1.40,.187],['JBH',.43,.214],['RMV',9.97,4.46]] as const)('%s-like returns retain compounder treatment', (_, roic, total) => {
  expect(value(fixture(roic, total)).tier).toBe('compounder');
 });
 it('includes goodwill and intangibles, reserves operating cash and counts leases once', () => {
  const y = makeYears({overrides:{equity:1000,totalDebt:200,leaseLiabilities:100,cash:300,revenue:1000,goodwill:500,intangibles:200}})[0];
  expect(returnOnTotalCapital(y)).toBeCloseTo(100 / (1000+200+100-280));
  expect(returnOnTotalCapital({...y,debtIncludesLeases:true})).toBeCloseTo(100 / (1000+200-280));
  expect(returnOnTotalCapital({...y,goodwill:null,intangibles:null})).toBe(returnOnTotalCapital(y));
 });
 it('requires eight finite annual observations within ten years, includes losses and accepts exactly 15%', () => {
  expect(value(fixture(.5,.15)).tier).toBe('compounder');
  const ys=fixture(.5,.2);ys[5].equity=null;
  expect(value(ys).tier).toBe('compounder');
  ys[6].equity=null;ys[7].equity=null;
  expect(value(ys).tier).toBe('standard');
  expect(returnOnTotalCapital({...ys[0],operatingIncome:-125})).toBeLessThan(0);
  expect(returnOnTotalCapital({...ys[0],equity:0})).toBeNull();
 });
});

it('shows the acquisition-inclusive return in the valuation evidence',async()=>{
 const {createElement}=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');
 const {ValuationPanel}=await import('@/components/value/EvidencePanel');
 const v=value(fixture(.707,.1));
 const dossier={valuation:v,company:{currency:'EUR',marketCapUsd:null},requiredMos:.25,tests:{},report:{url:null},series:{},asOf:'2026-10-01'} as unknown as import('@/lib/value/types').Dossier;
 const html=renderToStaticMarkup(createElement(ValuationPanel,{dossier,quote:[10,'2026-09-30']}));
 expect(html).toContain('ROIC including acquisitions');expect(html).toContain('10.0%');expect(html).toContain('70.7%');
});

 it('uses owner earnings consistently when NOPAT would admit an acquisition-built company',()=>{
  const years=fixture(.7,.2).map(y=>({...y,netIncome:y.netIncome!*.6}));
  const v=value(years);
  expect(v.capitalReturns?.includingAcquisitions).toBeCloseTo(.12);
  expect(v.capitalReturns?.basis).toBe('owner_earnings');
  expect(v.tier).toBe('standard');
 });
