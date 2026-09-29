import { beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Dossier } from '@/lib/value/types';
import DossierPage from '@/app/value/[id]/page';
import { useQuote } from '@/components/value/use-quote';
vi.mock('@/components/value/use-quote', () => ({ useQuote: vi.fn() }));
import { getDossier, getPrice } from '@/lib/value/store';
vi.mock('@/lib/value/store', () => ({ getDossier: vi.fn(), getPrice: vi.fn(), getTopIds: vi.fn() }));
const fixture: Dossier = JSON.parse(readFileSync('tests/fixtures/value/store/dossiers/027.json', 'utf8'))['KO.US'];
let dossier: Dossier;
beforeEach(() => {
  dossier = structuredClone(fixture);
  dossier.holders = [];
  dossier.company.currency = 'USD';
  dossier.valuation!.currency = 'JPY';
  dossier.valuation!.perShare = { low: 800, mid: 1000, high: 1200 };
  vi.mocked(getDossier).mockResolvedValue(dossier);
  vi.mocked(useQuote).mockReturnValue([6, '2026-09-28']);
});
it('renders reporting value, explicit currency mismatch and an unclear price test', async () => {
  const html = renderToStaticMarkup(await DossierPage({ params: Promise.resolve({ id: 'ko.us' }) }));
  expect(html).toContain('Comparable valuation unavailable');
  expect(html).toContain('Price is in USD, value in JPY, not compared');
  expect(html).toContain('Price: unclear');
  expect(html).not.toContain('margin of safety 99.4%');
  expect(html).not.toContain('aria-label="Price JPY');
});
it('uses converted trading values for both the headline and margin', async () => {
  dossier.valuation!.perShareTrading = { currency: 'USD', fxRate: .01, low: 8, mid: 10, high: 12 };
  const html = renderToStaticMarkup(await DossierPage({ params: Promise.resolve({ id: 'ko.us' }) }));
  expect(html).toContain('USD 10.00');
  expect(html).toContain('0.60×');
  expect(html).toContain('Price: pass');
  expect(html).not.toContain('not compared');
});
it('does not label newer monthly prices as a new fiscal year', async () => {
  dossier.priceHistory!.push(['2026-09', 6]);
  const html = renderToStaticMarkup(await DossierPage({ params: Promise.resolve({ id: 'ko.us' }) }));
  expect(html).toContain('Financials FY2025');
  expect(html).not.toContain('Financials FY2026');
});

it('labels a seeded price with its market-cap derivation and date', async () => {
  vi.mocked(useQuote).mockReturnValue([6, '2026-09-28', 'seed']);
  const html = renderToStaticMarkup(await DossierPage({ params: Promise.resolve({ id: 'ko.us' }) }));
  expect(html).toContain('Price 28 Sep 2026 · derived from market cap / shares');
});

it.each(['javascript:alert(1)', 'http://example.com/report', '//example.com/report', 'https://example.com/report'])('only renders https report links: %s', async url => {
  dossier.report.url = url;
  const html = renderToStaticMarkup(await DossierPage({ params: Promise.resolve({ id: 'ko.us' }) }));
  expect(html.includes(`href="${url}"`)).toBe(url.startsWith('https://'));
});
it('does not fetch the changing quote during server rendering', async () => {
  vi.mocked(getPrice).mockClear();
  await DossierPage({ params: Promise.resolve({ id: 'ko.us' }) });
  expect(getPrice).not.toHaveBeenCalled();
});
