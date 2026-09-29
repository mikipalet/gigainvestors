import { beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Dossier } from '@/lib/value/types';
import DossierPage from '@/app/value/[id]/page';
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
  vi.mocked(getPrice).mockResolvedValue([6, '2026-09-28']);
});
it('renders reporting value, explicit currency mismatch and an unclear price test', async () => {
  const html = renderToStaticMarkup(await DossierPage({ params: Promise.resolve({ id: 'ko.us' }) }));
  expect(html).toContain('Estimated value JPY 800.00 to JPY 1,200.00');
  expect(html).toContain('Price is in USD, value in JPY, not compared');
  expect(html).toContain('Price: unclear');
  expect(html).not.toContain('margin of safety 99.4%');
  expect(html).not.toContain('aria-label="Price JPY');
});
it('uses converted trading values for both the headline and margin', async () => {
  dossier.valuation!.perShareTrading = { currency: 'USD', fxRate: .01, low: 8, mid: 10, high: 12 };
  const html = renderToStaticMarkup(await DossierPage({ params: Promise.resolve({ id: 'ko.us' }) }));
  expect(html).toContain('Estimated value USD 8.00 to USD 12.00');
  expect(html).toContain('40.0% margin of safety');
  expect(html).toContain('Price: pass');
  expect(html).not.toContain('not compared');
});
it('does not label newer monthly prices as a new fiscal year', async () => {
  dossier.priceHistory!.push(['2026-09', 6]);
  const html = renderToStaticMarkup(await DossierPage({ params: Promise.resolve({ id: 'ko.us' }) }));
  expect(html).toContain('last fiscal year FY2025');
  expect(html).not.toContain('last fiscal year FY2026');
});

it('labels a seeded price with its market-cap derivation and date', async () => {
  vi.mocked(getPrice).mockResolvedValue([6, '2026-09-28', 'seed']);
  const html = renderToStaticMarkup(await DossierPage({ params: Promise.resolve({ id: 'ko.us' }) }));
  expect(html).toContain('price derived from market cap on 2026-09-28');
});
