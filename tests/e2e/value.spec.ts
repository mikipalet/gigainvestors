import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('tests/fixtures/value/store');
test.beforeEach(async({page})=>{
 await page.route('https://raw.githubusercontent.com/mikipalet/gigainvestors-value-data/main/**',async route=>{
  const file=new URL(route.request().url()).pathname.split('/main/')[1];
  try{await route.fulfill({contentType:'application/json',body:await readFile(path.join(root,file),'utf8')});}catch{await route.fulfill({status:404,body:'{}'});}
 });
});
const open=async(page:import('@playwright/test').Page,key:string)=>{await page.getByTestId(`tile-${key}`).click();await expect(page.getByRole('dialog')).toBeVisible();};
const close=async(page:import('@playwright/test').Page)=>{await page.getByRole('button',{name:'Close panel',exact:true}).click();};
test('quality map, near misses, filters and current-price table',async({page})=>{
 await page.goto('/value',{waitUntil:'networkidle'});
 await expect(page.getByRole('heading',{level:1})).toHaveText(/quality compan.*at a buy price/);
 await page.getByRole('button',{name:'Table ↗',exact:true}).click();
 await expect(page.getByRole('row',{name:/Coca-Cola/})).toContainText('0.60×');
 await expect(page.getByRole('row',{name:/Delta Air/})).toHaveCount(0);
 await close(page);await page.getByRole('switch',{name:/Near misses/}).click();
 await page.getByRole('button',{name:'Table ↗',exact:true}).click();
 await expect(page.getByRole('row',{name:/Delta Air/})).toBeVisible();
 await close(page);await page.getByLabel('Country',{exact:true}).selectOption('US');
 await expect(page).toHaveURL(/country=US/);await page.reload();
 await expect(page.getByRole('switch',{name:/Near misses/})).toBeChecked();
 await page.getByRole('switch',{name:/Held by superinvestors/}).click();
 await page.getByRole('button',{name:'Table ↗',exact:true}).click();
 await expect(page.getByTestId('results-table').locator('[data-company-row]')).toHaveCount(1);
});
test('six evidence panels, filing evidence, valuation bridge and focus restoration',async({page})=>{
 await page.goto('/value/ko.us',{waitUntil:'networkidle'});
 await expect(page.locator('.test-tile')).toHaveCount(6);
 await open(page,'moat');await expect(page.locator('.test-section h2')).toHaveText('Moat');
 await page.getByText(/Report evidence \(/).click();
 await expect(page.getByText('Item 1 · Business').first()).toBeVisible();
 await expect(page.getByText('Our brands encourage repeat purchases.')).toHaveCount(0);
 await close(page);await expect(page.getByTestId('tile-moat')).toBeFocused();
 await page.getByTestId('valuation-open').click();
 await page.getByText('Show as table',{exact:true}).click();
 await expect(page.getByTestId('valuation-bridge').locator('tbody tr').last()).toContainText('36.78');
 await expect(page.getByTestId('football-field')).toContainText('40.0% below our mid estimate');
 await close(page);await expect(page.getByRole('link',{name:/Warren Buffett/})).toHaveAttribute('href','https://gigainvestors.com/s/KO');
});
test('virtual table reaches final row and preserves sorting without page scroll',async({page})=>{
 const row=JSON.parse(await readFile(path.join(root,'index/US.json'),'utf8'))[0];
 await page.route('**/main/index/US.json',r=>r.fulfill({json:Array.from({length:1501},(_,i)=>({...row,id:`FIX${i}.US`,n:`Company ${String(i).padStart(4,'0')}`,t:'PPPPP'}))}));
 await page.goto('/value?country=US&sort=name&direction=asc',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Table ↗',exact:true}).click();
 await expect(page.getByTestId('results-table')).toHaveAttribute('aria-rowcount','1502');
 expect(await page.locator('[data-company-row]').count()).toBeLessThanOrEqual(36);
 await page.getByTestId('results-scroll').evaluate(el=>{el.scrollTop=el.scrollHeight;});
 await expect(page.locator('[data-company-row]').last()).toContainText('Company 1500');
 expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(900);
});
test('phone filters and shared search preserve query and navigation',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/value',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:/^Filters/}).click();await page.getByRole('switch',{name:/Near misses/}).click();await close(page);
 await page.keyboard.press('/');const input=page.getByPlaceholder('investor, firm, ticker, company');await input.fill('Coca');
 await page.getByRole('button',{name:'Filter this list: Coca'}).click();await expect(page.locator('.map-count')).toContainText('1 companies');
 await page.keyboard.press('/');await input.fill('coca');await expect(page.locator('[role="option"]').first()).toContainText('KO.US');await input.press('Enter');await expect(page).toHaveURL(/\/value\/ko.us$/);
});
test('currency mismatch, no quote and bank valuation remain distinct',async({page})=>{
 await page.goto('/value/jpm.us',{waitUntil:'networkidle'});await page.getByTestId('valuation-open').click();
 await expect(page.getByTestId('football-field')).toContainText('Book value');await expect(page.getByRole('heading',{name:'Book value bridge'})).toBeVisible();
 await page.goto('/value/fx.us',{waitUntil:'networkidle'});await expect(page.locator('.value-band')).toContainText('not compared');
 await open(page,'price');await expect(page.getByTestId('football-field')).toContainText('Price is in USD, value in EUR, not compared');await expect(page.getByTestId('price-history')).toHaveCount(0);
 await page.goto('/value/sparse.us',{waitUntil:'networkidle'});await expect(page.locator('body')).not.toContainText('0 yrs');await expect(page.locator('body')).not.toContainText('Unavailable (');
});
test('panel chart keyboard controls and accessible data twins',async({page})=>{
 await page.goto('/value/ko.us',{waitUntil:'networkidle'});await open(page,'moat');
 const chart=page.getByTestId('threshold-series').filter({has:page.getByRole('heading',{name:/^Median/})});
 await chart.getByRole('button').first().focus();await page.keyboard.press('End');await expect(chart.getByRole('tooltip')).toContainText('FY2025');
 await page.keyboard.press('ArrowLeft');await expect(chart.getByRole('tooltip')).toContainText('FY2024');
 await chart.getByText('Show data',{exact:true}).click();await expect(chart.getByRole('table')).toContainText('28.0%');
 await close(page);await page.getByTestId('valuation-open').click();
 const field=page.getByTestId('football-field');await field.locator('[tabindex="0"]').first().focus();await expect(field.getByRole('tooltip')).toContainText('buy below');
 await field.getByText('Show data',{exact:true}).click();await expect(field.getByRole('table')).toContainText('36.78');
 const history=page.getByTestId('price-history');await history.getByText('Show value data',{exact:true}).click();await expect(history.getByRole('table',{name:'Fiscal-year value ranges'})).toBeVisible();
 await history.getByText('Show price data',{exact:true}).click();await expect(history.getByRole('table',{name:'Monthly closing prices'})).toBeVisible();
});
test('latest client quote updates value band, price tile and history together',async({page})=>{
 const prices=JSON.parse(await readFile(path.join(root,'prices/US.json'),'utf8'));
 await page.route('**/main/prices/US.json',r=>r.fulfill({json:prices}));await page.goto('/value/ko.us',{waitUntil:'networkidle'});
 await expect(page.locator('.value-band')).toContainText('0.60×');await expect(page.getByTestId('tile-price')).toContainText('0.60×');
 prices['KO.US']=[prices['KO.US'][0]/2,'2026-09-29'];await page.reload();
 await expect(page.locator('.value-band')).toContainText('0.30×');await expect(page.getByTestId('tile-price')).toContainText('0.30×');
 await page.getByTestId('valuation-open').click();await expect(page.getByTestId('football-field')).toContainText('70.0% below our mid estimate');await expect(page.getByTestId('price-history')).toContainText("Buy line uses today's required discount");
});
test('country and price failures remain visible and distinct',async({page})=>{
 await page.route('**/main/prices/US.json',r=>r.fulfill({status:503,body:'{}'}));await page.goto('/value');
 await expect(page.getByRole('status')).toContainText('Some prices are unavailable');
 await page.route('**/main/index/US.json',r=>r.fulfill({status:503,body:'{}'}));await page.getByLabel('Country',{exact:true}).selectOption('US');await expect(page.getByRole('status')).toContainText('Could not load this country');
});
test('map company names are focusable and navigate to dossiers',async({page})=>{
 await page.goto('/value',{waitUntil:'networkidle'});const point=page.locator('.company-map svg a').first();await expect(point).toBeVisible();const destination=await point.getAttribute('href');await point.focus();await expect(page.getByRole('tooltip')).toBeVisible();await page.keyboard.press('Enter');await expect(page).toHaveURL(new RegExp(destination!.replaceAll('.','\\.')+'$'));
});
test('search aliases, pending company and main-site shortcut',async({page})=>{
 await page.goto('/value',{waitUntil:'networkidle'});
 for(const [query,code] of [['coca','KO.US'],['tsm','TSM.US'],['nestle','NESN.SW'],['0700','0700.HK']]){
  await page.keyboard.press('Control+k');const input=page.getByPlaceholder('investor, firm, ticker, company');await input.fill(query);await expect(page.locator('[role="option"]').first()).toContainText(code);await input.press('ArrowDown');await input.press('ArrowUp');await expect(page.locator('[role="option"]').first()).toHaveAttribute('aria-selected','true');
  if(query==='0700'){await input.press('Enter');await expect(page.getByRole('heading',{name:'Not analysed yet'})).toBeVisible();}else await input.press('Escape');
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

test('one snapshot has the same funnel price count, published flags and green dots', async ({ page }) => {
 const meta = JSON.parse(await readFile(path.join(root, 'meta.json'), 'utf8'));
 const rows = JSON.parse(await readFile(path.join(root, 'index/default.json'), 'utf8'));
 const count = meta.funnel.gates.find((g: { key: string }) => g.key === 'price').passing;
 expect(count).toBe(5);
 expect(rows.filter((r: { b?: boolean }) => r.b === true)).toHaveLength(count);
 await page.goto('/value', { waitUntil: 'networkidle' });
 await expect(page.locator('.one-index')).toHaveAttribute('data-buy-count', String(count));
 await expect(page.locator('.company-map svg a[data-buy="true"]')).toHaveCount(count);
 await page.getByRole('switch', { name: /Near misses/ }).click();
 await expect(page.locator('.company-map svg a[data-buy="true"]')).toHaveCount(count);
 // A separately refreshed quote may move a point; only publication can change its verdict.
 const prices = JSON.parse(await readFile(path.join(root, 'prices/US.json'), 'utf8'));
 prices['KO.US'][0] *= 2;
 await page.route('**/main/prices/US.json', r => r.fulfill({ json: prices }));
 await page.reload({ waitUntil: 'networkidle' });
 await expect(page.locator('.company-map svg a[data-buy="true"]')).toHaveCount(count);
 await expect(page.locator('.company-map svg a[href$="/ko.us"]')).toHaveAttribute('data-buy', 'true');
});
