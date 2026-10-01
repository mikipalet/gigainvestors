import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parseEdinetCsv, yearsFromEdinet } from '../../../lib/value/japan/xbrl-csv';
import { ownerEarningsBridge } from '../../../lib/value/owner-earnings';
import { valueCompany } from '../../../lib/value/valuation';
import { valuationFlags } from '../../../lib/value/data-quality';
import { publishedBuyPrice } from '../../../lib/value/buy-price';
import { makeYears } from './synthetic';
const read=(doc:string)=>parseEdinetCsv(readFileSync(`tests/fixtures/value/edinet/japan-4/${doc}.csv`,'utf8'));
it('J5 uses recorded split-restated basic EPS once, without multiplying Hochiki or Daitron again',()=>{
 expect(yearsFromEdinet(read('S100YH50')).at(-1)?.dilutedShares).toBeCloseTo(74604184.898,0);
 expect(yearsFromEdinet(read('S100XUE0')).at(-1)?.dilutedShares).toBeCloseTo(21192613.636,0);
});
it('J5 reconciles unadjusted EPS only with a filed split, and holds unexplained share counts at publication',()=>{
 const rows=read('S100YH50').map(r=>r.element.endsWith(':BasicEarningsLossPerShareSummaryOfBusinessResults')&&r.context==='CurrentYearDuration'?{...r,value:'377.07'}:r);
 const split=yearsFromEdinet(rows).at(-1)!;
 expect(split.dilutedShares).toBeCloseTo(74604184.898,0);
 const unexplained=yearsFromEdinet(rows.filter(r=>!r.element.endsWith('TextBlock'))).at(-1)!;
 const v=valueCompany({years:makeYears({overrides:(base)=>({...unexplained,fy:base.fy,end:base.end})}),kind:'operating',bondYield:.02,cyclical:false}).valuation!;
 const flags=valuationFlags({price:1,mid:2,assumptions:v.assumptions});
 expect(flags.some(f=>/share count unreconciled/i.test(f))).toBe(true);
 expect(publishedBuyPrice({st:'s',t:'PPPPP',m:.25,v:[100,200,300],dataQualityFlags:flags},[100,'2026-09-29']).b).toBe(false);
});
it('J6 includes recorded BIPROGY software and actual lease cash, removing charged lease liabilities from debt',()=>{
 const y=yearsFromEdinet(read('S100YFCP')).at(-1)!;
 expect(y).toMatchObject({capex:17398000000,leaseCash:8756000000,totalDebt:50725000000});
 expect(ownerEarningsBridge([y])[0].value).toBe(22953000000);
});
it('J6 charges recorded Amano capitalized finance leases, including Japanese GAAP',()=>{
 const y=yearsFromEdinet(read('S100YJFL')).at(-1)!;
 expect(y).toMatchObject({capex:9126000000,leaseCash:6947000000,totalDebt:708000000});
 expect(ownerEarningsBridge([y])[0].value).toBe(14722000000);
});
it('J6 prefers a combined capex fact without adding its components twice',()=>{
 const rows=read('S100YFCP');rows.push({element:'jpigp_cor:PurchaseOfPropertyPlantAndEquipmentAndIntangibleAssetsInvCFIFRS',context:'CurrentYearDuration',unit:'円',value:'-17398000000'});
 expect(yearsFromEdinet(rows).at(-1)?.capex).toBe(17398000000);
});
it('J7 allocates consolidated cash-flow adjustments and net cash using recorded parent/total NI, without allocating parent NI twice',()=>{
 const y=yearsFromEdinet(read('S100XUA2')).at(-1)!;
 expect(y).toMatchObject({totalNetIncome:12540000000,minorityInterest:73116000000,equity:80152000000});
 const bridge=ownerEarningsBridge([y])[0];
 // Parent NI + (D&A - full capex - SBC - lease cash) * 9297 / 12540.
 expect(bridge.value).toBeCloseTo(7020940191.38756,0);
 const v=valueCompany({years:makeYears({overrides:(base)=>({...y,fy:base.fy,end:base.end})}),kind:'operating',bondYield:.02,cyclical:false}).valuation!;
 expect(v.netCash).toBeCloseTo(Math.max(0,y.cash!-.02*y.revenue!)*9297/12540,0);
 expect(v.netDebt).toBeCloseTo(-56349902870.8134,0);
});

it('J8 builds recorded Daitron TTM as annual plus H1 less comparative H1, retaining annual history',async()=>{
 const { trailingFromEdinet }=await import('../../../lib/value/japan/interim');
 const annual=yearsFromEdinet(read('S100XUE0')).at(-1)!;
 const ttm=trailingFromEdinet(read('S100YUIN'),annual,{periodStart:'2026-01-01',periodEnd:'2026-06-30'})!;
 expect(ttm).toMatchObject({end:'2026-06-30',revenue:113992476000,netIncome:5924468000,da:488688000});
 expect(annual.end).toBe('2025-12-31');
});
it('J8 rejects mismatched fiscal periods and does not zero-fill missing cash-flow facts',async()=>{
 const { trailingFromEdinet }=await import('../../../lib/value/japan/interim');
 const annual=yearsFromEdinet(read('S100XUE0')).at(-1)!;
 expect(trailingFromEdinet(read('S100YUIN'),annual,{periodStart:'2025-01-01',periodEnd:'2025-06-30'})).toBeNull();
 const missing=read('S100YUIN').filter(r=>!r.element.includes('DepreciationAndAmortization'));
 const ttm=trailingFromEdinet(missing,annual,{periodStart:'2026-01-01',periodEnd:'2026-06-30'})!;
 expect(ttm.da).toBeNull();expect(ownerEarningsBridge([ttm])[0]).toMatchObject({cashFlowBasis:true,maintenanceCapex:ttm.capex});
 expect(ownerEarningsBridge([{...ttm,ocf:null}])[0].value).toBeNull();
});

