const { chromium } = require('/Users/miki/GitHub/superinvestors/node_modules/playwright');

const INIT = `
  window.__cap = [];
  let _ph;
  Object.defineProperty(window, 'posthog', {
    configurable: true,
    get() { return _ph; },
    set(v) {
      _ph = v;
      try {
        const orig = v.capture.bind(v);
        v.capture = function(name, props, opts) {
          try { window.__cap.push({ t: Date.now(), name: String(name),
            path: (props && props.$pathname) || (typeof location!=='undefined'?location.pathname:null),
            optedOut: (typeof v.has_opted_out_capturing === 'function') ? v.has_opted_out_capturing() : null }); } catch(e){}
          return orig(name, props, opts);
        };
      } catch(e) {}
    }
  });
`;

(async () => {
  const browser = await chromium.launch();
  for (const url of ['https://zernio.com/signup', 'https://zernio.com/', 'https://zernio.com/pricing', 'https://zernio.com/dashboard/api-keys']) {
    const ctx = await browser.newContext({ timezoneId: 'America/New_York', locale: 'en-US' });
    const page = await ctx.newPage();
    await page.addInitScript(INIT);
    const phReqs = [];
    page.on('request', r => { if (r.url().includes('/ph-data')) phReqs.push(r.url().split('?')[0]); });
    const t0 = Date.now();
    try { await page.goto(url, { waitUntil: 'load', timeout: 60000 }); } catch (e) { console.log(url, 'GOTO ERR', e.message); }
    const ttfbDone = Date.now() - t0;
    await page.waitForTimeout(9000);
    const cap = await page.evaluate(() => window.__cap || []);
    const loaded = await page.evaluate(() => { try { return { has: !!window.posthog, loaded: !!(window.posthog && window.posthog.__loaded), optedOut: window.posthog && window.posthog.has_opted_out_capturing ? window.posthog.has_opted_out_capturing() : null, did: window.posthog && window.posthog.get_distinct_id ? window.posthog.get_distinct_id() : null }; } catch(e){ return {err:String(e)}; } });
    console.log('\n=== ' + url + '  (load ' + ttfbDone + 'ms, final path ' + page.url().replace('https://zernio.com','') + ')');
    console.log('  posthog state:', JSON.stringify(loaded));
    console.log('  ph-data requests:', phReqs.length, phReqs.slice(0,4).join(' , '));
    console.log('  capture() calls:', cap.length);
    for (const c of cap) console.log('    -', c.name, 'path=' + c.path, 'optedOut=' + c.optedOut, '+' + (c.t - t0) + 'ms');
    await ctx.close();
  }
  await browser.close();
})();
