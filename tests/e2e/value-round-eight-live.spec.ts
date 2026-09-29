import { expect,test } from '@playwright/test';
test.skip(process.env.VALUE_LIVE_QA!=='1','Run against the production build with VALUE_LIVE_QA=1 and VALUE_SITE_HOST=localhost.');
test('live home puts every published buy first, explains the track record and exposes all companies',async({page})=>{
 await page.setViewportSize({width:1728,height:970});await page.goto('/',{waitUntil:'networkidle'});
 const buys=await page.locator('.one-index').getAttribute('data-buy-count');
 await expect(page.locator('.buy-tile')).toHaveCount(Number(buys));
 await expect(page.locator('.buy-tile').first()).toContainText('Owner return');
 await expect(page.locator('.track-record')).toContainText(/median.*vs.*of.*years/);
 await expect(page.getByRole('button',{name:/\+\d+ more/})).toHaveCount(0);
 const show=page.getByRole('button',{name:/^Show all \d+/});
 const total=Number((await show.textContent())!.match(/\d+/)![0]);await show.click();
 await expect(page.getByTestId('results-table')).toHaveAttribute('aria-rowcount',String(total+1));
});
test('live dossier verdicts distinguish buy, wait and failed quality',async({page})=>{
 for(const [id,verdict] of [['ko.us','Wait for a better price'],['infy.us','Buy zone'],['dal.us','Fails quality']]){
  await page.goto('/'+id,{waitUntil:'networkidle'});await expect(page.locator('.plain-verdict')).toHaveText(verdict);
  await expect(page.locator('.value-band')).toContainText(/below its estimated value|Costs .* its estimated value/);
  await expect(page.locator('.checklist-label')).toHaveText('5 quality tests + price');
 }
});
test('live metric and holder explanations follow pointer and keyboard focus',async({page})=>{
 await page.setViewportSize({width:1728,height:970});
 await page.goto('/infy.us',{waitUntil:'networkidle'});
 const metric=page.getByTestId('tile-accounting').locator('.plain-metric');await metric.focus();
 await expect(page.getByRole('tooltip')).toContainText('negative number is good');
 await expect(page.getByRole('tooltip')).toContainText('Source:');await metric.blur();
 const holder=page.locator('.holder-stack a').first();await holder.focus();await expect(page.getByRole('tooltip')).toContainText('Tracked investor');
 await expect(holder).toHaveAttribute('href',/^https:\/\/gigainvestors.com\//);
});
test('live search finds a company and the year slider restores a historical view',async({page})=>{
 await page.goto('/',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Search companies'}).click();
 const input=page.getByPlaceholder('investor, firm, ticker, company');await input.fill('INFY');
 await expect(page.getByRole('option').first()).toContainText('INFY.US');await input.press('Enter');await expect(page).toHaveURL(/\/infy.us$/);
 await page.goto('/',{waitUntil:'networkidle'});const slider=page.getByRole('slider',{name:'Fiscal year'});await slider.focus();await slider.press('Home');
 await expect(page).toHaveURL(/year=2016/);await expect(page.getByRole('heading',{level:1})).toContainText('In 2016');
 await page.reload({waitUntil:'networkidle'});await expect(slider).toHaveAttribute('aria-valuetext','Fiscal year 2016');
});
test('unauthenticated value revalidation is rejected',async({request})=>{
 expect((await request.post('/api/value/revalidate')).status()).toBe(401);
 expect((await request.post('/api/value/revalidate',{headers:{authorization:'Bearer invalid'}})).status()).toBe(401);
});

test('round nine separates five business tests from price and explains the good direction',async({page})=>{
 await page.goto('/infy.us',{waitUntil:'networkidle'});
 await expect(page.locator('.quality-section .test-tile')).toHaveCount(5);
 await expect(page.locator('.price-section .test-tile')).toHaveCount(1);
 await expect(page.locator('.value-definition')).toContainText('future cash for owners');
 await expect(page.locator('.value-definition')).toContainText('25%');
 await expect(page.locator('.value-definition')).toContainText('50%');
 await expect(page.getByTestId('tile-accounting')).toContainText('Lower is better');
 await expect(page.getByTestId('tile-accounting').locator('[data-good-side]')).toHaveAttribute('data-good-side','lower');
 await expect(page.locator('.exact-prices')).toContainText('USD');
 await expect(page.locator('.exact-prices')).toContainText('Buy price');
 await page.locator('.holder-summary').focus();
 await expect(page.getByRole('tooltip')).toContainText('Tracked investors');
 await expect(page.getByRole('tooltip')).toContainText('gigainvestors.com');
 await page.goto('/dal.us',{waitUntil:'networkidle'});
 await expect(page.locator('.verdict-explanation')).toContainText('A lower price would not fix the business');
 await expect(page.locator('.price-condition')).toContainText('Price would need to drop');
 await expect(page.locator('.price-condition')).toContainText('not a forecast');
});
test('round nine buy cards show quote, currency, country and listing access',async({page})=>{
 await page.setViewportSize({width:1728,height:970});await page.goto('/',{waitUntil:'networkidle'});
 const infy=page.locator('.buy-tile').filter({hasText:'Infosys'});
 await expect(infy.locator('.buy-quote')).toContainText(/USD [\d.]+ · US/);
 await expect(infy.locator('.buy-listing')).toContainText('NYSE');
 await expect(page.locator('.buy-listing').filter({hasText:'A-shares'}).first()).toBeVisible();
 await expect(page.locator('.buy-listing').filter({hasText:'Tokyo'}).first()).toBeVisible();
 await expect(page.locator('.time-note')).toContainText('Time travel');
 await expect(page.locator('.index-story .value-definition')).toBeVisible();
 for(const tile of await page.locator('.company-tile').all()){
  await expect(tile.locator('strong')).not.toBeEmpty();
  await expect(tile.locator('.map-price')).toContainText(/buy price|too high|unavailable/);
 }
});
