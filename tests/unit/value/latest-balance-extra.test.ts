import {expect,it} from 'vitest';
import {valueCompany} from '@/lib/value/valuation';
import {balanceSheets,latestBalanceAt} from '@/lib/value/latest-balance';
import {makeYears} from './synthetic';
it('uses current tangible equity with the original return history and shares',()=>{
 const years=makeYears({from:2015});
 const raw={Financials:{Balance_Sheet:{quarterly:{'2026-06-30':{filing_date:'2026-08-01',currency_symbol:'USD',totalStockholderEquity:800,goodWill:30,intangibleAssets:20,commonStockSharesOutstanding:999}}}}};
 const balance=latestBalanceAt(balanceSheets(raw),'2026-10-05','USD',years.at(-1)!);
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
 expect(result.netCash).toBe(60);expect(result.normalized).toBe(20);
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
 expect(result.normalized).toBe(30);
 expect(result.assumptions.join(' ')).toContain('annual lease estimate retained');
});
