import {expect,it} from 'vitest';
import {normalizeEodhd} from '@/lib/value/normalize-eodhd';
import {emptyYear} from '@/lib/value/completeness/second-sources';
it('corrects a vendor currency label only when independent income and assets corroborate the units',()=>{
 const raw={Financials:{Income_Statement:{yearly:{'2020-03-31':{currency_symbol:'EUR',netIncome:100,totalRevenue:1000}}},Balance_Sheet:{yearly:{'2020-03-31':{totalAssets:2000}}}}};
 const anchor={...emptyYear('2020-03-31','JPY'),netIncome:100,totalAssets:2000,provenance:{netIncome:{source:'https://issuer.example/report',field:'Profit',method:'reported' as const}}};
 const y=normalizeEodhd(raw,'X.JP',{corroboratingYears:[anchor]}).fundamentals.years[0];
 expect(y.currency).toBe('JPY');expect(y.netIncome).toBe(100);expect(y.provenance?.currency?.inputs).toContain('Vendor label EUR; corroborated JPY');
 expect(normalizeEodhd(raw,'X.JP',{corroboratingYears:[{...anchor,totalAssets:3000}]}).fundamentals.years[0].currency).toBe('EUR');
});
it('repairs an income currency label corroborated by the balance and cash-flow statement and matching income',()=>{
 const raw={Financials:{Income_Statement:{yearly:{'2021-12-31':{netIncome:100,currency_symbol:'USD'},'2022-12-31':{netIncome:120,currency_symbol:'SGD'}}},Balance_Sheet:{yearly:{'2021-12-31':{currency_symbol:'SGD'}}},Cash_Flow:{yearly:{'2021-12-31':{currency_symbol:'SGD',netIncome:100}}}}};
 expect(normalizeEodhd(raw,'X.US').fundamentals.years[0].currency).toBe('SGD');
 raw.Financials.Cash_Flow.yearly['2021-12-31'].netIncome=200;
 let observed:any[]=[];normalizeEodhd(raw,'X.US',{onSourceYears:ys=>observed=ys});expect(observed[0].currency).toBe('USD');
});
it('can corroborate currency from two independent nonzero reported balance components',()=>{
 const raw={Financials:{Income_Statement:{yearly:{'2021-12-31':{netIncome:100,currency_symbol:'USD'}}},Balance_Sheet:{yearly:{'2021-12-31':{inventory:80,shortTermDebt:90}}}}};
 const anchor={...emptyYear('2021-12-31','SGD'),inventory:80,shortTermDebt:90};
 expect(normalizeEodhd(raw,'X.US',{corroboratingYears:[anchor]}).fundamentals.years[0].currency).toBe('SGD');
 expect(normalizeEodhd(raw,'X.US',{corroboratingYears:[{...anchor,inventory:0}]}).fundamentals.years[0].currency).toBe('USD');
});
