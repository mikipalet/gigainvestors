import { expect, it } from 'vitest';
import snapshots from '../../fixtures/value/financial-v2.json';
import { valueCompany } from '@/lib/value/valuation';
import { ownerReturn, buyReturnInputs } from '@/lib/value/owner-return';
import { publishedBuyPrice } from '@/lib/value/buy-price';
import type { Kind, Year } from '@/lib/value/types';
// Restated fiscal prefixes with filing dates before the snapshot quarter. BAC is
// a common-stock counterfactual; these are model checks, not execution backtests.
it.each(snapshots)('$id $date produces a finite financial return with the same publication hurdle', row => {
 const input=row.financialInputs;
 const v=valueCompany({years:input.years as Year[],kind:input.kind as Kind,currency:'USD',bondYield:input.bondYield,cyclical:false}).valuation!;
 expect(v.method).toBe('book_value');
 const owner=ownerReturn(v,'USD',null,row.price)!;
 expect(Number.isFinite(owner.expected)).toBe(true);
 const payout=Math.min(v.financialReturn!.cashPerShare,4*v.normalized*(v.discountRate-v.growth));
 expect(owner.expected).toBeCloseTo(payout/row.price+v.growth,10);
 // At fair value, the same (possibly capped) payouts earn the required return.
 expect(ownerReturn(v,'USD',null,v.perShare.mid)!.expected).toBeCloseTo(v.discountRate,10);
 const p=publishedBuyPrice({st:'s',t:row.t5,v:[v.perShare.low,v.perShare.mid,v.perShare.high],m:.25,buyReturnInputs:buyReturnInputs(v,'USD')},[row.price,'2026-09-30']);
 expect(p.b).toBe(false); // Existing quality failures remain effective.
});
