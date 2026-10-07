import assert from 'node:assert/strict';
import {ownerEarningsBridge as oldBridge} from '../../lib/value/owner-earnings';
import {ownerEarningsBridge as bridge} from '../../.audit/rules-5/sbc_once/lib/value/owner-earnings';
import {valueCompany as base} from '../../lib/value/valuation';
import {valueCompany as scale,valuationMargin} from '../../.audit/rules-5/current_scale/lib/value/valuation';
import {makeYears} from '../../tests/unit/value/synthetic';
const y=makeYears({n:1,overrides:{netIncome:80,da:10,capex:10,sbc:20,ocf:110}});
assert.equal(oldBridge(y)[0].value,60);assert.equal(bridge(y)[0].value,80);assert.equal(bridge([{...y[0],da:null}])[0].value,80);
const ys=makeYears({overrides:(_,i)=>{const revenue=1000*1.2**i;return {revenue,netIncome:.2*revenue,operatingIncome:.25*revenue,preTaxIncome:.25*revenue,taxExpense:.05*revenue,da:.02*revenue,capex:.02*revenue,equity:.5*revenue,cash:0,totalDebt:0,sbc:0};}});
const args={years:ys,kind:'operating' as const,bondYield:.04,cyclical:true,qualityPass:true};
const b=base(args).valuation!,c=scale(args).valuation!;
assert(c.normalized>b.normalized);assert(Math.abs(c.normalized-ys.at(-1)!.netIncome!)<1e-6);assert.equal(c.tier,'standard');assert.equal(valuationMargin(c,'volatile'),.5);
assert.equal(scale({...args,qualityPass:false}).valuation!.normalized,b.normalized);
const bad=structuredClone(ys);bad[7].netIncome=-1;assert.equal(scale({...args,years:bad}).valuation!.normalized,base({...args,years:bad}).valuation!.normalized);
const dip=structuredClone(ys);dip.at(-1)!.netIncome=50;assert.equal(scale({...args,years:dip}).valuation!.normalized,50);
const ttm={...ys.at(-1)!,end:'2026-06-30',netIncome:40,da:10,capex:10};assert.equal(scale({...args,ttm}).valuation!.normalized,40);
for(const v of [c,scale({...args,years:dip}).valuation!,scale({...args,ttm}).valuation!]){const n=v.bridge.findIndex(r=>r.label==='= owner earnings');assert(Math.abs(v.bridge.slice(0,n).reduce((s,r)=>s+r.value,0)-v.normalized)<1e-6);}
console.log('PASS: SBC identity, OCF retention, current scale, quality/positive-history eligibility, latest and TTM downturn caps, cyclicality/MOS unchanged, bridge arithmetic');
