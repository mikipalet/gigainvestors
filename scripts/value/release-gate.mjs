// node scripts/value/release-gate.mjs <base> <output> [comma-separated paths]
// Reuses design-qa's DOM audit and drawers' viewport/leaf geometry checks.
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync, writeFileSync, statfsSync } from 'node:fs';
import { audit } from './design-audit.mjs';
import { gapPhrases } from './design-cases.mjs';

const [base = 'http://localhost:3017', out = '/tmp/claude-1000/value-shots/business-3', pathArg] = process.argv.slice(2);
const paths = pathArg?.split(',') ?? ['/', '/?q=2018Q3', '/?year=2011', '/lulu.us', '/wkl.as', '/adbe.us', '/googl.us', '/ko.us', '/jpm.us', '/7203.jp', '/reliance.nse', '/cbg.lse'];
const sizes = (process.env.QA_VIEWPORTS ?? '1728x970,2056x1180,1440x800,390x844').split(',').map(s => s.split('x').map(Number));
const report = [];
function disk() {
  const s = statfsSync('/');
  if (s.bavail * s.bsize < 6 * 1024 ** 3) throw Error('DISK STOP: below 6 GiB');
}

// Background colours are sampled from the raster itself. A cell is empty only
// when >99.5% of its pixels match a dominant flat colour within RGB tolerance 6.
// Text, chart marks and images count as ink; a coloured card is still background.
async function whitespace(png) {
  const { data, info: { width, height, channels } } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const histogram = new Map();
  for (let i = 0; i < data.length; i += channels) {
    const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
    histogram.set(key, (histogram.get(key) ?? 0) + 1);
  }
  const backgrounds = [...histogram].filter(([, n]) => n > width * height * .025).map(([k]) => k.split(',').map(Number));
  const cols = Math.ceil(width / 24), rows = Math.ceil(height / 24), empty = [];
  let emptyArea = 0;
  for (let y = 0; y < rows; y++) {
    empty[y] = [];
    for (let x = 0; x < cols; x++) {
      let ink = 0, area = 0;
      for (let py = y * 24; py < Math.min(height, (y + 1) * 24); py++) for (let px = x * 24; px < Math.min(width, (x + 1) * 24); px++) {
        const i = (py * width + px) * channels;
        area++;
        if (!backgrounds.some(rgb => rgb.every((v, c) => Math.abs(data[i + c] - v) <= 6))) ink++;
      }
      empty[y][x] = ink / area < .005;
      if (empty[y][x]) emptyArea += area;
    }
  }
  let largestBlockHeight = 0;
  for (let start = 0; start < rows; start++) {
    const clear = Array(cols).fill(true);
    for (let end = start; end < rows; end++) {
      let run = 0, maxRun = 0;
      for (let x = 0; x < cols; x++) { clear[x] &&= empty[end][x]; run = clear[x] ? run + 1 : 0; maxRun = Math.max(maxRun, run); }
      if (maxRun * 24 > width / 2) largestBlockHeight = Math.max(largestBlockHeight, Math.min(height, (end + 1) * 24) - start * 24);
    }
  }
  return { emptyAreaPct: 100 * emptyArea / (width * height), largestBlockHeight };
}

