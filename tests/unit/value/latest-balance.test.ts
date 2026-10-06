import {describe,it,expect} from 'vitest';
import {valueCompany} from '@/lib/value/valuation';
import {makeYears} from './synthetic';
import {balanceSheets,latestBalanceAt} from '@/lib/value/latest-balance';
const raw={Financials:{Balance_Sheet:{quarterly:{'2018-03-31':{filing_date:'2018-05-10',currency_symbol:'USD',cashAndShortTermInvestments:812e6,shortLongTermDebtTotal:19367e6,totalAssets:35000e6}}}}};
describe('filed balance sheet',()=>{
 it('uses Discovery March cash/debt and preserves annual earnings history',()=>{
  const years=makeYears({overrides:{cash:7309e6,totalDebt:14785e6,netIncome:2e9,revenue:6873e6,da:0,capex:0}});
  years.at(-1)!.end='2017-12-31';
  const balance=latestBalanceAt(balanceSheets(raw),'2018-06-30','USD',years.at(-1)!);
  const result=valueCompany({years,kind:'operating',currency:'USD',bondYield:.04,cyclical:false,balance});
  expect(result.valuation?.netDebt).toBe(18555e6);
  expect(result.valuation?.netCash).toBeCloseTo(812e6-.02*6873e6);
  expect(years.at(-1)!.cash).toBe(7309e6);
  expect(result.valuation?.balanceSheet?.end).toBe('2018-03-31');
 });
 it('excludes filings on/after cutoff and mismatched currency',()=>{
  const annual=makeYears().at(-1)!;annual.end='2017-12-31';
  expect(latestBalanceAt(balanceSheets(raw),'2018-05-10','USD',annual)).toBeNull();
  expect(latestBalanceAt(balanceSheets(raw),'2018-06-30','EUR',annual)).toBeNull();
 });
 it('does not fill a missing new cash figure with old cash',()=>{
  const missing=structuredClone(raw) as any;delete missing.Financials.Balance_Sheet.quarterly['2018-03-31'].cashAndShortTermInvestments;
  const years=makeYears();years.at(-1)!.end='2017-12-31';
  const balance=latestBalanceAt(balanceSheets(missing),'2018-06-30','USD',years.at(-1)!);
  expect(valueCompany({years,kind:'operating',currency:'USD',bondYield:.04,cyclical:false,balance}).valuation).toBeNull();
 });
 it('does not treat carried annual fields on a TTM row as a new balance',()=>{
  const years=makeYears(),ttm={...years.at(-1)!,end:'2030-03-31'};
  const v=valueCompany({years,ttm,kind:'operating',currency:'USD',bondYield:.04,cyclical:false}).valuation;
  expect(v?.balanceSheet?.end).toBe(years.at(-1)!.end);
  expect(v?.assumptions.join(' ')).toContain('predates TTM');
 });
});
it('admits reviewed native interim only after filing and preserves the currency boundary',async()=>{
 const {reviewedBalanceSheets}=await import('@/lib/value/latest-balance');
 const annual=makeYears().at(-1)!;annual.end='2025-12-31';
 const rows=reviewedBalanceSheets('GAMA.LSE');
 expect(latestBalanceAt(rows,'2026-09-07','GBP',annual)).toBeNull();
 expect(latestBalanceAt(rows,'2026-10-05','USD',annual)).toBeNull();
 expect(latestBalanceAt(rows,'2026-10-05','GBP',annual)?.values).toMatchObject({cash:21.8e6,totalDebt:40.3e6});
});
it('uses disclosed post-quarter financing without double-counting it in a later filed balance',async()=>{
 const {balanceSheetsFor}=await import('@/lib/value/latest-balance');
 const raw={Financials:{Balance_Sheet:{quarterly:{'2026-06-30':{currency_symbol:'USD',filing_date:'2026-08-05',cashAndShortTermInvestments:1.3e9,shortLongTermDebtTotal:2.1e9,totalAssets:10e9,totalStockholderEquity:6e9}}}}};
 const annual=makeYears().at(-1)!;annual.end='2025-12-31';
 const selected=latestBalanceAt(balanceSheetsFor('YUMC.US',raw),'2026-10-05','USD',annual);
 expect(selected?.basis).toBe('pro-forma');expect(selected?.values.totalDebt).toBe(3.3e9);expect(selected?.values.cash).toBe(1.3e9);
 const next=structuredClone(raw) as any;next.Financials.Balance_Sheet.quarterly['2026-09-30']={...raw.Financials.Balance_Sheet.quarterly['2026-06-30'],filing_date:'2026-11-05',shortLongTermDebtTotal:3.2e9};
 expect(latestBalanceAt(balanceSheetsFor('YUMC.US',next),'2026-12-01','USD',annual)?.values.totalDebt).toBe(3.2e9);
});
it('charges a disclosed pro-forma funding cost once and reconciles the earnings bridge',async()=>{
 const {balanceSheetsFor}=await import('@/lib/value/latest-balance');
 const years=makeYears({from:2015,overrides:{netIncome:100e6,da:0,capex:0,revenue:1e9}});
 const raw={Financials:{Balance_Sheet:{quarterly:{'2026-06-30':{currency_symbol:'USD',filing_date:'2026-08-08',cashAndShortTermInvestments:1.3e9,shortLongTermDebtTotal:2.1e9}}}}};
 const rows=balanceSheetsFor('YUMC.US',raw);
 expect(latestBalanceAt(rows,'2026-08-08','USD',years.at(-1)!)).toBeNull();
 const balance=latestBalanceAt(rows,'2026-10-05','USD',years.at(-1)!);
 const v=valueCompany({years,currency:'USD',kind:'operating',bondYield:.04,cyclical:false,balance}).valuation!;
 expect(v.normalized).toBe(76e6);
 const end=v.bridge.findIndex(r=>r.label==='= owner earnings');
 expect(v.bridge.slice(0,end).reduce((sum,r)=>sum+r.value,0)).toBe(v.normalized);
});
it('ignores date-only vendor placeholders when selecting the latest actual balance sheet',()=>{
 const placeholder=structuredClone(raw) as any;
 placeholder.Financials.Balance_Sheet.quarterly['2018-06-30']={filing_date:'2018-07-15',currency_symbol:'USD',totalAssets:null,cashAndShortTermInvestments:null,shortLongTermDebtTotal:null};
 const annual=makeYears().at(-1)!;annual.end='2017-12-31';
 expect(latestBalanceAt(balanceSheets(placeholder),'2018-08-01','USD',annual)?.end).toBe('2018-03-31');
});
