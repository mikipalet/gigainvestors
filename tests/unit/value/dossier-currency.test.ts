import { beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Dossier } from '@/lib/value/types';
import DossierPage from '@/app/s/[ticker]/page';
import { getDossier, getPrice } from '@/lib/value/store';
vi.mock('@/lib/value/store', () => ({ getDossier: vi.fn(), getPrice: vi.fn(), getTopIds: vi.fn(),getSearchCompany:vi.fn(),readStore:vi.fn(async()=>null) }));
vi.mock('@/lib/data',()=>({getStock:vi.fn(async()=>null),getIndex:vi.fn(async()=>null)}));
const fixture: Dossier = JSON.parse(readFileSync('tests/fixtures/value/store/dossiers/027.json', 'utf8'))['KO.US'];
let dossier: Dossier;
beforeEach(() => {
  dossier = structuredClone(fixture);
  dossier.holders = [];
  dossier.company.currency = 'USD';
  dossier.b = false; // Published mismatch verdict.
  dossier.valuation!.currency = 'JPY';
  dossier.valuation!.perShare = { low: 800, mid: 1000, high: 1200 };
  vi.mocked(getDossier).mockResolvedValue(dossier);
  vi.mocked(getPrice).mockResolvedValue([6, '2026-09-28']);
});
it('omits the price check when reporting and trading currencies cannot be compared', async () => {
  const html = renderToStaticMarkup(await DossierPage({ params: Promise.resolve({ ticker: 'KO' }) }));
  expect(html).not.toContain('Estimated value unavailable');
  expect(html).not.toContain('data-testid="tile-price"');
  expect(html).not.toContain('Price: unclear');
  expect(html).not.toContain('margin of safety 99.4%');
  expect(html).not.toContain('aria-label="Price JPY');
});
it('uses converted trading values for both the headline and margin', async () => {
  dossier.b = true; // Published converted-currency verdict.
  dossier.valuation!.perShareTrading = { currency: 'USD', fxRate: .01, low: 8, mid: 10, high: 12 };
  const html = renderToStaticMarkup(await DossierPage({ params: Promise.resolve({ ticker: 'KO' }) }));
  expect(html).toContain('40% below its estimated value');
  expect(html).not.toContain('99% below');
  expect(html).toContain('Price: pass');
  expect(html).not.toContain('not compared');
});
it('does not label newer monthly prices as a new fiscal year', async () => {
  dossier.priceHistory!.push(['2026-09', 6]);
  const html = renderToStaticMarkup(await DossierPage({ params: Promise.resolve({ ticker: 'KO' }) }));
  expect(html).toMatch(/class="source-date"[^>]*>Prices [^<]+ · FY2025<\/span>/);
  expect(html).not.toMatch(/class="source-date">[^<]+FY2026/);
});

it('labels a seeded price with its market-cap derivation and date', async () => {
  vi.mocked(getPrice).mockResolvedValue([6, '2026-09-28', 'seed']);
  const html = renderToStaticMarkup(await DossierPage({ params: Promise.resolve({ ticker: 'KO' }) }));
  expect(html).toContain('Price estimated from market value on 28 Sep 2026');
});

it.each(['javascript:alert(1)', 'http://example.com/report', '//example.com/report', 'https://example.com/report'])('only renders https report links: %s', async url => {
  dossier.report.url = url;
  const html = renderToStaticMarkup(await DossierPage({ params: Promise.resolve({ ticker: 'KO' }) }));
  expect(html.includes(`href="${url}"`)).toBe(url.startsWith('https://'));
});
it('embeds the changing quote in the ISR server render', async () => {
  vi.mocked(getPrice).mockClear();
  await DossierPage({ params: Promise.resolve({ ticker: 'KO' }) });
  expect(getPrice).toHaveBeenCalledWith('KO.US','US');
});
