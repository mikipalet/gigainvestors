import { expect,test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {packView,unpackView} from '../../lib/value/browser-view';
import { valueFixtures } from './value-fixtures';
const root=path.resolve('tests/fixtures/value/store');
const read=(file:string)=>JSON.parse(readFileSync(path.join(root,file),'utf8'));
const meta=read('meta.json');
const current=()=>unpackView(read(meta.views.current));
test.beforeEach(async({page})=>valueFixtures(page));
const open=async(page:import('@playwright/test').Page,key:string)=>{await page.getByTestId(`tile-${key}`).getByRole('button').first().click();await expect(page.getByRole('dialog')).toBeVisible();};
const close=async(page:import('@playwright/test').Page)=>{await page.getByRole('button',{name:'Close panel',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);};
test('quality map, near misses, filters and current-price table',async({page})=>{
 await page.goto('/value',{waitUntil:'networkidle'});
 await expect(page.getByRole('heading',{level:1})).toHaveText('5 great businesses at a fair price.');
 await page.getByRole('button',{name:'All companies ↗',exact:true}).click();
 await expect(page.getByRole('row',{name:/Coca-Cola/})).toContainText('40% below its estimated value');
 await expect(page.getByRole('row',{name:/Delta Air/})).toHaveCount(0);
 await close(page);await page.getByRole('switch',{name:'Near misses',exact:true}).click();
 await page.getByRole('button',{name:'All companies ↗',exact:true}).click();
 const next=page.getByRole('navigation',{name:'Company pages'}).getByRole('button',{name:'→',exact:true});
 while(!await page.getByRole('row',{name:/Delta Air/}).count()&&await next.isEnabled())await next.click();
 await expect(page.getByRole('row',{name:/Delta Air/})).toBeVisible();
 await close(page);await page.getByRole('combobox',{name:'Country',exact:true}).click();await page.getByRole('option').filter({has:page.locator('.option-name',{hasText:/^United States$/})}).click();
 await expect(page).toHaveURL(/country=US/);await page.reload();
 await expect(page.getByRole('switch',{name:'Near misses',exact:true})).toBeChecked();
 await page.getByRole('switch',{name:'Held by superinvestors',exact:true}).click();
 await page.getByRole('button',{name:'All companies ↗',exact:true}).click();
 await expect(page.getByTestId('results-table')).toHaveAttribute('aria-rowcount','2');
 await expect(page.getByRole('row',{name:/Coca-Cola/})).toBeVisible();
});
test('six evidence panels, filing quotes, valuation values and focus restoration',async({page})=>{
 await page.goto('/value/ko.us',{waitUntil:'networkidle'});
 await expect(page.locator('.test-tile')).toHaveCount(6);
 await open(page,'moat');const dialog=page.getByRole('dialog');
 await expect(dialog).toHaveAccessibleName('Lasting advantage · evidence');
 await expect(dialog.getByRole('heading',{name:'From the filing'})).toBeVisible();
 await expect(dialog.locator('.filing-quotes blockquote')).toContainText('Our brands encourage repeat purchases.');
 await expect(dialog.locator('.filing-quotes a')).toHaveAttribute('href',/sec\.gov/);
 await close(page);await expect(page.getByTestId('tile-moat').getByRole('button')).toBeFocused();
 await open(page,'price');await expect(dialog.locator('.drawer-numbers')).toContainText('USD 36.78');
 await expect(dialog.locator('.drawer-years table')).toBeVisible();
 await close(page);await page.locator('.holder-summary').click();
 await expect(page.getByRole('dialog').locator('a.investor-row').filter({hasText:'Warren Buffett'})).toHaveAttribute('href','https://gigainvestors.com/BRK');
});
test('paged table reaches every row and preserves sorting without page scroll',async({page})=>{
 test.setTimeout(60000);
 const base=current()[0];
 const rows=Array.from({length:1501},(_,i)=>({...base,id:`FIX${i}.US`,n:`Company ${String(i).padStart(4,'0')}`,nameEn:`Company ${String(i).padStart(4,'0')}`}));
 await page.route(`**/api/value/data/${meta.views.deferred[0]}`,r=>r.fulfill({json:packView(rows)}));
 await page.goto('/value?country=US&q=Company&sort=name&direction=asc',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'All companies ↗',exact:true}).click();
 await expect(page.getByTestId('results-table')).toHaveAttribute('aria-rowcount','1502');
 const next=page.getByRole('navigation',{name:'Company pages'}).getByRole('button',{name:'→',exact:true});
 const seen:string[]=[];
 do {seen.push(...await page.locator('.table-ticker').allTextContents());if(!await next.isEnabled())break;await next.click();}while(true);
 expect(seen).toEqual(rows.map(r=>r.id));
 await page.getByRole('columnheader',{name:/Company/}).getByRole('button').click();
 await expect(page.locator('[data-company-row]').first()).toContainText('Company 1500');
 expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(900);
});
test('phone filters and shared search preserve query and navigation',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/value',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Filters',exact:true}).click();await page.getByRole('dialog').getByRole('switch',{name:'Near misses',exact:true}).click();await close(page);
 await page.keyboard.press('/');const input=page.getByPlaceholder('investor, firm, ticker, company');await expect(input).toBeFocused();await input.fill('Coca');
 await page.getByRole('button',{name:'Filter this list: Coca'}).click();await expect(page.locator('.main-view')).toHaveAttribute('data-total','1');
 await page.keyboard.press('/');await expect(input).toBeFocused();await input.fill('coca');await expect(page.locator('[role="option"]').first()).toContainText('KO.US');await input.press('Enter');await expect(page).toHaveURL(/\/value\/ko.us$/);
});
test('currency mismatch, short history and bank book-value evidence remain distinct',async({page})=>{
 await page.goto('/value/jpm.us',{waitUntil:'networkidle'});
 await expect(page.getByTestId('insufficient-data')).toContainText('Not enough history yet');
 await expect(page.getByRole('region',{name:'Financial highlights'})).toContainText('Book value / share');
 await expect(page.getByRole('region',{name:'Financial highlights'})).toContainText('USD 118');
 await page.goto('/value/fx.us',{waitUntil:'networkidle'});
 await expect(page.getByTestId('tile-price')).toHaveCount(0);
 await expect(page.locator('.reference-metrics')).toContainText('Quality tests');
 await expect(page.locator('.reference-metrics')).not.toContainText('Buy below');
 await page.goto('/value/sparse.us',{waitUntil:'networkidle'});await expect(page.locator('body')).not.toContainText('0 yrs');await expect(page.locator('body')).not.toContainText('Unavailable (');
});
test('panel chart keyboard controls and visible year-by-year data',async({page})=>{
 await page.goto('/value/ko.us',{waitUntil:'networkidle'});await open(page,'moat');
 const dialog=page.getByRole('dialog'),chart=dialog.locator('.chart-hit-area').first();
 await chart.focus();await chart.press('End');await expect(dialog.getByRole('tooltip')).toContainText('2025');
 await chart.press('ArrowLeft');await expect(dialog.getByRole('tooltip')).toContainText('2024');
 await expect(dialog.locator('.drawer-years table')).toContainText('28.0%');
 await close(page);await open(page,'price');
 await dialog.locator('.chart-hit-area').first().focus();await page.keyboard.press('End');await expect(dialog.getByRole('tooltip')).toBeVisible();
 await expect(dialog.locator('.drawer-years table')).toContainText('Value');
 await expect(dialog.locator('.drawer-years table')).toContainText('Buy below');
 await expect(dialog.locator('.drawer-numbers')).toContainText('USD 36.78');
});
test('published quote agrees across the reference numbers, price math and drawer',async({page})=>{
 // Dossiers now render one server snapshot; no independent client quote may overwrite it.
 const quote=read('prices/US.json')['KO.US'][0];let requests=0;
 await page.route('**/api/value/data/prices/**',r=>{requests++;return r.fulfill({json:{'KO.US':[quote/2,'2026-09-29']}});});
 for(let i=0;i<2;i++){
  await page.goto('/value/ko.us',{waitUntil:'networkidle'});
  await expect(page.locator('.reference-metrics')).toContainText(`USD ${quote.toFixed(2)}`);
  await expect(page.locator('.valuation-math')).toContainText(`1 − ${quote.toFixed(2)} / 36.78 = 40.0%`);
  await open(page,'price');await expect(page.getByRole('dialog').locator('.drawer-numbers')).toContainText(`USD ${quote.toFixed(2)}`);
 }
 expect(requests).toBe(0);
});
test('failed deferred data is visible and preserves the already loaded view',async({page})=>{
 await page.route(`**/api/value/data/${meta.views.deferred[0]}`,r=>r.fulfill({status:503,body:'{}'}));await page.goto('/value');
 const before=await page.locator('.main-view').getAttribute('data-total');
 await page.getByRole('switch',{name:'Near misses',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Could not load this view. Try again.');
 await expect(page.locator('.main-view')).toHaveAttribute('data-total',before!);
 await expect(page.locator('.main-view')).toHaveAttribute('aria-busy','false');
});
test('search aliases, pending company and main-site shortcut',async({page})=>{
 await page.goto('/value',{waitUntil:'networkidle'});
 for(const [query,code] of [['coca','KO.US'],['tsm','TSM.US'],['nestle','NESN.SW'],['0700','0700.HK']]){
  await page.keyboard.press('Control+k');const input=page.getByPlaceholder('investor, firm, ticker, company');await expect(input).toBeFocused();await input.fill(query);await expect(page.locator('[role="option"]').first()).toContainText(code);await input.press('ArrowDown');await input.press('ArrowUp');await expect(page.locator('[role="option"]').first()).toHaveAttribute('aria-selected','true');
  if(query==='0700'){await input.press('Enter');await expect(page.getByRole('heading',{name:'Company not found',exact:true})).toBeVisible();await expect(page.locator('body')).toContainText('a missing dossier does not mean a business failed the tests');}else await input.press('Escape');
 }
 await page.goto('/');await page.getByRole('button',{name:'Search',exact:true}).click();await expect(page.getByPlaceholder('investor, firm, ticker, company')).toBeVisible();
});
test('subdomain rewrites, canonical redirects, robots, sitemap and genuine 404',async({request})=>{
 const dossier=await request.get('/ko.us',{headers:{host:'value.gigainvestors.com'}});expect(dossier.status()).toBe(200);expect(await dossier.text()).toContain('Coca-Cola');
 const index=await request.get('/',{headers:{host:'value.gigainvestors.com'}});expect(await index.text()).toContain('aria-label="Search companies"');
 for(const [url,host,expected] of [['/value/KO.US?near=1','localhost:3192','/value/ko.us?near=1'],['/KO.US?near=1','value.gigainvestors.com','/ko.us?near=1']]){
  const res=await request.get(url,{headers:{host},maxRedirects:0});expect(res.status()).toBe(308);expect(res.headers().location).toContain(expected);
 }
 for(const host of ['value.gigainvestors.com','gigainvestors.com']){const r=await request.get('/robots.txt',{headers:{host}});expect(await r.text()).toContain(`Sitemap: https://${host}/sitemap.xml`);}
 const sitemap=await request.get('/sitemap.xml',{headers:{host:'value.gigainvestors.com'}});expect(await sitemap.text()).toContain('https://value.gigainvestors.com/ko.us');
 for(const id of ['nope.us','bad','a'.repeat(25)+'.us'])expect((await request.get(`/value/${id}`)).status()).toBe(404);
});
