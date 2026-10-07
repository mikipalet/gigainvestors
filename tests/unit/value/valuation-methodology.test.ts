import { expect, it } from 'vitest';
import { ownerEarningsBridge } from '@/lib/value/owner-earnings';
import { valueCompany } from '@/lib/value/valuation';
import { roic, roe } from '@/lib/value/metrics';
import { normalizeEodhd } from '@/lib/value/normalize-eodhd';
import { makeYears } from './synthetic';

const value = (years = makeYears(), extra = {}) => valueCompany({ years, kind: 'operating', bondYield: 0.04, cyclical: false, ...extra }).valuation!;

it('V1 keeps Poya maintenance at full capex when growth capex exceeds capex and D&A', () => {
  const years = makeYears({ n: 2, overrides: (_, i) => ({ revenue: i ? 12e9 : 10e9, ppe: 12e9, capex: 1.07e9, da: 2.5e9, netIncome: 2.5e9 }) });
  const row = ownerEarningsBridge(years)[1];
  expect(row.growthCapex).toBeGreaterThan(1.07e9);
  expect(row.maintenanceCapex).toBe(1.07e9);
  expect(row.value).toBe(3.93e9);
});
it('V1 uses depreciation as the floor when capex exceeds D&A', () => {
  const years = makeYears({ n: 2, overrides: (_, i) => ({ revenue: i ? 2000 : 1000, ppe: 1000, da: 20, capex: 50 }) });
  expect(ownerEarningsBridge(years)[1].maintenanceCapex).toBe(20);
});
it.each([false, true])('V2 uses the %s cyclical median margin without a latest-earnings cap', cyclical => {
  const years = makeYears({ overrides: (_, i) => ({ netIncome: i === 10 ? 8.95e9 : 26.5e9, da: 0, capex: 0 }) });
  const v = value(years, { cyclical });
  expect(v.normalized).toBe(26.5e9);
  expect(v.bridge.slice(0, v.bridge.findIndex(r => r.label === '= owner earnings')).reduce((s, r) => s + r.value, 0)).toBe(26.5e9);
  expect(v.assumptions.join(' ')).toContain('five-year median owner-earnings margin');
});
it('V2 stops positive decade growth when revenue has declined over the latest three years', () => {
  const years = makeYears({ overrides: (_, i) => ({ revenue: i === 10 ? 1800 : 1000 + i * 200, netIncome: 100 * 1.1 ** i, ppe: 0, capex: 20, da: 0 }) });
  const v = value(years);
  expect(v.growth).toBe(0);
  expect(v.assumptions.join(' ')).toContain('three-year revenue trend is negative; growth set to zero');
});
it('V3 subtracts JB Hi-Fi estimated lease cash from every applicable year', () => {
  const years = makeYears({ overrides: { netIncome: 489.9e6, da: 273.8e6, capex: 87.5e6, leaseLiabilities: 705e6, leaseDepreciationIncluded: true } });
  const v = value(years);
  expect(v.normalized).toBeCloseTo(535.2e6);
  expect(v.assumptions.join(' ')).toContain('lease payments estimated at 20% of lease liabilities');
  expect(v.bridge.find(r => r.label === '− estimated lease payments')?.value).toBe(-141e6);
});
it('V3 leaves US GAAP lease liabilities out of the IFRS adjustment', () => {
  expect(value(makeYears({ overrides: { leaseLiabilities: 705e6, leaseDepreciationIncluded: false } })).normalized).toBe(100);
});
it.each(['TW', 'CN', 'AU', 'PT'])('V3 preserves raw lease liabilities and infers IFRS-like reporting for %s', country => {
  const raw = { General: { CountryISO: country }, Financials: { Income_Statement: { yearly: { '2025-12-31': {} } }, Balance_Sheet: { yearly: { '2025-12-31': { capitalLeaseObligations: '705000000' } } } } };
  expect(normalizeEodhd(raw, 'TEST.US').fundamentals.years[0]).toMatchObject({ leaseLiabilities: 705e6, leaseDepreciationIncluded: true });
});
it.each([[106444000, 1064438260], [200, 100]])('V4 replaces stale shares %s with current %s in per-share value', (old, current) => {
  const years = makeYears({ overrides: { dilutedShares: old } });
  const v = value(years, { currentShares: current });
  expect(v.shares).toBe(current);
  expect(v.perShare.mid * current).toBeCloseTo(1323.7290, 3);
  expect(v.assumptions).toContain(`share count corrected to current ${current}`);
});
it('V4 keeps counts at the exact 1.5x boundary', () => {
  expect(value(makeYears(), { currentShares: 15 }).shares).toBe(10);
});
it('V5 keeps Eiffage concession assets in invested capital', () => {
  const year = makeYears({ n: 1, overrides: { equity: 7501e6, totalDebt: 15775e6, cash: 5948e6, goodwill: 4799e6, intangibles: 11169e6, operatingIncome: 2570e6, preTaxIncome: 2278e6, taxExpense: 811e6 } })[0];
  expect(roic(year)).toBeCloseTo(1670.5 / 12529);
  expect(roic({ ...year, intangibles: null })).toBeCloseTo(1670.5 / 12529);
});
it('V5 leaves financial returns on tangible equity', () => {
  expect(roe(makeYears({ n: 1, overrides: { equity: 1000, goodwill: 400, intangibles: 100 } })[0])).toBe(0.2);
});

