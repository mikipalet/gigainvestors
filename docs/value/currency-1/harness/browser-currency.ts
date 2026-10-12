/** currency-1 browser gate: the Buy list, the method page and the companies whose
 * statement currency 3.8.2 corrected, at 1728×970 and 390×844, against a
 * production build serving the candidate store. Every page must show the
 * corrected currency strings and none of the mislabelled ones.
 * Usage: node --conditions=react-server --import tsx browser-currency.ts <base> <store> <ids> <out> <forbidden.json> [required.json] */
import { chromium, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, readdirSync, statfsSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { sharePrice } from '../../../../lib/value/listing-details';
import { priceState } from '../../../../lib/value/presentation';
import { shardOf } from '../../../../lib/value/shard';
import { auditPriceSurfaces, type SurfaceSnapshot } from '../../../../lib/value/surface-audit';
import type { Dossier, IndexRow, PriceMap, StoreMeta } from '../../../../lib/value/types';

const [base, store, idArg, out, forbiddenFile, requiredFile] = process.argv.slice(2);
const ids = idArg.split(',').filter(Boolean);
mkdirSync(out, { recursive: true });
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const meta = read(`${store}/meta.json`) as StoreMeta;
const rows: Record<string, IndexRow> = Object.assign({}, ...readdirSync(`${store}/index`).filter(f => /^[A-Z]{2}\.json$/.test(f)).map(f => Object.fromEntries((read(`${store}/index/${f}`) as IndexRow[]).map(r => [r.id, r]))));
const prices: PriceMap = Object.assign({}, ...readdirSync(`${store}/prices`).map(f => read(`${store}/prices/${f}`)));
const dossiers: Record<string, Dossier> = Object.fromEntries(ids.map(id => [id, read(`${store}/dossiers/${shardOf(id)}.json`)[id]]));
// Figures the bad inputs produced (for example PRG.US $569.42 and 154.4%): none may remain on the page.
const stale: Record<string, string[]> = forbiddenFile ? read(forbiddenFile) : {};
// Figures in the currency the statements were reported in (for example PETR3 "BRL 497.5 billion").
const required: Record<string, string[]> = requiredFile ? read(requiredFile) : {};
const VIEWPORTS: Array<[number, number]> = [[1728, 970], [390, 844]];

async function capture(page: Page, selector: string): Promise<SurfaceSnapshot> {
  return page.locator(selector).first().evaluate(el => ({
    accountingContext: el.querySelector('.accounting-basis')?.textContent ?? '', signals: [],
    text: (el as HTMLElement).innerText + ' ' + [...el.querySelectorAll('.valuation-math')].map(t => [...t.querySelectorAll('tr')].map(r => [...r.children].map(c => c.textContent).join(' ')).join(' ')).join(' '), numbers: ((el as HTMLElement).innerText.match(/[-−+]?\d[\d,.]*(?:%|×|bn|[KMBT])?/g) ?? []),
    charts: [], windows: [],
    stats: [...el.querySelectorAll('.tile-support>div,.drawer-numbers>div')].map(e => [e.querySelector('dt')!.textContent!, e.querySelector('dd')!.textContent!] as [string, string]),
    table: [...el.querySelectorAll('.drawer-years tbody tr')].map(e => [...e.children].map(c => c.querySelector('.quality-ltm-label')?.textContent ?? [...c.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim())),
    tableHeaders: [...el.querySelectorAll('.drawer-years thead th')].map(c => c.textContent ?? ''),
    priceCharts: [...el.querySelectorAll<HTMLElement>('[data-prices]')].map(e => ({ prices: JSON.parse(e.dataset.prices!), values: JSON.parse(e.dataset.values!), mos: Number(e.dataset.mos), currency: e.dataset.currency })),
  }) as unknown as SurfaceSnapshot);
}

async function main() {
  const browser = await chromium.launch(); const results: Array<Record<string, unknown>> = [];
  const westernBuys = Object.values(rows).filter(r => r.b === true && r.w != null).length;
  try {
    for (const [width, height] of VIEWPORTS) {
      for (const p of ['/', homedir() + '/data']) { const s = statfsSync(p); if (s.bavail * s.bsize < 4 * 1024 ** 3) throw Error('DISK STOP'); }
      const page = await browser.newPage({ viewport: { width, height } }), errors: string[] = [];
      await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
      page.on('pageerror', e => errors.push(e.message));
      const record = (name: string, extra: Record<string, unknown>) => { results.push({ name, width, height, ...extra }); console.log(name, width, extra.pass ? 'PASS' : 'FAIL', extra.error ?? ''); };
      // The list: the Buy count is the published Western count; no withheld or corrected-away company is a Buy.
      try {
        const response = await page.goto(`${base}/value`, { waitUntil: 'networkidle', timeout: 120000 });
        expect(response?.ok()).toBe(true);
        await page.locator('.main-view').waitFor();
        const count = Number(await page.locator('.main-view').getAttribute('data-buy-count'));
        expect(count).toBe(westernBuys);
        expect(meta.western?.story.atBuy).toBe(westernBuys);
        await page.screenshot({ path: `${out}/list-${width}.png` });
        let listed: string[] = [];
        const more = page.locator('.main-buys .main-more');
        if (await more.count()) {
          await more.click(); await page.locator('dialog').waitFor();
          await expect(page.locator('dialog')).toContainText(`Buy now · ${count}`);
          listed = await page.locator('dialog [data-company]').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.company!));
          const rowCount = Number(await page.locator('dialog [data-testid=results-table]').getAttribute('aria-rowcount')) - 1;
          expect(rowCount).toBe(count);
          await page.screenshot({ path: `${out}/list-${width}-all-buys.png` });
          await page.keyboard.press('Escape'); await page.locator('dialog').waitFor({ state: 'detached' });
        } else listed = await page.locator('.main-buys [data-company]').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.company!));
        const wrongBuys = ids.filter(id => rows[id]?.b !== true && listed.some(l => l.toUpperCase() === id.toUpperCase()));
        const text = await page.locator('body').innerText();
        const staleOnList = Object.values(stale).flat().filter(s => text.includes(s));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        record('list', { pass: !wrongBuys.length && !staleOnList.length && !overflow, buyCount: count, listedSample: listed.slice(0, 8), wrongBuys, staleOnList, overflow });
      } catch (e) { record('list', { pass: false, error: String(e) }); }
      // The method page states the 3.8.2 currency rule.
      try {
        const response = await page.goto(`${base}/value/method`, { waitUntil: 'networkidle', timeout: 120000 });
        expect(response?.ok()).toBe(true);
        const text = await page.locator('body').innerText();
        for (const s of ['3.8.2', 'shown in the currency it was reported in', 'checked against the annual filing'])
          expect(text).toContain(s);
        await page.screenshot({ path: `${out}/method-${width}.png`, fullPage: false });
        record('method', { pass: true });
      } catch (e) { record('method', { pass: false, error: String(e) }); }
      // Each corrected company: price tile state, the price drawer numbers and no stale outlier figure.
      for (const id of ids) {
        const d = dossiers[id], row = rows[id], quote = prices[id];
        try {
          const response = await page.goto(`${base}/s/${id.toLowerCase()}`, { waitUntil: 'networkidle', timeout: 120000 });
          expect(response?.ok()).toBe(true);
          const mid = row.v?.[1] ?? null, state = priceState({ price: quote?.[0] ?? null, mid, b: row.b });
          // A withheld value (reviewed input error) has no price tile, or an unavailable one.
          if (mid !== null || await page.locator('[data-testid=tile-price]').count()) await expect(page.locator('[data-testid=tile-price]')).toContainText(state.label);
          if (row.b === true) await expect(page.locator('[data-testid=verdict] .plain-verdict')).toHaveText('A wonderful business at a fair price');
          else await expect(page.locator('[data-testid=verdict] .plain-verdict')).not.toHaveText('A wonderful business at a fair price');
          const texts: string[] = [await page.locator('body').innerText()];
          await page.screenshot({ path: `${out}/${id}-${width}.png` });
          let surfaceError: string | undefined, stats: Array<[string, string]> = [];
          if (mid !== null) {
            await expect(page.locator('.reference-metrics').first()).toBeVisible();
            const top = await capture(page, '.reference-metrics'), tile = await capture(page, '[data-testid=tile-price]');
            await page.locator('[data-testid=tile-price] .tile-open').click(); await page.locator('dialog .evidence-layout').waitFor();
            const drawer = await capture(page, 'dialog');
            texts.push(drawer.text as unknown as string); stats = drawer.stats;
            const value = drawer.stats.find(s => s[0] === 'Estimated value'), share = drawer.stats.find(s => s[0] === 'Share price');
            expect(value?.[1]).toContain(sharePrice(mid, row.cur));
            expect(share?.[1]).toContain(sharePrice(quote[0], row.cur));
            try { auditPriceSurfaces(d, row, quote, top, tile, drawer); } catch (e) {
              await page.waitForTimeout(1500);
              const top2 = await capture(page, '.reference-metrics'), tile2 = await capture(page, '[data-testid=tile-price]'), drawer2 = await capture(page, 'dialog');
              try { auditPriceSurfaces(d, row, quote, top2, tile2, drawer2); record(`${id}-price-reread`, { pass: true, firstError: String(e) }); } catch (e2) { surfaceError = String(e2); }
            }
            await page.screenshot({ path: `${out}/${id}-${width}-price.png` });
            await page.keyboard.press('Escape'); await page.locator('dialog').waitFor({ state: 'detached' });
          }
          // The business section and agent copy are part of the page text; open every drawer the page has.
          const staleSeen = (stale[id] ?? []).filter(s => texts.some(t => t.includes(s)));
          const missing = (required[id] ?? []).filter(s => !texts.some(t => t.includes(s)));
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
          record(id, { pass: !surfaceError && !staleSeen.length && !missing.length && !overflow, buy: row.b === true, state: state.label, mid, price: quote?.[0], withheld: mid === null, staleSeen, missing, surfaceError, overflow, drawerStats: stats });
        } catch (e) { record(id, { pass: false, error: String(e) }); }
      }
      if (errors.length) results.push({ name: 'page-errors', width, height, pass: false, errors });
      await page.close();
    }
  } finally { await browser.close(); writeFileSync(`${out}/browser-currency.json`, JSON.stringify(results, null, 1) + '\n'); }
  const failed = results.filter(r => !r.pass);
  console.log(`browser-currency: ${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exitCode = 1;
}
main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