disk();
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const [width, height] of sizes) for (const path of paths) {
    disk();
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    let seq = 0;
    const record = async (state, panelSelector) => {
      disk();
      await page.waitForLoadState('networkidle');
      await page.mouse.move(0, 0);
      await page.waitForTimeout(250);
      const result = await page.evaluate(audit);
      result.issues.push(...errors);
      const brokenNames=await page.locator('.main-name,.compact-company-list tbody th a>span').evaluateAll(els=>els.flatMap(el=>{
        if(!el.checkVisibility())return [];
        const broken=[];
        for(const node of el.childNodes){
          if(node.nodeType!==Node.TEXT_NODE)continue;
          for(const match of (node.textContent??'').matchAll(/[^\s-]+/g)){
            const tops=new Set();
            for(let i=0;i<match[0].length;i++){const r=document.createRange();r.setStart(node,match.index+i);r.setEnd(node,match.index+i+1);tops.add(Math.round(r.getBoundingClientRect().top));}
            if(tops.size>1)broken.push(`name breaks inside word: ${match[0]}`);
          }
        }
        return broken;
      }));
      result.issues.push(...brokenNames);
      const panel = panelSelector ? (await page.locator('dialog[open]').count() ? page.locator('dialog[open]').last() : page.locator(panelSelector).last()) : null;
      const root = panel ?? page.locator('body');
      const text = await root.innerText();
      const phrase = text.match(gapPhrases) ?? text.match(/\bverify\b|being checked/i);
      if (phrase) result.issues.push(`forbidden wording: ${phrase[0]}`);
      if (width >= 768 && await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1)) result.issues.push('desktop page scroll');
      if (panel) {
        const geometry = await panel.evaluate(el => {
          const r = el.getBoundingClientRect();
          let used = r.top;
          const scrolling = [];
          for (const c of [el, ...el.querySelectorAll('*')]) {
            if (!c.checkVisibility()) continue;
            const b = c.getBoundingClientRect(), cs = getComputedStyle(c);
            if (!c.children.length && b.width > 2 && b.height > 2) used = Math.max(used, Math.min(b.bottom, r.bottom));
            if (c.clientHeight && c.scrollHeight > c.clientHeight + 2 && /auto|scroll/.test(cs.overflowY)) scrolling.push(c.className);
          }
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, emptyBottomPct: 100 * (r.bottom - used) / r.height, scrolling, tabs: el.querySelectorAll('[role=tab]').length };
        });
        Object.assign(result, geometry, await whitespace(await panel.screenshot()));
        if (Math.abs(geometry.top) > 1 || Math.abs(geometry.bottom - height) > 1) result.issues.push(`panel not full height: ${geometry.top}..${geometry.bottom}, expected 0..${height}`);
        if (width < 768 && (Math.abs(geometry.left) > 1 || Math.abs(geometry.right - width) > 1)) result.issues.push('phone panel not full width');
        if (width >= 768 && geometry.scrolling.length) result.issues.push(`desktop inner scroll: ${geometry.scrolling.join(', ')}`);
        if (geometry.tabs) result.issues.push('drawer contains tabs');
        if (geometry.emptyBottomPct >= 8) result.issues.push(`bottom empty area ${geometry.emptyBottomPct.toFixed(1)}% >= 8%`);
        if (result.emptyAreaPct > 15) result.issues.push(`raster empty area ${result.emptyAreaPct.toFixed(1)}% > 15%`);
        if (result.largestBlockHeight > 120) result.issues.push(`empty block ${result.largestBlockHeight}px tall spans over half panel`);
      }
      const file = `${width}x${height}-${path.replace(/[^a-z0-9]/gi, '_')}-${seq++}-${state.replace(/[^a-z0-9]/gi, '_')}.png`;
      await page.screenshot({ path: `${out}/${file}` });
      report.push({ width, height, path, state, file, ...result });
      writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
      console.log(`${width}x${height} ${path} ${state}: ${result.issues.length ? 'FAIL ' + result.issues.join('; ') : 'PASS'}`);
    };
    try {
      await page.goto(base + path, { waitUntil: 'networkidle', timeout: 90000 });
      await page.locator('.one-dossier,.main-view').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await record('page');
      const selectors = process.env.QA_BUTTONS ?? '.main-more,.table-toggle,.about-method,.tile-open,.holder-summary,.thesis-source-button,.business-open';
      const buttons = page.locator(selectors);
      for (let i = 0; i < await buttons.count(); i++) {
        const b = buttons.nth(i);
        if (!await b.isVisible()) continue;
        const name = await b.getAttribute('aria-label') || await b.innerText();
        await b.click();
        await page.locator('dialog[open]').waitFor();
        await record(name, 'dialog[open]');
        await page.keyboard.press('Escape');
        await page.locator('dialog[open]').waitFor({ state: 'detached' });
      }
      const filters = page.getByRole('button', { name: 'Filters', exact: true });
      if (await filters.isVisible()) {
        await filters.click();
        await record('Filters', 'dialog[open]');
        await page.keyboard.press('Escape');
        await page.locator('dialog[open]').waitFor({ state: 'detached' });
      } else for (const label of ['Country', 'Sector']) {
        const combo = page.getByRole('combobox', { name: label, exact: true });
        if (await combo.isVisible()) { await combo.click(); await record(`Filter ${label}`); await page.keyboard.press('Escape'); }
      }
      await page.getByRole('button', { name: 'Search companies', exact: true }).click();
      await record('Search', '.search-modal,dialog[open]');
      await page.locator('.search-modal input,.company-search input,dialog[open] input').first().fill('Wolters');
      await record('Search results', '.search-modal,dialog[open]');
    } catch (e) {
      report.push({ width, height, path, state: 'interaction failure', issues: [e.message] });
      if (e.message.startsWith('DISK STOP')) throw e;
    } finally { await page.close(); }
  }
} finally {
  await browser.close();
  writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
}
const failed = report.filter(r => r.issues.length);
console.log(`${failed.length}/${report.length} states failed. Report: ${out}/report.json`);
if (failed.length || !report.length) process.exitCode = 1;
