import { describe, expect, it } from 'vitest';
import { isInvestmentHolding, navHistory } from '@/lib/value/investment-nav';
import { valueCompany, valuationMargin } from '@/lib/value/valuation';
import { ownerReturn, buyReturnInputs } from '@/lib/value/owner-return';
import { publishedBuyPrice } from '@/lib/value/buy-price';
import { isDecided, undecidedReasons } from '@/lib/value/publication-eligibility';
import { normalizeEodhd } from '@/lib/value/normalize-eodhd';
import { makeYears } from './synthetic';
import type { Analysis } from '@/lib/value/types';
const years=()=>makeYears({overrides:(_,i)=>({navPerShare:100*1.08**i,dividendsPerShare:2*1.08**Math.max(0,i-1)})});
const value=(ys=years())=>valueCompany({years:ys,kind:'operating',investmentHolding:true,currency:'GBP',bondYield:null,cyclical:false});
describe('investment holding classification',()=>{
 it.each(['3i Group PLC','Investor AB','Industrivarden AB','Kinnevik AB','EXOR N.V.','Sofina SA','Groupe Bruxelles Lambert','GBL','HAL Trust','Wendel SE','Eurazeo SE'])('recognises %s without inventing fair-value income history',name=>{
  expect(isInvestmentHolding({name,industry:'Asset Management'},[])).toBe(true);
 });
 it('requires a full five years above 50% for other asset-management/capital-markets names',()=>{
  const ys=makeYears({n:5,overrides:{fairValueGains:60,totalIncome:100}});
  expect(isInvestmentHolding({name:'Example Investments',industry:'Capital Markets'},ys)).toBe(true);
  expect(isInvestmentHolding({name:'Example Manager',industry:'Asset Management'},ys.map(y=>({...y,fairValueGains:50})))).toBe(false);
  expect(isInvestmentHolding({name:'Example Manager',industry:'Asset Management'},ys.slice(1))).toBe(false);
  expect(isInvestmentHolding({name:'Software Co',industry:'Software'},ys)).toBe(false);
  expect(isInvestmentHolding({name:'BlackRock',industry:'Asset Management'},makeYears())).toBe(false);
  expect(isInvestmentHolding({name:'Berkshire Hathaway Inc',industry:'Capital Markets'},ys)).toBe(false);
 });
});
describe('NAV valuation',()=>{
 it('compounds NAV/share plus distributions over ten full years',()=>{
  // Reinvest each annual dividend at year-end NAV: (NAV_t + DPS_t)/NAV_(t-1) = 1.10.
  expect(navHistory(years())?.cagr).toBeCloseTo(.1);
  const v=value().valuation!;
  expect(v.method).toBe('nav');expect(v.tier).toBe('nav');
  expect(v.perShare.mid).toBeCloseTo(100*1.08**10);
  expect(v.discountRate).toBe(.1);expect(valuationMargin(v,'volatile')).toBe(.15);
  expect(ownerReturn(v,'GBP',null,v.perShare.mid*.8)?.expected).toBeCloseTo(1.1*(1/.8)**.1-1);
  const inputs=buyReturnInputs(v,'GBP');
  const row={st:'s' as const,t:'PPPPP',v:[v.perShare.mid,v.perShare.mid,v.perShare.mid] as [number,number,number],m:.15,buyReturnInputs:inputs};
  expect(publishedBuyPrice(row,[v.perShare.mid*.85,'2026-09-30']).b).toBe(true);
  expect(publishedBuyPrice(row,[v.perShare.mid*.9,'2026-09-30']).b).toBe(false);
  const low=value(years().map((y,i)=>({...y,navPerShare:100*1.04**i,dividendsPerShare:0}))).valuation!;
  expect(publishedBuyPrice({...row,v:[low.perShare.mid,low.perShare.mid,low.perShare.mid],buyReturnInputs:buyReturnInputs(low,'GBP')},[low.perShare.mid*.85,'2026-09-30']).b).toBe(true);
 });
 it('caps the NAV total-return CAGR at 12% before adjusting by price/NAV, preserving losses',()=>{
  expect(navHistory(years().map((y,i)=>({...y,navPerShare:100*1.2**i})))?.cagr).toBe(.12);
  expect(navHistory(years().map((y,i)=>({...y,navPerShare:100*.95**i,dividendsPerShare:0})))?.cagr).toBeCloseTo(-.05);
 });
 it('does not substitute owner earnings or book equity for missing NAV or dividends',()=>{
  expect(value(makeYears()).valuation).toBeNull();
  expect(value(years().slice(1)).valuation?.navReturn?.years).toBe(9);
  expect(value(years().slice(-6)).valuation).toBeNull();
  const ys=years();ys[5].dividendsPerShare=null;ys[5].dividendsPaid=null;
  expect(value(ys).valuation).toBeNull();
 });
 it('maps only explicit reported NAV, dividends and fair-value gain fields',()=>{
  const raw={General:{Industry:'Asset Management',Name:'3i Group PLC'},Financials:{Income_Statement:{yearly:{'2025-12-31':{totalRevenue:'100',fairValueGains:'70',totalIncome:'100',dividendsPerShare:'2'}}},Balance_Sheet:{yearly:{'2025-12-31':{netAssetValuePerShare:'123',totalStockholderEquity:'900'}}}}};
  const f=normalizeEodhd(raw,'NAV-TEST.LSE').fundamentals;
  expect(f.years[0]).toMatchObject({navPerShare:123,dividendsPerShare:2,fairValueGains:70,totalIncome:100});
  expect(f.years[0].provenance?.navPerShare?.source).toContain('raw/eodhd/NAV-TEST.LSE');
 });
 it('keeps a missing NAV history private even with five decided quality tests',()=>{
  const a={company:{investmentHolding:true},status:'scored',historyCoverage:{years:11},valuation:null,valuationReason:'Ten-year NAV history unavailable',tests:Object.fromEntries(['understandable','moat','economics','management','accounting'].map(k=>[k,{result:'pass',reasons:[]}]))} as unknown as Analysis;
  expect(isDecided(a)).toBe(false);expect(undecidedReasons(a)).toContain('Ten-year NAV history unavailable');
 });
});

