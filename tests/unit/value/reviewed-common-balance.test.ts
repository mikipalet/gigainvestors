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