it('V4 checks share stats against market cap/price and supports a missing stats fallback', async () => {
  const { currentShareInputs } = await import('@/lib/value/valuation-inputs');
  const raw = { General: { CurrencyCode: 'TWD' }, SharesStats: { SharesOutstanding: 1064438260 }, Highlights: { MarketCapitalization: 73233352288 } };
  expect(currentShareInputs(raw, 68.8, 'TWD').currentShares).toBe(1064438260);
  expect(currentShareInputs({ ...raw, SharesStats: {} }, 68.8, 'TWD').currentShares).toBeCloseTo(1064438260);
  expect(currentShareInputs(raw, 6.88, 'TWD').currentShares).toBeNull();
  expect(currentShareInputs({ ...raw, SharesStats: {} }, 68.8, 'USD').currentShares).toBeNull();
});
it('V3 honors explicit US GAAP even in an IFRS jurisdiction and sums separate liabilities', async () => {
  const { leaseInputs } = await import('@/lib/value/valuation-inputs');
  const raw = { General: { CountryISO: 'TW', AccountingStandard: 'US GAAP' }, Financials: { Balance_Sheet: { yearly: { '2025-12-31': { currentLeaseLiabilities: '100', nonCurrentLeaseLiabilities: '400' } } } } };
  expect(leaseInputs(raw, '2025-12-31')).toEqual({ leaseLiabilities: 500, leaseDepreciationIncluded: false });
});

it('V3 renders the lease deduction in both the valuation table and reconciled waterfall', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { Bridge } = await import('@/components/value/Bridge');
  const v = value(makeYears({ overrides: { leaseLiabilities: 100, leaseDepreciationIncluded: true } }), { currency: 'USD' });
  const html = renderToStaticMarkup(createElement(Bridge, { valuation: v }));
  expect(html).toContain('Estimated lease payments');
  expect(html).toContain('Owner earnings total $80.00');
});

it.each([[797649000, 1160000000], [68191400, 80510294]])('V4 retains %s when the current %s count is below the stated 1.5x threshold', (old, current) => {
  expect(value(makeYears({ overrides: { dilutedShares: old } }), { currentShares: current }).shares).toBe(old);
});
it('V2 retains a loss year in the positive through-cycle median', () => {
  const years = makeYears();
  years.at(-1)!.netIncome = -1;
  expect(valueCompany({ years, kind: 'operating', bondYield: 0.04, cyclical: false }).valuation?.normalized).toBe(100);
});
it('V4 corrects financial per-share book value without rewriting historical shares', () => {
  const years = makeYears();
  const v = value(years, { kind: 'bank', currentShares: 100 });
  expect(v.shares).toBe(100);
  expect(v.normalized).toBe(5);
  expect(v.perShare.mid).toBeCloseTo(17.5);
  expect(years.at(-1)!.dilutedShares).toBe(10);
});

it('reads EODHD capitalization in major units even when its currency label is pence',async()=>{
 const {currentShareInputs}=await import('@/lib/value/valuation-inputs');
 const raw={General:{CurrencyCode:'GBX'},SharesStats:{SharesOutstanding:76772462},Highlights:{MarketCapitalization:611876544}};
 expect(currentShareInputs(raw,812,'GBX')).toMatchObject({currentShares:76772462,reportedShares:true,shareAssumptions:[]});
});
