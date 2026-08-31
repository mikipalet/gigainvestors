const { chromium } = require('/Users/miki/GitHub/superinvestors/node_modules/playwright');
const zlib = require('zlib');
function decode(buf){ if(!buf) return '(none)';
  try { return zlib.gunzipSync(buf).toString('utf8'); } catch(e){}
  try { const s=buf.toString('utf8'); if(s.startsWith('data=')) return Buffer.from(decodeURIComponent(s.slice(5)),'base64').toString('utf8'); return s; } catch(e){ return '(undecodable)'; } }
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ timezoneId: 'America/New_York', locale: 'en-US' });
  const page = await ctx.newPage();
  const ingest = [];
  page.on('request', r => { const u=r.url(); if(u.includes('/ph-data/') && r.method()==='POST' && !u.includes('/flags')) ingest.push([u.replace('https://zernio.com',''), decode(r.postDataBuffer())]); });
  await page.goto('https://zernio.com/signup', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(6000);
  console.log('labels on page:', await page.locator('label').count(), ' anchors:', await page.locator('a').count());
  console.log('--- ingest POSTs after load, BEFORE any click:', ingest.length);
  // Harmless: click a <label> (focuses an input; submits nothing)
  const lab = page.locator('label').first();
  if (await lab.count()) { await lab.click({ timeout: 5000 }).catch(e=>console.log('label click err', e.message)); }
  await page.waitForTimeout(8000);
  console.log('--- ingest POSTs AFTER label click:', ingest.length);
  for (const [u, b] of ingest) {
    let names = [];
    try { const j = JSON.parse(b); const arr = Array.isArray(j) ? j : (j.batch || [j]); names = arr.map(e => e.event + (e.properties && e.properties.$event_type ? '/'+e.properties.$event_type : '') + ' @' + (e.properties&&e.properties.$pathname)); } catch(e){ names=['(parse fail) '+b.slice(0,200)]; }
    console.log('  POST', u, '->', names.join(' , '));
  }
  console.log('final url:', page.url());
  await browser.close();
})();
