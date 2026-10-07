import {expect,it} from 'vitest';
import {ownerEarningsBridge, trailingOwnerEarnings} from '@/lib/value/owner-earnings';
import {valueCompany} from '@/lib/value/valuation';
import {makeYears} from './synthetic';
const value=(years=makeYears(),extra={})=>valueCompany({years,kind:'operating',bondYield:.04,cyclical:false,...extra});
it('charges SBC once on NI and still charges it on OCF',()=>{
 const y=makeYears({n:1,overrides:{netIncome:100,da:20,capex:20,sbc:15,ocf:135}})[0];
 expect(ownerEarningsBridge([y])[0].value).toBe(100);
 expect(ownerEarningsBridge([{...y,da:null}])[0].value).toBe(100);
});
it.each([false,true])('normalizes current scale without quality eligibility %s',qualityPass=>{
 const years=makeYears({n:5,overrides:(_,i)=>({revenue:[100,200,400,800,1600][i],netIncome:[10,20,40,80,160][i],da:0,capex:0})});
 expect(value(years,{qualityPass}).valuation?.normalized).toBe(160);
 expect(value(years,{ttm:{...years[4],end:'2030-06-30',revenue:2000,netIncome:1}}).valuation?.normalized).toBe(200);
});
it('keeps loss years in the cyclical median and scales down a revenue collapse',()=>{
 const years=makeYears({n:5,overrides:(_,i)=>({revenue:1000,netIncome:[-50,100,200,300,400][i],da:0,capex:0})});
 const v=value(years,{cyclical:true,ttm:{...years[4],end:'2030-06-30',revenue:100,netIncome:-10}}).valuation!;
 expect(v.normalized).toBe(20);expect(v.growth).toBe(0);
});
it('rejects missing margin years and nonpositive median without flooring small positive margins',()=>{
 expect(value(makeYears({n:4})).valuation).toBeNull();
 expect(value(makeYears({overrides:{revenue:0}})).valuation).toBeNull();
 expect(value(makeYears({overrides:{netIncome:-1,da:0,capex:0}})).valuation).toBeNull();
 expect(value(makeYears({overrides:{netIncome:1e-8,da:0,capex:0}})).valuation?.normalized).toBeCloseTo(1e-8,12);
});
it('estimates TTM maintenance from annual capacity context and never inherits annual judgement',()=>{
 const years=makeYears({n:5,overrides:{revenue:1000,ppe:500,netIncome:100,da:20,capex:100,maintenanceCapexJudgement:1}});
 const ttm={...years[4],end:'2030-06-30',revenue:1200,capex:120,netIncome:150};
 const row=trailingOwnerEarnings(years,ttm);
 expect(row.maintenanceCapex).toBe(20);expect(row.value).toBe(150);
});
it('the normalized monetary bridge sums to owner earnings',()=>{
 const years=makeYears({n:5,overrides:(_,i)=>({revenue:100*(i+1),netIncome:10*(i+1),da:5,capex:5,sbc:3})});
 const v=value(years).valuation!;
 const end=v.bridge.findIndex(r=>r.label==='= owner earnings');
 expect(v.bridge.slice(0,end).reduce((s,r)=>s+r.value,0)).toBeCloseTo(v.normalized,10);
});
it('does not carry annual judgements, minority profit or lease cash into TTM flows',async()=>{
 const {trailingInputs}=await import('@/lib/value/valuation-inputs');
 const annual=makeYears({from:2020,n:5,overrides:{currency:'USD',totalNetIncome:130,leaseCash:8,maintenanceCapexJudgement:1,disclosedMaintenanceCapex:1}}).at(-1)!;
 const dates=['2025-03-31','2025-06-30','2025-09-30','2025-12-31'];
 const raw={Financials:{Income_Statement:{quarterly:Object.fromEntries(dates.map(d=>[d,{totalRevenue:300,netIncome:25,depreciationAndAmortization:5}]))},Cash_Flow:{quarterly:Object.fromEntries(dates.map(d=>[d,{capitalExpenditures:15,totalCashFromOperatingActivities:35}]))}}};
 const t=trailingInputs(raw,annual,'2026-10-07')!;
 expect(t.revenue).toBe(1200);expect(t.totalNetIncome).toBeNull();expect(t.leaseCash).toBeNull();expect(t.leaseCashIncomplete).toBe(true);
 expect(t.maintenanceCapexJudgement).toBeUndefined();expect(t.disclosedMaintenanceCapex).toBeUndefined();
});
it('uses available operating cash flow when net income is absent even if D&A is reported',()=>{
 const y=makeYears({n:1,overrides:{netIncome:null,ocf:130,da:20,capex:30,sbc:10}})[0];
 expect(ownerEarningsBridge([y])[0].value).toBe(90);
});
it('uses the same maintenance estimate on an OCF fallback with reported D&A',()=>{
 const years=makeYears({n:2,overrides:(_,i)=>({revenue:i?2000:1000,ppe:1000,netIncome:null,ocf:130,da:20,capex:50,sbc:10})});
 expect(ownerEarningsBridge(years)[1].maintenanceCapex).toBe(20);
 expect(ownerEarningsBridge(years)[1].value).toBe(100);
});
