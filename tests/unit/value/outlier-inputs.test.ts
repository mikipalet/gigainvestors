import {expect,it,describe} from 'vitest';
import {ownerEarningsBridge,operatingReplenishment,reportedCapex,trailingOwnerEarnings} from '@/lib/value/owner-earnings';
import {valueCompany} from '@/lib/value/valuation';
import {parentEquityShare} from '@/lib/value/parent-share';
import {balanceSheets,latestBalanceAt,plausibleBalances,type BalanceSheet} from '@/lib/value/latest-balance';
import {makeYears} from './synthetic';

const value=(years:ReturnType<typeof makeYears>,extra={})=>valueCompany({years,kind:'operating',currency:'USD',bondYield:.04,cyclical:false,...extra});

// PROG Holdings FY2021-FY2025 (USD m). The vendor D&A includes depreciation of lease
// merchandise (10-K: 1,576.3 / 1,621.1 / 1,590.2 in 2023-2025); additions to lease
// merchandise (1,721.1 / 1,850.4 / 1,696.6) are operating cash flows, not capex.
const prog=()=>makeYears({from:2021,n:5,overrides:(_,i)=>({
 revenue:[2677.9,2597.8,2408.3,2463.5,2409.2][i]*1e6,netIncome:[243.6,98.7,138.8,197.2,146.8][i]*1e6,
 da:[28.4,1791.6,1608.3,1648.1,423.2][i]*1e6,capex:[9.6,9.7,9.6,8.3,10.0][i]*1e6,
 ocf:[246.0,242.5,204.2,138.5,335.0][i]*1e6,sbc:[21.3,17.5,24.9,29.2,28.8][i]*1e6,ppe:22e6,dilutedShares:41e6,
})});

describe('D&A replenished inside operating cash flow',()=>{
 it('uses operating cash flow less capex and stock compensation for lease-to-own (PRG.US)',()=>{
  const rows=ownerEarningsBridge(prog());
  expect(rows.map(r=>r.operatingReplenishment)).toEqual([false,true,true,true,true]);
  // FY2022: 242.5 - 9.7 - 17.5, never 98.7 + 1,791.6 - 9.7
  expect(rows[1].value!/1e6).toBeCloseTo(215.3,1);
  // FY2024: 138.5 - 8.3 - 29.2, never 197.2 + 1,648.1 - 8.3
  expect(rows[3].value!/1e6).toBeCloseTo(101.0,1);
  expect(rows[3].cashFlowBasis).toBe(true);
  // FY2025 vendor D&A (423.2) is itself incomplete; the regime still holds.
  expect(rows[4].value!/1e6).toBeCloseTo(296.2,1);
  const v=value(prog()).valuation!;
  // Median FY2022 margin (8.3%) on FY2025 revenue, not the 72% the vendor D&A implied.
  expect(v.normalized/1e6).toBeCloseTo(215.3/2597.8*2409.2,1);
  expect(v.assumptions.join(' ')).toContain('D&A is replenished inside operating cash flow');
  expect(v.bridge[0].label).toBe('cash before maintenance investment');
 });
 it('keeps net income plus D&A for a one-year working-capital swing',()=>{
  const years=makeYears({n:5,overrides:(_,i)=>({da:100,capex:20,netIncome:100,ocf:i===4?110:220})});
  expect(operatingReplenishment(years,years[4].fy)).toBe(false);
  expect(ownerEarningsBridge(years)[4].value).toBe(180);
 });
 it('does not switch a business whose capex replaces its D&A',()=>{
  const years=makeYears({n:5,overrides:{da:100,capex:90,netIncome:100,ocf:105}});
  expect(ownerEarningsBridge(years).every(r=>!r.operatingReplenishment)).toBe(true);
 });
 it('carries the annual regime into the TTM observation',()=>{
  const years=prog();
  const ttm={...years[4],end:'2026-06-30',revenue:2523.7e6,netIncome:146.7e6,da:1555.6e6,capex:14.3e6,ocf:186.8e6,sbc:31.1e6};
  const row=trailingOwnerEarnings(years,ttm);
  expect(row.cashFlowBasis).toBe(true);
  expect(row.value!/1e6).toBeCloseTo(186.8-14.3-31.1,1);
 });
});

describe('capex absent from a complete cash-flow statement',()=>{
 const absent={source:'statements',field:'capex',method:'absent-in-complete-statement' as const,inputs:['complete cash-flow statement']};
 it('is unknown when the company depreciates or carries material fixed assets',()=>{
  const steel=makeYears({n:5,overrides:{revenue:4.5e12,da:2.7e11,ppe:2e12,capex:0,netIncome:1e11,ocf:3.8e11,provenance:{capex:absent}}});
  expect(reportedCapex(steel[0])).toBeNull();
  expect(ownerEarningsBridge(steel,{strictCapex:true}).every(r=>r.value===null)).toBe(true);
  expect(value(steel).valuation).toBeNull();
  // Quality tests keep the published input; only the valuation refuses to guess.
  expect(ownerEarningsBridge(steel).every(r=>r.value!==null)).toBe(true);
  const airline=makeYears({n:1,overrides:{revenue:2e12,da:null,ppe:1.2e12,capex:0,ocf:3.9e11,provenance:{capex:absent}}})[0];
  expect(ownerEarningsBridge([airline],{strictCapex:true})[0].value).toBeNull();
 });
 it('is zero for a business without material fixed assets',()=>{
  const light=makeYears({n:1,overrides:{revenue:1000,da:5,ppe:20,capex:0,provenance:{capex:absent}}})[0];
  expect(reportedCapex(light)).toBe(0);
  expect(ownerEarningsBridge([light],{strictCapex:true})[0].value).toBe(105);
 });
});

