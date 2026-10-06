import {expect,it} from 'vitest';
import {valueCompany} from '@/lib/value/valuation';
import {emptyYear} from '@/lib/value/completeness/second-sources';
const years=Array.from({length:10},(_,i)=>({...emptyYear(`${2016+i}-12-31`,'USD'),revenue:100,netIncome:12,commonNetIncome:11,equity:100,goodwill:10,intangibles:0,dilutedShares:10,dividendsPaid:3}));
const commonBalance={end:'2026-06-30',currency:'USD',commonEquity:95,goodwillAndIntangibles:9,shares:8,source:'https://issuer.test/interim#common-capital',basis:'effective-common' as const};
it('uses dated common equity and effective common shares together without relabeling a buyback as a split',()=>{
 const {valuation:v}=valueCompany({years,kind:'insurer',bondYield:.04,currency:'USD',currentCommonBalance:commonBalance} as any);
 expect(v?.shares).toBe(8);expect(v?.normalized).toBe((95-9)/8);
 expect(v?.shareSources).toBeUndefined();expect(v?.shareBasis).toBe('effective-common');
 expect(v?.assumptions.some(a=>a.includes('2026-06-30')&&a.includes('effective-common'))).toBe(true);
 expect(v?.assumptions.some(a=>a.includes('split/bonus'))).toBe(false);
 expect(years.at(-1)?.dilutedShares).toBe(10);
});
it.each([{...commonBalance,currency:'CAD'},{...commonBalance,end:'2025-06-30'},{...commonBalance,end:'2099-06-30'},{...commonBalance,shares:0},{...commonBalance,source:''}])('rejects an incompatible or unbound balance %j',balance=>{
 const {valuation:v}=valueCompany({years,kind:'insurer',bondYield:.04,currency:'USD',currentCommonBalance:balance} as any);
 expect(v?.shares).toBe(10);expect(v?.normalized).toBe(9);
});

const datedBalance={end:'2026-03-31',filed:'2026-05-01',currency:'USD',source:'https://issuer.test/balance',basis:'filed' as const,values:{equity:120,goodwill:10,intangibles:0,minorityInterest:0}};
function select(common:unknown,dated:unknown=datedBalance){
 return valueCompany({years,kind:'insurer',bondYield:.04,currency:'USD',cyclical:false,cutoff:'2026-10-06',currentCommonBalance:common,balance:dated} as any).valuation!;
}
it('prefers a newer reviewed common balance and binds metadata to its share basis',()=>{
 const v=select(commonBalance);
 expect(v.normalized).toBe(86/8);expect(v.shares).toBe(8);
 expect(v.balanceSheet).toMatchObject({end:commonBalance.end,source:commonBalance.source,basis:'effective-common'});
});
it('uses a newer dated statement when the reviewed common observation is stale',()=>{
 const v=select(commonBalance,{...datedBalance,end:'2026-09-30',filed:'2026-10-01'});
 expect(v.normalized).toBe(11);expect(v.shares).toBe(10);
 expect(v.balanceSheet?.basis).toBe('filed');expect(v.shareBasis).toBeUndefined();
});
it('honors explicit reviewed authority over a newer dated statement',()=>{
 const v=select({...commonBalance,authoritative:true},{...datedBalance,end:'2026-09-30',filed:'2026-10-01'});
 expect(v.normalized).toBe(86/8);expect(v.shares).toBe(8);
});
it('does not select a reviewed observation before its filing was available',()=>{
 const v=select({...commonBalance,filed:'2026-10-07'});
 expect(v.normalized).toBe(11);expect(v.balanceSheet?.end).toBe(datedBalance.end);
});
it('falls back to annual when neither dated candidate is available',()=>{
 const v=select({...commonBalance,filed:'2026-10-07'},{...datedBalance,filed:'2026-10-07'});
 expect(v.normalized).toBe(9);expect(v.balanceSheet?.basis).toBe('annual');
});
it('retains legacy common book for version 1 while version 2 uses tangible common book',()=>{
 const v=valueCompany({years,kind:'insurer',bondYield:.04,currency:'USD',cyclical:false,version:1,currentCommonBalance:commonBalance,cutoff:'2026-10-06'}).valuation!;
 expect(v.normalized).toBe(95/8);expect(v.shareBasis).toBe('effective-common');
});
