import { expect, it } from 'vitest';
import { normalizeEodhd } from '@/lib/value/normalize-eodhd';
import { valueCompany } from '@/lib/value/valuation';
import { kindFor } from '@/lib/value/universe';
import { makeYears } from './synthetic';
const value = (years = makeYears(), extra = {}) => valueCompany({ years, kind: 'operating', bondYield: .04, cyclical: false, currency: 'USD', ...extra }).valuation!;
const quarterly = () => {
  const dates = ['2025-09-30', '2025-12-31', '2026-03-31', '2026-06-30'];
  return { General: { CurrencyCode: 'USD' }, Financials: {
    Income_Statement: { yearly: { '2025-12-31': { currency_symbol: 'USD', totalRevenue: 1000 } }, quarterly: Object.fromEntries(dates.map(end => [end, { currency_symbol: 'USD', totalRevenue: 200, netIncome: 10, depreciationAndAmortization: 5 }])) },
    Cash_Flow: { quarterly: Object.fromEntries(dates.map(end => [end, { currency_symbol: 'USD', totalCashFromOperatingActivities: 15, capitalExpenditures: -6, stockBasedCompensation: 1 }])) },
  } };
};
it('W1 sums four consecutive complete quarters ending after the latest annual', () => {
  expect(normalizeEodhd(quarterly(), 'TEST.US').fundamentals).toHaveProperty('ttm', expect.objectContaining({ end: '2026-06-30', revenue: 800, netIncome: 40, da: 20, capex: 24, sbc: 4, ocf: 60 }));
});
it.each(['missing', 'gap', 'stale', 'currency'])('W1 rejects %s quarterly windows', mode => {
  const raw = quarterly();
  if (mode === 'missing') delete (raw.Financials.Cash_Flow.quarterly as any)['2026-03-31'];
  if (mode === 'gap') { const q = raw.Financials.Income_Statement.quarterly as any; q['2024-06-30'] = q['2025-09-30']; delete q['2025-09-30']; }
  if (mode === 'stale') raw.Financials.Income_Statement.yearly = { '2026-06-30': { currency_symbol: 'USD', totalRevenue: 1000 } } as any;
  if (mode === 'currency') raw.Financials.Cash_Flow.quarterly['2026-03-31'].currency_symbol = 'CAD';
  expect((normalizeEodhd(raw, 'TEST.US').fundamentals as any).ttm ?? null).toBeNull();
});
it('W1 applies median margin to TTM revenue, reconciles the bridge and retains zero growth', () => {
  const years = makeYears({ from: 2015, overrides: (_, i) => ({ revenue: 1000 * 1.1 ** i, netIncome: 100 * 1.1 ** i }) });
  const ttm = { ...years.at(-1)!, end: '2026-06-30', revenue: 900, netIncome: 40, da: 20, capex: 24, sbc: 4, ocf: 60 };
  const v = value(years, { ttm });
  expect(v.normalized).toBe(90); expect(v.growth).toBe(0);
  expect(v.bridge.slice(0, v.bridge.findIndex(r => r.label === '= owner earnings')).reduce((s, r) => s + r.value, 0)).toBe(90);
  expect(v.assumptions.join(' ')).toContain('TTM');
});
it('W2 caps growth at eight percent and discounts acquisition-led revenue growth', () => {
  const ys = makeYears({ overrides: (_, i) => ({ revenue: 1000 * 1.12 ** i, netIncome: 100 * 1.12 ** i, equity: 500 * 1.12 ** i, totalAssets: 1000 * 1.12 ** i }) });
  expect(value(ys).growth).toBe(.08);
  const acquired = ys.map((y, i) => ({ ...y, acquisitions: i ? .75 * (y.totalAssets! - ys[i - 1].totalAssets!) : 0 }));
  expect(value(acquired).growth).toBeCloseTo(.03);
  expect(value(acquired).assumptions.join(' ')).toContain('acquisition');
});
it('W3 retains the latest currency run without relabeling TFI-like older years', () => {
  const raw = { Financials: { Income_Statement: { yearly: Object.fromEntries(makeYears().map((y, i) => [y.end, { currency_symbol: i < 9 ? 'USD' : 'CAD', totalRevenue: 1000 }])) } } };
  const f = normalizeEodhd(raw, 'TFII.TO').fundamentals;
  expect(f.currency).toBe('CAD'); expect(f.years).toHaveLength(2);
  expect(f.years.map(y => y.currency)).toEqual(['CAD', 'CAD']);
  expect(f.integrity.notes?.join(' ')).toContain('reporting currency changed');
});
it('W4 adjusts a Himile-like 1.454x post-year bonus only with a consecutive-month inverse price move', () => {
  const years = makeYears({ from: 2015, overrides: { dilutedShares: 797.6 } });
  const extra = { currentShares: 1160, priceHistory: [['2026-04', 87.45], ['2026-05', 52.31]] };
  expect(value(years, extra).shares).toBe(1160);
  expect(value(years, extra).assumptions).toContain('share count adjusted for post-year split/bonus');
  for (const priceHistory of [[['2025-04', 87.45], ['2025-05', 52.31]], [['2026-03', 87.45], ['2026-05', 52.31]], [['2026-04', 87.45], ['2026-05', 85]]]) expect(value(years, { ...extra, priceHistory }).shares).toBe(797.6);
});
it.each([['AU', 110], ['US', 130]])('W5 maps partial debt, short-term investments and lease treatment for %s', (country, debt) => {
  const raw = { General: { CountryISO: country }, Financials: { Income_Statement: { yearly: { '2025-12-31': {} } }, Balance_Sheet: { yearly: { '2025-12-31': { longTermDebtTotal: 100, shortLongTermDebt: 10, capitalLeaseObligations: 20, cash: 50, shortTermInvestments: 40 } } } } };
  expect(normalizeEodhd(raw, 'TEST.US').fundamentals.years[0]).toMatchObject({ totalDebt: debt, cash: 90 });
});
it('W5 preserves reported totals and works with just one debt component', () => {
  const raw = (balance: object) => ({ Financials: { Income_Statement: { yearly: { '2025-12-31': {} } }, Balance_Sheet: { yearly: { '2025-12-31': balance } } } });
  expect(normalizeEodhd(raw({ longTermDebt: 100 }), 'TEST.US').fundamentals.years[0].totalDebt).toBe(100);
  expect(normalizeEodhd(raw({ shortLongTermDebtTotal: 90, longTermDebt: 100, cashAndShortTermInvestments: 80, cash: 50, shortTermInvestments: 40 }), 'TEST.US').fundamentals.years[0]).toMatchObject({ totalDebt: 90, cash: 80 });
});
it('W6 routes client-asset brokers to bank valuation, while asset-light exchanges remain operating', () => {
  expect(kindFor({ sector: 'Financial Services', industry: 'Capital Markets', lending: { receivables: 41, totalAssets: 100 } })).toBe('bank');
  expect(kindFor({ sector: 'Financial Services', industry: 'Capital Markets', lending: { receivables: 40, totalAssets: 100 } })).toBe('operating');
  const raw = { General: { Industry: 'Capital Markets' }, Financials: { Income_Statement: { yearly: { '2025-12-31': {} } }, Balance_Sheet: { yearly: { '2025-12-31': { netReceivables: 1420900000, cashAndShortTermInvestments: 4707600000, totalStockholderEquity: 893800000, totalAssets: 7438200000 } } } } };
  expect(normalizeEodhd(raw, 'FTK.XETRA').patch.kind).toBe('bank');
});

