// node scripts/value/change-review.mjs <candidate-base> <out> [live-base]
// Screenshots the same states on production and on a candidate build, then writes a
// side-by-side PNG for every state whose pixels differ. Every pair must be explained by
// the request being shipped; anything else is an unrequested change and blocks the deploy.
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [candidate, out, live = 'https://value.gigainvestors.com'] = process.argv.slice(2);
if (!candidate || !out) throw Error('Usage: change-review.mjs <candidate-base> <out> [live-base]');
const sizes = (process.env.QA_VIEWPORTS ?? '1728x970,390x844').split(',').map(s => s.split('x').map(Number));
const SHARED_CHROME = ['components/Search.tsx', 'components/QuarterSlider.tsx', 'components/value/BottomBar.tsx', 'components/value/SidePanel.tsx', 'app/value/side-panel.css'];

const close = async page => { await page.keyboard.press('Escape'); await page.waitForTimeout(250); };
const valueStates = [
  ['home', '/', async () => {}],
  ['search', '/', async page => { await page.keyboard.press('/'); await page.waitForTimeout(400); await page.keyboard.type('Wolters'); await page.waitForTimeout(1200); }],
  ['country-filter', '/', async page => { await page.getByRole('combobox', { name: 'Country', exact: true }).first().click().catch(() => {}); }],
  ['all-companies', '/', async page => { await page.getByRole('button', { name: /All companies/ }).first().click(); }],
  ['method', '/', async page => { await page.getByRole('button', { name: 'Method', exact: true }).click(); }],
  ['quarter-step', '/', async page => { await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(900); }],
  ['2018Q3', '/?q=2018Q3', async () => {}],
  ['ko', '/ko.us', async () => {}],
  ['ko-business', '/ko.us', async page => { await page.getByRole('button', { name: /In depth|More/ }).first().click(); }],
  ['ko-valuation', '/ko.us', async page => { await page.getByRole('button', { name: /valuation/i }).first().click(); }],
];

const mainStates=[
 ['home','/',async()=>{}],
 ['investor','/BRK',async()=>{}],
 ['company','/s/AAPL',async()=>{}],
 ['search','/',async page=>{await page.keyboard.press('/');await page.locator('.search-modal input').fill('Apple');await page.waitForTimeout(1200);}],
 ['2018Q3','/BRK?q=2018Q3',async()=>{}],
];
const states=(process.env.QA_FAMILY==='main'?mainStates:valueStates).filter(([name])=>!process.env.QA_STATES||process.env.QA_STATES.split(',').includes(name));
function mappedPath(path){
 if(process.env.QA_FAMILY==='main')return path;
 if(path.startsWith('/ko.us'))return path.replace('/ko.us','/s/KO');
 return '/value'+(path==='/'?'':path);
}

async function shoot(browser, base, [width, height], [name, path, act], candidateShot=false) {
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 500 });
  await page.goto(base + (candidateShot?mappedPath(path):path), { waitUntil: 'networkidle', timeout: 90000 });
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important} *{animation:none!important;transition:none!important;caret-color:transparent!important}' });
  await act(page).catch(error => console.log(`${name}: ${error.message.split('\n')[0]}`));
  await page.waitForTimeout(500);
  const png = await page.screenshot();
  await close(page); await page.close();
  return png;
}

async function differingShare(a, b) {
  const [x, y] = await Promise.all([a, b].map(png => sharp(png).raw().toBuffer({ resolveWithObject: true })));
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) return 1;
  let changed = 0;
  for (let i = 0; i < x.data.length; i += x.info.channels) {
    if (Math.abs(x.data[i] - y.data[i]) + Math.abs(x.data[i + 1] - y.data[i + 1]) + Math.abs(x.data[i + 2] - y.data[i + 2]) > 30) changed++;
  }
  return changed / (x.info.width * x.info.height);
}

async function sideBySide(a, b, file) {
  const { width, height } = await sharp(a).metadata();
  await sharp({ create: { width: width * 2 + 12, height, channels: 3, background: '#d00' } })
    .composite([{ input: a, left: 0, top: 0 }, { input: b, left: width + 12, top: 0 }])
    .png().toFile(file);
}

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const report = [];
try {
  for (const size of sizes) for (const state of states) {
    const [before, after] = [await shoot(browser, live, size, state), await shoot(browser, candidate, size, state,true)];
    const share = await differingShare(before, after);
    const file = share > 0.002 ? `${out}/${size.join('x')}-${state[0]}.png` : null;
    if (file) await sideBySide(before, after, file);
    report.push({ size: size.join('x'), state: state[0], changedPixels: Number(share.toFixed(4)), file });
    console.log(`${size.join('x')} ${state[0]} ${(share * 100).toFixed(2)}%${file ? ' -> ' + file : ''}`);
  }
} finally { await browser.close(); }

const chrome = execFileSync('git', ['diff', '--name-only', process.env.LIVE_COMMIT ?? 'origin/master', 'HEAD', '--', ...SHARED_CHROME], { encoding: 'utf8' }).trim();
writeFileSync(`${out}/report.json`, JSON.stringify({ live, candidate, sharedChromeChanged: chrome ? chrome.split('\n') : [], states: report }, null, 1));
console.log(chrome ? `SHARED CHROME CHANGED (needs an owner request):\n${chrome}` : 'Shared chrome unchanged.');
