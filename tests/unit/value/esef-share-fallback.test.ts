import { expect, it } from 'vitest';
import { valueCompany } from '@/lib/value/valuation';
import { makeYears } from './synthetic';

it('values a missing tagged share count using verified current shares without inventing annual shares', () => {
  const years = makeYears({overrides:{dilutedShares:null,basicEps:1.23}});
  const result = valueCompany({years,kind:'operating',currency:'EUR',bondYield:.03,cyclical:false,
    currentShares:10,reportedShares:true,shareSource:'yahoo-shares'});
  expect(result.valuation?.shares).toBe(10);
  expect(result.valuation?.sharesSource).toBe('yahoo-shares');
  expect(years.every(y=>y.dilutedShares===null)).toBe(true);
  expect(valueCompany({years,kind:'operating',currency:'EUR',bondYield:.03,cyclical:false}).reason).toBe('no share count');
});

it('accepts verified Yahoo shares only when the existing cap/price share-basis sanity check passes', async () => {
  const { verifiedEsefShares } = await import('@/lib/value/italy/shares');
  const good = {price:20,shares:100,currency:'EUR',source:'Yahoo chart × verified shares'};
  expect(verifiedEsefShares(good,2340,1.17)).toMatchObject({currentShares:100,shareSource:'yahoo-shares'});
  expect(verifiedEsefShares({...good,shares:10},2340,1.17).currentShares).toBeNull();
  expect(verifiedEsefShares({...good,shares:null},2340,1.17).currentShares).toBeNull();
  expect(verifiedEsefShares(good,null,1.17).currentShares).toBeNull();
});
