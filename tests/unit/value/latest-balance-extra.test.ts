import {expect,it} from 'vitest';
import {trailingOwnerEarnings} from '@/lib/value/owner-earnings';
import {valueCompany} from '@/lib/value/valuation';
import {balanceSheets,latestBalanceAt} from '@/lib/value/latest-balance';
import {makeYears} from './synthetic';
it('uses current tangible equity with the original return history and shares',()=>{
 const years=makeYears({from:2015});
 const raw={Financials:{Balance_Sheet:{quarterly:{'2026-06-30':{filing_date:'2026-08-01',currency_symbol:'USD',totalStockholderEquity:800,goodWill:30,intangibleAssets:20,commonStockSharesOutstanding:999}}}}};
 const balance=latestBalanceAt(balanceSheets(raw),'2026-10-05','USD',years.at(-1)!,'bank');
 const before=valueCompany({years,kind:'bank',currency:'USD',bondYield:.04,cyclical:false}).valuation!;
 const after=valueCompany({years,kind:'bank',currency:'USD',bondYield:.04,cyclical:false,balance}).valuation!;
 expect(after.shares).toBe(before.shares);expect(after.normalized).toBe(75);
 expect(after.financialReturn!.roe).toBe(before.financialReturn!.roe);
 expect(after.perShare.mid/before.perShare.mid).toBeCloseTo(750/500);
});
it('uses TTM revenue for the reserve and current leases only in the trailing bridge',()=>{
 const years=makeYears({from:2015});
 const ttm={...years.at(-1)!,end:'2026-06-30',revenue:2000,capex:70,leaseDepreciationIncluded:true,leaseLiabilities:100};
 const raw={Financials:{Balance_Sheet:{quarterly:{'2026-06-30':{filing_date:'2026-08-01',currency_symbol:'USD',cash:100,shortLongTermDebtTotal:200,capitalLeaseObligations:150}}}}};
 const balance=latestBalanceAt(balanceSheets(raw),'2026-10-05','USD',years.at(-1)!);
 const result=valueCompany({years,ttm,balance,kind:'operating',currency:'USD',bondYield:.04,cyclical:false}).valuation!;
 expect(result.netCash).toBe(60);expect(result.normalized).toBe(200);expect(trailingOwnerEarnings(years,{...ttm,leaseLiabilities:150}).leaseCashCost).toBe(30);
 expect(years.at(-1)!.cash).toBe(100);expect(ttm.leaseLiabilities).toBe(100);
});
it('keeps the established same-statement debt-component mapping for interims',()=>{
 const raw={General:{CurrencyCode:'USD'},Financials:{Balance_Sheet:{quarterly:{'2026-06-30':{filing_date:'2026-08-01',cash:100,longTermDebt:400,capitalLeaseObligations:30}}}}};
 expect(balanceSheets(raw)[0].values.totalDebt).toBe(430);
 expect(balanceSheets(raw)[0].values.debtIncludesLeases).toBe(true);
});
it('does not erase a TTM lease charge when the new balance omits lease obligations',()=>{
 const years=makeYears({from:2015});
 const ttm={...years.at(-1)!,end:'2026-06-30',capex:70,leaseDepreciationIncluded:true,leaseLiabilities:100};
 const raw={Financials:{Balance_Sheet:{quarterly:{'2026-06-30':{filing_date:'2026-08-01',currency_symbol:'USD',cash:100,shortLongTermDebtTotal:200}}}}};
 const balance=latestBalanceAt(balanceSheets(raw),'2026-10-05','USD',years.at(-1)!);
 const result=valueCompany({years,ttm,balance,kind:'operating',currency:'USD',bondYield:.04,cyclical:false}).valuation!;
 expect(result.normalized).toBe(100);
 expect(trailingOwnerEarnings(years,ttm).leaseCashCost).toBe(20);
});
it('uses an older complete annual balance when the latest annual balance is partial',()=>{
 const years=makeYears({from:2015});years.at(-1)!.totalDebt=null;
 const v=valueCompany({years,kind:'operating',currency:'USD',bondYield:.04,cyclical:false}).valuation!;
 expect(v).not.toBeNull();expect(v.balanceSheet?.end).toBe('2024-12-31');
});
it('reconciles financial balance components to exact-period issuer facts',async()=>{
 const {correctFinancialBalances}=await import('@/lib/value/latest-balance');
 const rows=balanceSheets({General:{CurrencyCode:'USD'},Financials:{Balance_Sheet:{quarterly:{'2026-06-30':{filing_date:'2026-08-01',totalStockholderEquity:100,goodWill:10,intangibleAssets:200}}}}});
 const facts={cik:1,facts:{'us-gaap':{IntangibleAssetsNetExcludingGoodwill:{units:{USD:[{end:'2026-06-30',val:5,filed:'2026-08-01',form:'10-Q',accn:'0000000001-26-000001'}]}}}}};
 const next=correctFinancialBalances(rows,facts,'2026-10-06');
 expect(next[0].values.intangibles).toBe(5);expect(next[0].source).toContain('0000000001-26-000001');
 expect(rows[0].values.intangibles).toBe(200);
 expect(correctFinancialBalances(rows,facts,'2026-08-01')[0].values.intangibles).toBe(200);
});