describe('minority holders’ share of consolidated cash',()=>{
 it('allocates cash and debt by parent equity when no profit split is reported',()=>{
  expect(parentEquityShare({equity:3015e9,minorityInterest:2271e9})).toBeCloseTo(.5704,4);
  expect(parentEquityShare({equity:100,minorityInterest:5})).toBe(1);
  expect(parentEquityShare({equity:100,minorityInterest:null})).toBe(1);
  const years=makeYears({n:5,overrides:{revenue:1000,netIncome:100,cash:5000,totalDebt:0,equity:3000,minorityInterest:2000}});
  const v=value(years).valuation!;
  expect(v.netCash).toBeCloseTo((5000-.02*1000)*.6,6);
  expect(v.assumptions.join(' ')).toContain('parent equity / (parent equity + non-controlling interests) = 60.0%');
 });
 it('keeps the reported profit split when it exists',()=>{
  const years=makeYears({n:5,overrides:{revenue:1000,netIncome:80,totalNetIncome:100,cash:5000,totalDebt:0,equity:3000,minorityInterest:2000}});
  const v=value(years).valuation!;
  expect(v.netCash).toBeCloseTo((5000-.02*1000)*.8,6);
 });
});

describe('interim balance sheets in another unit scale',()=>{
 const sheet=(end:string,values:Partial<BalanceSheet['values']>):BalanceSheet=>({end,filed:'2026-10-01',currency:'USD',source:'test',basis:'filed',
  values:{cash:null,cashExclusion:undefined,clientAssets:null,shortTermDebt:null,totalDebt:null,equity:null,goodwill:null,intangibles:null,totalAssets:null,minorityInterest:null,leaseLiabilities:null,sharesOutstanding:null,debtIncludesLeases:false,...values} as BalanceSheet['values']});
 it('rejects a statement 1,000× its predecessor and falls back to the last plausible one (PRVA.US 2026-06-30)',()=>{
  const rows=[sheet('2026-03-31',{cash:419.5e6,totalDebt:9.0e6,equity:753.1e6,totalAssets:1417.9e6}),
   sheet('2026-06-30',{cash:412.2e9,totalDebt:8.7e9,equity:782.3e9,totalAssets:1488.6e9})];
  const annual=makeYears({from:2025,n:1,overrides:{totalAssets:1369.4e6}})[0];
  expect(latestBalanceAt(rows,'2026-10-12','USD',annual)?.end).toBe('2026-03-31');
 });
 it('rejects a statement whose cash or equity exceed its assets and keeps later plausible statements (WYFI.US, JEF.US)',()=>{
  const rows=[sheet('2025-12-31',{cash:114.4e6,totalDebt:23.4e6,equity:482.5e6,totalAssets:651.4e6}),
   sheet('2026-03-31',{cash:.64e6,totalDebt:2.0e6,equity:2.8e6,totalAssets:6.4e6}),
   sheet('2026-06-30',{cash:56.1e6,totalDebt:43.8e6,equity:337.4e6,totalAssets:880.9e6}),
   sheet('2026-08-31',{cash:16.9e6,totalDebt:1465.8e6,equity:10714.4e6,totalAssets:81.3e6})];
  const kept=plausibleBalances(rows);
  expect(rows.filter(r=>kept.has(r)).map(r=>r.end)).toEqual(['2025-12-31','2026-06-30']);
 });
 it('still reads ordinary vendor statements',()=>{
  const raw={Financials:{Balance_Sheet:{quarterly:{'2018-03-31':{filing_date:'2018-05-10',currency_symbol:'USD',cashAndShortTermInvestments:812e6,shortLongTermDebtTotal:19367e6,totalAssets:35000e6}}}}};
  const annual=makeYears().at(-1)!;annual.end='2017-12-31';
  expect(latestBalanceAt(balanceSheets(raw),'2018-06-30','USD',annual)?.end).toBe('2018-03-31');
 });
});

describe('share splits after a Japanese annual report',()=>{
 const edinet=(yearEndPrice:number|null)=>({basic:1901.8e6,issued:1934e6,filing:1934e6,treasury:null,splitFiled:false,filed:'2026-06-26',reconciled:true,reason:'EDINET basic EPS shares reconciled to filing-date issued shares',yearEndPrice});
 const tokio=(price:number|null)=>makeYears({from:2017,n:10,overrides:(y)=>({end:`${y.fy}-03-31`,dilutedShares:1901.8e6,...(y.fy===2026?{edinetShares:edinet(price)}:{})})});
 const history:[string,number][]=[['2026-02',470.1],['2026-03',487.2],['2026-04',500]];
 it('multiplies the filing share count by the split the vendor history already reflects (8766.JP 15:1)',async()=>{
  const {postFilingShareChange}=await import('@/lib/value/valuation');
  expect(postFilingShareChange(tokio(7307.8).at(-1)!,history)).toBe(15);
  const v=value(tokio(7307.8),{priceHistory:history}).valuation!;
  expect(v.shares).toBeCloseTo(1901.8e6*15,0);
  expect(v.assumptions.join(' ')).toContain('share count × 15 for a share split after the annual report');
 });
 it('changes nothing when the report already reflects the split or the ratio is not whole',async()=>{
  const {postFilingShareChange}=await import('@/lib/value/valuation');
  expect(postFilingShareChange(tokio(487.9).at(-1)!,history)).toBe(1);
  expect(postFilingShareChange(tokio(1100).at(-1)!,history)).toBe(1);
  expect(postFilingShareChange(tokio(null).at(-1)!,history)).toBe(1);
  expect(value(tokio(487.9),{priceHistory:history}).valuation!.shares).toBeCloseTo(1901.8e6,0);
 });
});
