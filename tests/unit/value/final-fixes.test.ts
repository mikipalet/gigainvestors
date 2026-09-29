import { afterEach, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { seedPrice, mergeSeed } from '@/lib/value/price-seed';
import { valueCompany } from '@/lib/value/valuation';
import { createUsdRate } from '@/lib/value/fx';
import { comparableValuation } from '@/lib/value/site-valuation';
import { getDossier } from '@/lib/value/store';
import { FootballField } from '@/components/value/viz/FootballField';
import { makeYears } from './synthetic';
import type { Valuation } from '@/lib/value/types';
const raw = { Highlights: { MarketCapitalization: 124920 }, SharesStats: { SharesOutstanding: 1000 } };
const fetchedAt = '2026-09-29';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('prefers the screener trading-unit close over cap/shares', () => {
  expect(seedPrice({ raw, fetchedAt, screener: { adjusted_close: 12492, last_day_data_date: '2026-09-28' } })).toEqual([12492, '2026-09-28', 'seed']);
});
it('requires a corroborating reference for derived seeds', () => {
  expect(seedPrice({ raw, fetchedAt })).toBeNull();
  expect(seedPrice({ raw, fetchedAt, reference: 12492 })).toBeNull();
  expect(seedPrice({ raw, fetchedAt, reference: 125 })).toEqual([124.92, fetchedAt, 'seed']);
});
it('corrects seeds even when the previous seed date equals the new date', () => {
  expect(mergeSeed([124.92, fetchedAt, 'seed'], [12492, fetchedAt, 'seed'])).toEqual([12492, fetchedAt, 'seed']);
});
it('does not value a bank at a zero justified book multiple', () => {
  expect(valueCompany({ years: makeYears({ overrides: { netIncome: 0 } }), kind: 'bank', bondYield: .04, cyclical: false })).toEqual({ valuation: null, reason: 'justified price to book is zero' });
});
it.each(['ZAC', 'ZAc', 'zac', 'zaC'])('converts %s as cents', currency => {
  expect(createUsdRate({ rates: { ZAR: .06 } })(currency)).toBeCloseTo(.0006);
});
it.each(['GBX', 'gbx', 'GBp', 'gbp'])('converts %s as pence, preserving uppercase GBP as pounds', currency => {
  const rate = createUsdRate({ rates: { GBP: 1.3 } });
  expect(rate(currency)).toBeCloseTo(.013);
  expect(rate('GBP')).toBe(1.3);
});
it('compares denomination aliases but never pounds against pence', () => {
  const valuation = { currency: 'ZAc', perShare: { low: 1, mid: 2, high: 3 } } as Valuation;
  expect(comparableValuation(valuation, 'ZAC')).not.toBeNull();
  expect(comparableValuation({ ...valuation, currency: 'GBX' }, 'GBp')).not.toBeNull();
  expect(comparableValuation({ ...valuation, currency: 'GBP' }, 'GBp')).toBeNull();
});
it('omits infinite or fabricated zero margins for a legacy zero valuation', () => {
  const valuation = { currency: 'EUR', perShare: { low: 0, mid: 0, high: 0 } } as Valuation;
  const html = renderToStaticMarkup(createElement(FootballField, { valuation, price: 12 }));
  expect(html).not.toMatch(/Infinity|NaN|margin of safety 0.0%/);
});
it.each([502, 503, 504])('returns no dossier on upstream %s at build time', async status => {
  vi.stubEnv('VALUE_STORE_DIR', '');
  vi.stubGlobal('fetch', async () => new Response(null, { status }));
  expect(await getDossier('KO.US')).toBeNull();
});
