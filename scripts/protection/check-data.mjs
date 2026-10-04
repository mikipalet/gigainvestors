// VALUE_COMPARE_DIR=/fixed/snapshot node --env-file=/private/automation.env scripts/protection/check-data.mjs <origin> <report.json>
import {createHash} from 'node:crypto';
import {writeFileSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const [origin, output] = process.argv.slice(2);
if (!origin || !output) throw Error('Expected origin and report path');
const headers = new URL(origin).hostname.endsWith('.vercel.app') ? (process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? {'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET} : process.env.VERCEL_OIDC_TOKEN ? {'x-vercel-trusted-oidc-idp-token':process.env.VERCEL_OIDC_TOKEN} : {}) : {};
const source = process.env.VALUE_COMPARE_DIR;
if (!source) throw Error('VALUE_COMPARE_DIR must name the uploaded snapshot');
const meta = JSON.parse(readFileSync(path.join(source, 'meta.json'), 'utf8'));
const views = [...new Set(JSON.stringify(meta).match(/views\/[a-f0-9]{24}\.json/g) ?? [])];
const files = ['meta.json', 'top.json', 'aliases.json', 'history/index.json', 'search/manifest.json', 'index/default.json', 'index/US.json', 'prices/US.json', ...views].slice(0, 20);
if (files.length !== 20) throw Error('Need exactly 20 published samples');
const hash = data => createHash('sha256').update(Buffer.from(data)).digest('hex');
let browser, page;
if (process.env.PROTECT_BROWSER === '1') {
  const {chromium} = await import('@playwright/test');
  browser = await chromium.launch();
  page = await browser.newPage();
  await page.route(new URL(origin).origin + '/**', route => route.continue({headers: {...route.request().headers(), ...headers}}));
  await page.goto(new URL('/value', origin).href, {waitUntil: 'domcontentloaded', timeout: 90000});
  await page.waitForTimeout(1500);
}
const report = [];
try {
  for (const file of files) {
    const old = {status:200}, a = readFileSync(path.join(source,file));
    const url = new URL('/data/v/' + file, origin).href;
    let next;
    if (page) {
      next = await page.evaluate(async url => {
        const r = await fetch(url), bytes = await r.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        return {status: r.status, bytes: bytes.byteLength, sha256: [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join(''), cache: r.headers.get('cache-control'), cdn: r.headers.get('x-vercel-cache')};
      }, url);
    } else {
      let r;
      if (process.env.PROTECT_VERCEL_CURL === '1') {
        if (!new URL(origin).hostname.endsWith('.vercel.app')) throw Error('CLI transport requires an explicit Preview hostname');
        const raw = execFileSync('vercel', ['curl', new URL(url).pathname, '--deployment', origin, '--', '--silent', '--include'], {maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore']});
        const start = raw.indexOf('HTTP/'), end = raw.indexOf('\r\n\r\n', start);
        if (start < 0 || end < 0) throw Error('Invalid CLI response');
        const lines = raw.subarray(start, end).toString().split('\r\n'), status = Number(lines.shift().split(' ')[1]), responseHeaders = new Headers();
        for (const line of lines) { const i = line.indexOf(':'); if (i > 0) responseHeaders.append(line.slice(0, i), line.slice(i + 1).trim()); }
        r = new Response(raw.subarray(end + 4), {status, headers: responseHeaders});
      } else r = await fetch(url, {headers});
      const b = await r.arrayBuffer();
      next = {status: r.status, bytes: b.byteLength, sha256: hash(b), cache: r.headers.get('cache-control'), cdn: r.headers.get('x-vercel-cache')};
    }
    const identical = hash(a) === next.sha256;
    const pass = old.status === 200 && next.status === 200 && identical && (file.startsWith('views/') ? next.cache?.includes('immutable') : next.cache?.includes('max-age=0'));
    report.push({file, oldStatus: old.status, ...next, identical, pass});
    console.log(file, pass ? 'PASS' : 'FAIL');
  }
} finally {
  await browser?.close();
  writeFileSync(output, JSON.stringify(report, null, 2));
}
if (report.length !== 20 || report.some(r => !r.pass)) process.exitCode = 1;