it('keeps reported NAV/share and quote-sensitive returns consistent after share corroboration and FX',async()=>{
 const {applyShareCheck}=await import('@/lib/value/share-check');
 const v=value().valuation!;v.perShareTrading={currency:'GBX',fxRate:100,low:v.normalized*100,mid:v.normalized*100,high:v.normalized*100};
 const checked=applyShareCheck({valuation:v} as Analysis,{status:'verified',shares:v.shares*2,observations:[],reason:''}).valuation!;
 expect(checked.perShare.mid).toBe(v.perShare.mid);
 expect(ownerReturn(checked,'GBX',null,checked.perShareTrading!.mid*.8)?.expected).toBeCloseTo(1.1*(1/.8)**.1-1);
});


it('rejects incomplete five-year gain windows and mixed NAV currencies',()=>{
 const gains=makeYears({n:5,overrides:{fairValueGains:60,totalIncome:100}});gains[2].fy=gains[1].fy;
 expect(isInvestmentHolding({name:'Example Holdings',industry:'Capital Markets'},gains)).toBe(false);
 const ys=years();ys[0].currency='EUR';ys[1].currency='GBP';
 expect(navHistory(ys)).toBeNull();
});
it('routes known holdings through NAV at analysis and historical snapshot boundaries',async()=>{
 const {analyzeCompany}=await import('@/lib/value/analyze-company');
 const {snapshotForYear}=await import('@/lib/value/snapshots');
 const company={id:'III.LSE',name:'3i Group PLC',industry:'Asset Management',sector:'Financial Services',kind:'operating',currency:'GBP',country:'GB',source:'eodhd',listings:['III.LSE']} as import('@/lib/value/types').Company;
 const f={id:company.id,currency:'GBP',years:years(),integrity:{ok:true,reasons:[]},fetchedAt:'2026-10-01'};
 const analysis=await analyzeCompany({company,fundamentals:f,sections:{},report:{id:company.id,kind:'description',url:null,filed:null,period:null,sections:[]},bondYield:null,ask:async()=>[]});
 expect(analysis.company.investmentHolding).toBe(true);expect(analysis.valuation?.method).toBe('nav');expect(analysis.requiredMos).toBe(.15);
 expect(analysis.series).not.toHaveProperty('ownerEarningsPerShare');
 const missing={...f,years:makeYears()};
 expect(snapshotForYear({company,fundamentals:missing,fy:2023,prices:[['2024-03',80]],latestPrice:[80,'2026-09-30'],bondYield:.04,fxRate:1,asOf:'2026-10-01'})).toBeNull();
});

it('uses period-end shares for reported aggregate investment NAV, never adds cash or debt again',()=>{
 const ys=years().map(y=>({...y,investmentNav:y.navPerShare!*20,navPerShare:null,sharesOutstanding:20,dilutedShares:10,cash:10000,totalDebt:2000}));
 const v=value(ys).valuation!;
 expect(v.normalized).toBeCloseTo(100*1.08**10);
 expect(v.perShare.mid).toBe(v.normalized);expect(v.netCash).toBe(0);expect(v.shares).toBe(20);
});