it('W4 requires reported SharesStats for small price-corroborated share adjustments', () => {
  const years = makeYears({ from: 2015 });
  expect(value(years, { currentShares: 14.5, reportedShares: false, priceHistory: [['2026-04', 100], ['2026-05', 69]] }).shares).toBe(10);
});
it('W1 records unknown trailing SBC without making a trailing loss a normalization cap', () => {
  const years = makeYears();
  const ttm = { ...years.at(-1)!, end: '2024-06-30', sbc: null };
  expect(value(years, { ttm }).assumptions).toContain('TTM stock compensation not reported; assumed zero');
  expect(value(years, { ttm: { ...ttm, netIncome: -1 } }).normalized).toBe(100);
});
it('W1 retains reported SBC when another quarter omits it', () => {
  const raw = quarterly();
  (raw.Financials.Cash_Flow.quarterly['2026-03-31'] as any).stockBasedCompensation = null;
  expect(normalizeEodhd(raw, 'TEST.US').fundamentals.ttm?.sbc).toBe(3);
});
it('W1 uses complete TTM revenue for zero growth even when D&A or OCF is unreported', () => {
  const raw = quarterly();
  (raw.Financials.Income_Statement.quarterly['2026-03-31'] as any).depreciationAndAmortization = null;
  (raw.Financials.Cash_Flow.quarterly['2026-03-31'] as any).totalCashFromOperatingActivities = null;
  const ttm = normalizeEodhd(raw, 'TEST.US').fundamentals.ttm;
  expect(ttm).toMatchObject({ revenue: 800, netIncome: 40, da: null, ocf: null, capex: 24 });
  const years = makeYears({ from: 2015, overrides: (_, i) => ({ revenue: 1000 * 1.1 ** i, netIncome: 100 * 1.1 ** i }) });
  const v = value(years, { ttm });
  expect(v.growth).toBe(0);
  expect(v.normalized).toBeGreaterThan(40);
  expect(v.assumptions).toContain('TTM owner earnings unavailable; complete TTM revenue still supplies current scale when reported');
});
