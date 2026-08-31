const { chromium } = require('/Users/miki/GitHub/superinvestors/node_modules/playwright');
const zlib = require('zlib');

function decode(buf) {
  if (!buf) return '(no body)';
  try { return zlib.gunzipSync(buf).toString('utf8').slice(0, 500); } catch (e) {}
  try {
    const s = buf.toString('utf8');
    if (s.startsWith('data=')) { return Buffer.from(decodeURIComponent(s.slice(5)), 'base64').toString('utf8').slice(0,500); }
    return s.slice(0, 500);
  } catch (e) { return '(undecodable ' + buf.length + 'b)'; }
}

(async () => {
  const browser = await chromium.launch();
  for (const url of ['https://zernio.com/signup', 'https://zernio.com/', 'https://zernio.com/dashboard/api-keys']) {
    const ctx = await browser.newContext({ timezoneId: 'America/New_York', locale: 'en-US' });
    const page = await ctx.newPage();
    const reqs = [];
    page.on('request', r => { if (r.url().includes('/ph-data') || r.url().includes('posthog-bootstrap')) reqs.push([r.method(), r.url().replace('https://zernio.com',''), r.postDataBuffer()]); });
    const t0 = Date.now();
    try { await page.goto(url, { waitUntil: 'load', timeout: 60000 }); } catch (e) {}
    await page.waitForTimeout(12000);
    const state = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter(k => k.includes('posthog') || k.includes('ph_') || k.includes('consent'));
      const out = {};
      for (const k of keys) out[k] = String(localStorage.getItem(k)).slice(0, 220);
      return { lsKeys: out, cookies: document.cookie.split(';').map(s=>s.trim().split('=')[0]).filter(k=>k.includes('ph_')||k.includes('posthog')) };
    });
    console.log('\n===== ' + url + '  -> final ' + page.url().replace('https://zernio.com',''));
    for (const [m, u, b] of reqs) console.log('  ' + m + ' ' + u + (m === 'POST' ? '  BODY: ' + decode(b) : ''));
    console.log('  localStorage posthog/consent keys:', JSON.stringify(state.lsKeys));
    console.log('  ph cookies:', JSON.stringify(state.cookies));
    await ctx.close();
  }
  await browser.close();
})();
