import {expect,it} from 'vitest';
import {valueCompany} from '@/lib/value/valuation';
import {balanceSheets} from '@/lib/value/latest-balance';
import {makeYears} from './synthetic';
import {balanceInputs} from '@/lib/value/valuation-inputs';
import {refreshBalanceValuation} from '@/lib/value/refresh-balance-valuation';

const years=()=>makeYears({overrides:{cash:500,totalDebt:600,revenue:1000,currentAssets:1000,currentLiabilities:100,netIncome:100,da:0,capex:0}});
const value=(industry:string, overrides:Record<string,unknown>={})=>valueCompany({years:years(),kind:'operating',industry,currency:'USD',bondYield:.04,cyclical:false,...overrides} as any).valuation!;

it.each(['Healthcare Plans','Managed Health Care','Insurance - Life','Capital Markets','Investment Banking & Brokerage','Education & Training Services'])('does not distribute unverified regulated/client/student cash for %s',industry=>{
 const v=value(industry);
 expect(v.netCash).toBe(0);
 expect(v.netDebt).toBe(600);
});
it('retains ordinary operating cash after the revenue reserve',()=>{
 expect(value('Consulting Services').netCash).toBe(480);
 expect(value('Consulting Services').netDebt).toBe(100);
});
it('reserves logistics float against non-borrowing current obligations',()=>{
 const ys=years();Object.assign(ys.at(-1)!,{cash:2467,currentAssets:6732,currentLiabilities:7381,shortTermDebt:67,totalDebt:67});
 expect(value('Integrated Freight & Logistics',{years:ys}).netCash).toBe(0);
 expect(value('Integrated Freight & Logistics',{years:ys}).netDebt).toBe(67);
});
it('does not zero all logistics cash when obligations are covered',()=>{
 const ys=years();Object.assign(ys.at(-1)!,{cash:500,currentAssets:800,currentLiabilities:450,shortTermDebt:50});
 // 400 operating liabilities less 300 noncash current assets reserve 100.
 expect(value('Integrated Freight & Logistics',{years:ys}).netCash).toBe(380);
});
it('does not credit a vendor cash aggregate larger than current assets',()=>{
 const ys=years();Object.assign(ys.at(-1)!,balanceSheets({Financials:{Balance_Sheet:{yearly:{'2023-12-31':{cashAndShortTermInvestments:1468.828,totalCurrentAssets:802.632,totalAssets:1334.491,shortLongTermDebtTotal:600}}}}})[0].values);
 expect(value('Consulting Services',{years:ys}).netCash).toBe(0);
});
it('uses current restrictions and liquidity without carrying annual balances forward',()=>{
 const ys=years();ys.at(-1)!.end='2025-12-31';
 const balance=balanceSheets({Financials:{Balance_Sheet:{quarterly:{'2026-06-30':{
  filing_date:'2026-08-01',currency_symbol:'USD',cash:500,shortLongTermDebtTotal:100,totalCurrentAssets:600,totalCurrentLiabilities:650,shortTermDebt:50,
 }}}}})[0];
 expect(value('Integrated Freight & Logistics',{years:ys,balance}).netCash).toBe(0);
});

it('excludes explicitly included restrictions but never deducts separate client/restricted balances twice',()=>{
 const ys=years();
 Object.assign(ys.at(-1)!,balanceInputs({cashAndCashEquivalentsAndRestrictedCash:500,restrictedCash:80,shortLongTermDebtTotal:100},false));
 expect(value('Consulting Services',{years:ys}).netCash).toBe(400);
 Object.assign(ys.at(-1)!,{cashExclusion:undefined},balanceInputs({cash:500,restrictedCash:80,segregatedClientFunds:200,shortLongTermDebtTotal:100},false));
 expect(value('Consulting Services',{years:ys}).netCash).toBe(480);
});
it('refreshes the industry policy even when no newer interim balance exists',()=>{
 const ys=years(),old=value('Consulting Services');
 const a={id:'SYNTHETIC.US',company:{kind:'operating',industry:'Healthcare Plans'},valuation:old,volatility:'stable'} as any;
 const next=refreshBalanceValuation(a,p=>p.startsWith('fundamentals/')?{years:ys}:null,'2026-10-05');
 expect(next.valuation.netCash).toBe(0);
 expect(next.valuation.normalized).toBe(old.normalized);
});
it('does not inherit an annual restriction in a newer independent balance',()=>{
 const ys=years();ys.at(-1)!.end='2025-12-31';ys.at(-1)!.cashExclusion={amount:500,reason:'annual restriction'};
 const balance=balanceSheets({Financials:{Balance_Sheet:{quarterly:{'2026-06-30':{filing_date:'2026-08-01',currency_symbol:'USD',cash:500,shortLongTermDebtTotal:100}}}}})[0];
 expect(value('Consulting Services',{years:ys,balance}).netCash).toBe(480);
});