it('J5 accepts a treasury-share explanation and a matching price move, but flags missing EPS',async()=>{
 const {reconcileEdinetShares}=await import('../../../lib/value/japan/shares');
 const y=yearsFromEdinet(read('S100YH50')).at(-1)!;
 const treasury={...y,edinetShares:{...y.edinetShares!,basic:70,issued:100,filing:100,treasury:30}};
 expect(reconcileEdinetShares(treasury).edinetShares?.reconciled).toBe(true);
 const split={...y,end:'2026-03-31',edinetShares:{...y.edinetShares!,basic:25,issued:26.4,filing:79.2,treasury:1.4,splitFiled:false,filed:'2026-06-23'}};
 expect(reconcileEdinetShares(split,[['2026-03',300],['2026-04',100]]).dilutedShares).toBeCloseTo(75);
 expect(reconcileEdinetShares({...split,edinetShares:{...split.edinetShares,basic:null}}).edinetShares?.reconciled).toBe(false);
 const consolidation={...split,edinetShares:{...split.edinetShares,basic:75,issued:79.2,filing:26.4,treasury:4.2,splitFiled:true}};
 expect(reconcileEdinetShares(consolidation).dilutedShares).toBeCloseTo(25);
});
it('J7 keeps small minorities unchanged and refuses material minorities with an invalid allocation denominator',()=>{
 const y=yearsFromEdinet(read('S100XUA2')).at(-1)!;
 const small={...y,minorityInterest:1,totalNetIncome:null};
 expect(ownerEarningsBridge([small])[0].value).toBe(6227000000);
 expect(ownerEarningsBridge([{...y,totalNetIncome:0}])[0].value).toBeNull();
});
it('J7 retains parent-only equity when a later summary omits minority facts',async()=>{
 const {mergeYears}=await import('../../../lib/value/japan/xbrl-csv');
 const rows=read('S100XUA2'), original=yearsFromEdinet(rows);
 const summary=rows.filter(r=>r.element.includes('SummaryOfBusinessResults')||r.element.endsWith('DEI'));
 expect(mergeYears(original,yearsFromEdinet(summary)).at(-1)?.equity).toBe(80152000000);
});
it('J8 limits owner earnings using a weaker recorded RS Technologies H1 without changing the annual observation',async()=>{
 const {trailingFromEdinet}=await import('../../../lib/value/japan/interim');
 const annual=yearsFromEdinet(read('S100XUA2')).at(-1)!;
 const ttm=trailingFromEdinet(read('S100YWML'),annual,{periodStart:'2026-01-01',periodEnd:'2026-06-30'})!;
 expect(ttm).toMatchObject({netIncome:9646000000,da:5958000000,capex:10660000000,leaseCash:633000000});
 const years=makeYears({overrides:base=>({...annual,fy:base.fy,end:`${base.fy}-12-31`})});
 ttm.end='2026-06-30';
 const value=valueCompany({years,ttm,kind:'operating',bondYield:.02,cyclical:false}).valuation!;
 expect(value.normalized).toBeLessThan(7020940192);
 expect(value.assumptions.some(a=>a.startsWith('TTM ending 2026-06-30'))).toBe(true);
});
it('J5 does not treat an old split note in H1 as evidence for a new unexplained share jump',async()=>{
 const {applyEdinetInterim}=await import('../../../lib/value/japan/cached-interim');
 const annual=yearsFromEdinet(read('S100XUE0')).at(-1)!;
 const rows=read('S100YUIN').map(r=>r.element.includes('BasicEarningsLossPerShare')&&r.context==='InterimDuration'?{...r,value:'50'}:r.element.includes('IssuedSharesTotalNumberOfSharesEtc')&&!r.element.endsWith('TextBlock')?{...r,value:'71120000'}:r);
 rows.push({element:'j:NotesTextBlock',context:'InterimDuration',unit:null,value:'2020年4月1日付けで株式分割を行いました。'});
 const f={id:'7609.JP',currency:'JPY',years:[annual],integrity:{ok:true,reasons:[]},fetchedAt:'2026-09-29'};
 applyEdinetInterim(f,{docID:'S100YUIN',periodStart:'2026-01-01',periodEnd:'2026-06-30',submitDateTime:'2026-08-07',secCode:'76090',docTypeCode:'160',csvFlag:'1',withdrawalStatus:'0',disclosureStatus:'0',edinetCode:'E00000',filerName:'Daitron'},rows);
 expect(f.years[0].dilutedShares).toBeCloseTo(21192613.636,0);
 expect(f.years[0].edinetShares?.reconciled).toBe(false);
});
it('J5 preserves EPS restatements in older years when a newer filing replaces their share denominator',async()=>{
 const {mergeYears}=await import('../../../lib/value/japan/xbrl-csv');
 const {reconcileEdinetShares}=await import('../../../lib/value/japan/shares');
 const older=yearsFromEdinet(read('S100XUE0'));
 const {edinetShares: _facts,...restated}=older.at(-1)!;
 restated.dilutedShares=42385227.27272727;
 const merged=mergeYears(older,[restated]);
 expect(reconcileEdinetShares(merged.at(-1)!).dilutedShares).toBeCloseTo(42385227.27272727);
});
