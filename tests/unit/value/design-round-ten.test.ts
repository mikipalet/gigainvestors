import { expect, it } from 'vitest';
import { ownerReturn, referenceMetrics } from '@/lib/value/owner-return';
import { marketRegion, matchesMarket } from '@/lib/value/listing-details';
import type { Dossier, Valuation } from '@/lib/value/types';
const valuation={method:'owner_earnings',currency:'USD',normalized:10.2e9,shares:5e9,growth:.01,terminalGrowth:.03,discountRate:.1,netCash:-20e9} as Valuation;
it('uses normalized cash over current capitalisation, never the historical equityBondYield',()=>{
 expect(ownerReturn(valuation,'USD',375e9,75)).toMatchObject({cash:10.2e9,capital:375e9,yield:10.2/375,growth:.01});
 const foreign={...valuation,currency:'EUR',perShareTrading:{currency:'USD',fxRate:2,low:1,mid:2,high:3}};
 expect(ownerReturn(foreign,'USD',375e9,75)?.capital).toBe(187.5e9);
 expect(ownerReturn({...valuation,method:'book_value'},'USD',375e9,75)).toBeNull();
 expect(ownerReturn({...valuation,currency:'JPY'},'USD',375e9,75)).toBeNull();
 expect(ownerReturn(valuation,'USD',0,null)).toBeNull();
});
it('derives annual reference metrics with aligned dividends and actual year intervals',()=>{
 const d={valuation,company:{currency:'USD',marketCapUsd:375e9},series:{netIncome:[[2024,20e9],[2025,25e9]],retainedEarnings:[[2025,15e9]],revenue:[[2016,100],[2025,200]]}} as unknown as Dossier;
 expect(referenceMetrics(d,75)).toMatchObject({pe:15,dividendYield:10/375,netDebtToEarnings:.8,revenueGrowth:2**(1/9)-1,first:2016,last:2025});
 expect(referenceMetrics({...d,series:{netIncome:[[2025,-1]],retainedEarnings:[[2024,10]]}},75)).toMatchObject({pe:null,dividendYield:null,netDebtToEarnings:null,revenueGrowth:null});
});
it('filters listing access, including US ADS independently of company origin',()=>{
 expect(marketRegion({id:'INFY.US',c:'US'})).toBe('US');
 expect(matchesMarket({w:'INFY.US'},'')).toBe(true);
 expect(matchesMarket({w:null},'')).toBe(false);
 expect(matchesMarket({w:null},'all')).toBe(true);
 expect(matchesMarket({w:null},'')).toBe(false);
});
