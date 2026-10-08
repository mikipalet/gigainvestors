const { chromium, webkit } = require('@playwright/test');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const local = process.env.BASE_URL || 'http://localhost:3998';
const outDir = 'docs/value/devices-1/screenshots';
const logPath = 'docs/value/devices-1/resume3-verify.jsonl';
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(logPath, '');

const deviceSizes = process.env.DEVICE_SIZES ? JSON.parse(process.env.DEVICE_SIZES) : [[390, 844], [375, 667], [820, 1180], [768, 1024], [1180, 820], [1024, 768]];
const desktopSizes = process.env.DESKTOP_SIZES ? JSON.parse(process.env.DESKTOP_SIZES) : [[1728, 970], [1440, 900]];
const deviceRoutes = process.env.DEVICE_ROUTES ? JSON.parse(process.env.DEVICE_ROUTES) : ['/s/GOOGL', '/value'];
const desktopRoutes = process.env.DESKTOP_ROUTES ? JSON.parse(process.env.DESKTOP_ROUTES) : ['/', '/value', '/s/GOOGL', '/s/KO', '/HA?q=2026Q2'];

function slug(route) {
  return route.replace(/[^a-z0-9]/gi, '_') || '_';
}

async function waitReady(page, route) {
  if (route === '/' || route.includes('/HA') || route === '/index') {
    await page.locator('.tile,.legacy-investor,.one-index').first().waitFor({ timeout: 20000 }).catch(() => {});
  } else if (route === '/value') {
    await page.locator('.main-view').waitFor({ timeout: 20000 });
    await page.locator('.main-next-row').first().waitFor({ timeout: 20000 }).catch(() => {});
    await page.locator('input[type=range]').first().waitFor({ timeout: 6000 }).catch(() => {});
  } else {
    await page.locator('.one-dossier').waitFor({ timeout: 20000 });
    await page.locator('.price-section .mini-price svg').first().waitFor({ timeout: 6000 }).catch(() => {});
  }
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1800);
}

async function capture(browserType, base, route, width, height, label, touch) {
  const browser = await browserType.launch();
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch && width < 768, deviceScaleFactor: 1 });
  if (base.includes('localhost') && process.env.DIRECT_STATIC !== '0') {
    await context.route('**/_next/static/**', async route => {
      const localPath = new URL(route.request().url()).pathname.replace('/_next/static/', '.next/dev/static/');
      if (fs.existsSync(localPath)) {
        await route.fulfill({ path: localPath, contentType: localPath.endsWith('.js') ? 'application/javascript' : localPath.endsWith('.css') ? 'text/css' : undefined });
      } else {
        await route.continue();
      }
    });
  }
  const page = await context.newPage();
  const errors = [], failed = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 240)); });
  page.on('requestfailed', r => {
    const err = r.failure()?.errorText || '';
    if (!/abort/i.test(err)) failed.push({ url: new URL(r.url()).pathname, error: err });
  });
  page.on('response', r => { if (r.status() >= 400) failed.push({ url: new URL(r.url()).pathname, status: r.status() }); });
  await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await waitReady(page, route);
  const file = `${label}-${width}x${height}-${slug(route)}.png`;
  await page.screenshot({ path: path.join(outDir, file), fullPage: false });
  const metrics = await page.evaluate(() => {
    const box = s => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), visible: el.checkVisibility?.() ?? true };
    };
    return {
      href: location.href,
      overflowX: document.documentElement.scrollWidth - innerWidth,
      rangeCount: document.querySelectorAll('input[type=range]').length,
      nextRows: document.querySelectorAll('.main-next-row').length,
      visibleChartFigures: [...document.querySelectorAll('.quality-section .mini-series,.quality-section .mini-dollar,.price-section .mini-price')]
        .filter(el => getComputedStyle(el).visibility !== 'hidden' && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0).length,
      priceChart: box('.price-section .mini-price svg'),
      dock: box('.site-dock'),
    };
  });
  await context.close();
  await browser.close();
  fs.appendFileSync(logPath, JSON.stringify({ label, width, height, route, screenshot: `screenshots/${file}`, metrics, errors, failed }) + '\n');
  return path.join(outDir, file);
}

async function sideBySide(left, right, output) {
  const [a, b] = await Promise.all([sharp(left).metadata(), sharp(right).metadata()]);
  const gap = 16;
  const width = (a.width || 0) + (b.width || 0) + gap;
  const height = Math.max(a.height || 0, b.height || 0);
  await sharp({
    create: { width, height, channels: 4, background: '#f5f2ea' },
  }).composite([
    { input: left, left: 0, top: 0 },
    { input: right, left: (a.width || 0) + gap, top: 0 },
  ]).png().toFile(output);
}

(async () => {
  if (process.env.SKIP_DEVICE !== '1') for (const engine of [chromium, webkit]) {
    for (const [width, height] of deviceSizes) {
      for (const route of deviceRoutes) {
        try {
          const local_ = await capture(engine, local, route, width, height, `resume3-final-${engine.name()}-local`, true);
          if (process.env.DEVICE_PROD === '1') {
            const prod = await capture(engine, 'https://gigainvestors.com', route, width, height, `resume3-prod-${engine.name()}`, true);
            await sideBySide(prod, local_, path.join(outDir, `resume3-compare-${engine.name()}-${width}x${height}-${slug(route)}.png`));
          }
        } catch (error) {
          fs.appendFileSync(logPath, JSON.stringify({ label: `resume3-final-${engine.name()}-local`, width, height, route, error: error.message }) + '\n');
        }
      }
    }
  }
  if (process.env.SKIP_DESKTOP !== '1') for (const [width, height] of desktopSizes) {
    for (const route of desktopRoutes) {
      try {
        const prod = await capture(chromium, 'https://gigainvestors.com', route, width, height, 'resume3-prod-chromium', false);
        const dev = await capture(chromium, local, route, width, height, 'resume3-final-chromium-local', false);
        await sideBySide(prod, dev, path.join(outDir, `resume3-compare-chromium-${width}x${height}-${slug(route)}.png`));
      } catch (error) {
        fs.appendFileSync(logPath, JSON.stringify({ label: 'resume3-compare-chromium', width, height, route, error: error.message }) + '\n');
      }
    }
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
