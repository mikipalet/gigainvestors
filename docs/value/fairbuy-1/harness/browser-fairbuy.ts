/** fairbuy-1 browser gate: the Buy list, the method page and five newly-Buy companies at
 * four viewports, against a production build serving the candidate store.
 * Usage: node --conditions=react-server --import tsx browser-fairbuy.ts <base> <store> <ids> <out> */
import { chromium, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, readdirSync, statfsSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { sharePrice } from '../../../../lib/value/listing-details';
import { shardOf } from '../../../../lib/value/shard';
import { auditPriceSurfaces, type SurfaceSnapshot } from '../../../../lib/value/surface-audit';
import type { Dossier, IndexRow, PriceMap, StoreMeta } from '../../../../lib/value/types';

const [base, store, idArg, out] = process.argv.slice(2);
const ids = idArg.split(',').filter(Boolean);
if (ids.length !== 5) throw Error('Five newly-Buy companies required');
mkdirSync(out, { recursive: true });
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const meta = read(`${store}/meta.json`) as StoreMeta;
const rows: Record<string, IndexRow> = Object.assign({}, ...readdirSync(`${store}/index`).filter(f => /^[A-Z]{2}\.json$/.test(f)).map(f => Object.fromEntries((read(`${store}/index/${f}`) as IndexRow[]).map(r => [r.id, r]))));
const prices: PriceMap = Object.assign({}, ...readdirSync(`${store}/prices`).map(f => read(`${store}/prices/${f}`)));
const dossiers: Record<string, Dossier> = Object.fromEntries(ids.map(id => [id, read(`${store}/dossiers/${shardOf(id)}.json`)[id]]));
for (const id of ids) if (rows[id]?.b !== true) throw Error(`${id} is not a published Buy`);
const VIEWPORTS: Array<[number, number]> = [[1728, 970], [2056, 1180], [390, 844], [820, 1180]];
// Copy that 3.8.0 removed: Wait as a verdict, Buy discounts, the return hurdle and any ranking language.
const FORBIDDEN: Array<[string, RegExp]> = [['Wait', /\bWait\b/], ['safety discount', /safety discount/i], ['margin of safety', /margin of safety/i],
  ['return hurdle', /return hurdle/i], ['top 3', /\btop (?:3|three)\b/i], ['top pick', /top pick(?!\.| or| and)/i], ['old discounts', /15[–-]50%|25%, 35%|35% or 50%|85% of both/], ['buy below', /\bBuy below\b/]];
// Statements that a rule no longer applies are allowed.
const forbidden = (text: string) => FORBIDDEN.filter(([, re]) => re.test(text.replace(/there is no top pick|no ranking and no top pick|not ranked|no separate (?:expected-)?return hurdle|no extra discount and no separate return hurdle|no extra safety discount|no margin-of-safety discount/gi, ''))).map(([name]) => name);

async function capture(page: Page, selector: string): Promise<SurfaceSnapshot> {
  return page.locator(selector).first().evaluate(el => ({
    accountingContext: el.querySelector('.accounting-basis')?.textContent ?? '', signals: [],
    // textContent: the price math table is in the DOM but hidden on company pages at some widths.
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
      // The list: every Buy, no ranking language, Next closest by distance to central value.
      try {
        const response = await page.goto(`${base}/value`, { waitUntil: 'networkidle', timeout: 120000 });
        expect(response?.ok()).toBe(true);
        await page.locator('.main-view').waitFor();
        const count = Number(await page.locator('.main-view').getAttribute('data-buy-count'));
        expect(count).toBe(westernBuys);
        expect(meta.western?.story.atBuy).toBe(westernBuys);
        await expect(page.locator('.index-story h1')).toContainText(`${westernBuys} great`);
        await page.screenshot({ path: `${out}/list-${width}.png` });
        const text = await page.locator('body').innerText();
        const bad = forbidden(text);
        let panel = 0, panelBad: string[] = [];
        const more = page.locator('.main-buys .main-more');
        if (await more.count()) {
          await more.click(); await page.locator('dialog').waitFor();
          await expect(page.locator('dialog')).toContainText(`Buy now · ${count}`);
          panel = Number(await page.locator('dialog [data-testid=results-table]').getAttribute('aria-rowcount')) - 1;
          panelBad = forbidden(await page.locator('dialog').innerText());
          await page.screenshot({ path: `${out}/list-${width}-all-buys.png` });
          await page.keyboard.press('Escape'); await page.locator('dialog').waitFor({ state: 'detached' });
        } else panel = await page.locator('.main-buys [data-company]').count();
        expect(panel).toBe(count);
        const ratios = await page.locator('.main-next [data-ratio]').evaluateAll(els => els.map(e => Number((e as HTMLElement).dataset.ratio)));
        expect(ratios).toEqual([...ratios].sort((a, b) => a - b));
        expect(ratios.every(r => r > 1)).toBe(true);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        record('list', { pass: !bad.length && !panelBad.length && !overflow, buyCount: count, listed: panel, forbidden: [...bad, ...panelBad], nextRatios: ratios.slice(0, 6), overflow });
      } catch (e) { record('list', { pass: false, error: String(e) }); }
      // The method page.
      try {
        const response = await page.goto(`${base}/value/method`, { waitUntil: 'networkidle', timeout: 120000 });
        expect(response?.ok()).toBe(true);
        // Earlier changelog entries are history and keep their original wording.
        const text = await page.evaluate(() => { const b = document.body.cloneNode(true) as HTMLElement; b.querySelectorAll('li').forEach(li => { if (/^3\.[0-7]\.\d/.test(li.querySelector('b')?.textContent ?? '')) li.remove(); }); document.body.append(b); b.style.position = 'absolute'; const t = b.innerText; b.remove(); return t; });
        expect(text).toContain('passes the quality tests and trades at or below our central estimate of value');
        expect(text).toContain('3.8.0');
        await page.screenshot({ path: `${out}/method-${width}.png`, fullPage: false });
        const bad = forbidden(text);
        record('method', { pass: !bad.length, forbidden: bad });
      } catch (e) { record('method', { pass: false, error: String(e) }); }
      // Five newly-Buy companies: verdict, price card, drawers.
      for (const id of ids) {
        const d = dossiers[id], row = rows[id], quote = prices[id];
        try {
          const response = await page.goto(`${base}/s/${id.toLowerCase()}`, { waitUntil: 'networkidle', timeout: 120000 });
          expect(response?.ok()).toBe(true);
          await expect(page.locator('[data-testid=verdict] .plain-verdict')).toHaveText('A wonderful business at a fair price');
          await expect(page.locator('[data-testid=tile-price]')).toContainText('At or below value');
          await expect(page.locator('[data-testid=profit-record]')).toContainText('Profit record · pass');
          const texts: string[] = [await page.locator('body').innerText()];
          await page.screenshot({ path: `${out}/${id}-${width}.png` });
          for (const key of ['understandable', 'moat']) {
            await page.locator(`[data-testid=tile-${key}] .tile-open`).click(); await page.locator('dialog .evidence-layout').waitFor();
            texts.push(await page.locator('dialog').innerText());
            const g = await page.locator('dialog').evaluate(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right }; });
            expect(g.left).toBeGreaterThanOrEqual(-1); expect(g.right).toBeLessThanOrEqual(width + 1);
            await page.screenshot({ path: `${out}/${id}-${width}-${key}.png` });
            await page.keyboard.press('Escape'); await page.locator('dialog').waitFor({ state: 'detached' });
          }
          // On phones the page behind a closing drawer is hidden for a moment; read it once visible again.
          await expect(page.locator('.reference-metrics').first()).toBeVisible();
          await expect(page.locator('.reference-metrics').first()).toContainText(sharePrice(quote[0], row.cur));
          const top = await capture(page, '.reference-metrics'), tile = await capture(page, '[data-testid=tile-price]');
          await page.locator('[data-testid=tile-price] .tile-open').click(); await page.locator('dialog .evidence-layout').waitFor();
          const drawer = await capture(page, 'dialog');
          texts.push(drawer.text as unknown as string);
          expect(drawer.stats.map(s => s[0])).toEqual(['Share price', 'Estimated value', 'Buy at or below', 'Expected / yr', 'Required', 'Price / value']);
          expect(drawer.stats[2][1]).toContain(sharePrice(row.v![1], row.cur));
          expect(drawer.stats[0][1]).toContain(sharePrice(quote[0], row.cur));
          await expect(page.locator('dialog .panel-answer')).toHaveText('Passes the quality tests and trades at or below our central estimate of value.');
          let surfaceError: string | undefined;
          try { auditPriceSurfaces(d, row, quote, top, tile, drawer); } catch (e) { surfaceError = String(e); }
          if (surfaceError) {
            // Record which surface lacked the value, then re-read all three once (phone layouts settle late).
            const where = { top: top.text.slice(0, 300), drawerHead: (drawer.text as unknown as string).slice(0, 300) };
            await page.waitForTimeout(1500);
            const top2 = await capture(page, '.reference-metrics'), tile2 = await capture(page, '[data-testid=tile-price]'), drawer2 = await capture(page, 'dialog');
            try { auditPriceSurfaces(d, row, quote, top2, tile2, drawer2); surfaceError = undefined; record(`${id}-price-reread`, { pass: true, firstRead: where }); } catch (e) { surfaceError = `${String(e)} | first read ${JSON.stringify(where)}`; }
          }
          await page.screenshot({ path: `${out}/${id}-${width}-price.png` });
          await page.keyboard.press('Escape'); await page.locator('dialog').waitFor({ state: 'detached' });
          const bad = [...new Set(texts.flatMap(forbidden))];
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
          record(id, { pass: !bad.length && !surfaceError && !overflow, forbidden: bad, surfaceError, overflow, drawerStats: drawer.stats });
        } catch (e) { record(id, { pass: false, error: String(e) }); }
      }
      if (errors.length) results.push({ name: 'page-errors', width, height, pass: false, errors });
      await page.close();
    }
  } finally { await browser.close(); writeFileSync(`${out}/browser-fairbuy.json`, JSON.stringify(results, null, 1) + '\n'); }
  const failed = results.filter(r => !r.pass);
  console.log(`browser-fairbuy: ${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exitCode = 1;
}
main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
