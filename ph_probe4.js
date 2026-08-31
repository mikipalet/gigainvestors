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
  const inv = await page.evaluate(() => ({
    inputs: [...document.querySelectorAll('input')].map(i => i.type + '|' + (i.name||i.id||'')),
    anchors: [...document.querySelectorAll('a')].map(a => (a.getAttribute('href')||'') + ' :: ' + a.textContent.trim().slice(0,30)),
    forms: document.querySelectorAll('form').length,
    optedOut: localStorage.getItem('__ph_opt_in_out_phc_Wg7UsTnizrR8tfU7nx7feMNH90QQa8JolmAu64poFBk'),
  }));
  console.log(JSON.stringify(inv, null, 1));
  console.log('ingest before click:', ingest.length);
  const inp = page.locator('input[type="email"], input[type="text"]').first();
  if (await inp.count()) { await inp.click({ timeout: 5000 }).catch(e=>console.log('err', e.message)); console.log('clicked an input (no typing, no submit)'); }
  await page.waitForTimeout(9000);
  console.log('ingest after click:', ingest.length);
  for (const [u,b] of ingest) {
    let names=[]; try { const j=JSON.parse(b); const arr=Array.isArray(j)?j:(j.batch||[j]); names=arr.map(e=>e.event+(e.properties&&e.properties.$event_type?'/'+e.properties.$event_type:'')+' @'+(e.properties&&e.properties.$pathname)); } catch(e){ names=['(parsefail)'+b.slice(0,150)]; }
    console.log('  POST',u,'->',names.join(' , '));
  }
  console.log('final url:', page.url());
  await browser.close();
})();
