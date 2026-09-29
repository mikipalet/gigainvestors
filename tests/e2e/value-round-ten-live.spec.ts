import { expect, test } from '@playwright/test';
test.skip(process.env.VALUE_LIVE_QA!=='1','Run against the production build with live published data.');
const sizes=[[1728,970],[2056,1180],[390,844],[430,932],[820,1180],[1280,720],[1366,768],[1440,800],[1470,836],[1512,862],[1536,730],[1680,950],[1728,1000],[1920,960],[2560,1300]];
for(const [width,height] of sizes)test(`live round ten keeps all four pages and evidence on one screen at ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});
 for(const route of ['/','/ko.us','/infy.us','/dal.us']){
  await page.goto(route,{waitUntil:'networkidle'});
  expect(await page.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight}))).toEqual({w:width,h:height});
  await expect(page.locator('select')).toHaveCount(0);
  const cuts=await page.evaluate(()=>Array.from(document.querySelectorAll('.buy-tile,.company-tile,.test-tile,.dossier-band,.index-story')).flatMap(parent=>{
   const box=parent.getBoundingClientRect();
   return Array.from(parent.children).flatMap(child=>{const r=child.getBoundingClientRect(),s=getComputedStyle(child);return s.display!=='none'&&r.width>0&&r.height>0&&(r.bottom>box.bottom+2||r.right>box.right+2||r.left<box.left-2||r.top<box.top-2)?[`${parent.className}: ${child.textContent?.slice(0,50)} exceeds parent`]:[];});
  }));
  expect(cuts,route).toEqual([]);
 }
 for(let i=1;i<=6;i++){
  await page.keyboard.press(String(i));await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(height);
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 }
});
test('live custom controls, pointer tooltip and monogram recovery',async({page})=>{
 await page.goto('/',{waitUntil:'networkidle'});
 const country=page.getByRole('combobox',{name:'Country'});await country.focus();await country.press('End');await country.press('Enter');
 await expect(page).toHaveURL(/country=US/);
 await page.goto('/',{waitUntil:'networkidle'});
 const tile=page.locator('.buy-tile').first(),box=(await tile.boundingBox())!;
 const point={x:box.x+box.width/2,y:box.y+box.height/2};await page.mouse.move(point.x,point.y);
 const tip=page.getByRole('tooltip');await expect(tip).toBeVisible();
 const t=(await tip.boundingBox())!;
 expect(Math.hypot(Math.max(t.x-point.x,0,point.x-t.x-t.width),Math.max(t.y-point.y,0,point.y-t.y-t.height))).toBeLessThanOrEqual(24);
 await page.route('**/api/value/logo?**',r=>r.fulfill({status:204}));
 await page.reload({waitUntil:'networkidle'});
 await expect(page.locator('.buy-tile').filter({hasText:'Hisense'}).locator('.company-monogram')).toContainText('HK');
});
test('live phone price panels expose readable history and both data tables',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const id of ['ko.us','infy.us','dal.us']){
  await page.goto('/'+id,{waitUntil:'networkidle'});
  await page.getByTestId('tile-price').click();
  const history=page.getByTestId('price-history');await history.scrollIntoViewIfNeeded();
  await expect(history).toContainText('Price and estimated value per share, USD');
  await history.getByText('Show value data',{exact:true}).click();
  await expect(history.getByRole('table',{name:'Fiscal-year value ranges'})).toBeVisible();
  await history.getByText('Show price data',{exact:true}).click();
  await expect(history.getByRole('table',{name:'Monthly closing prices'})).toBeVisible();
  expect(await page.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight}))).toEqual({w:390,h:844});
 }
});
test('live buy-card text retains readable contrast across the CSS cascade',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/',{waitUntil:'networkidle'});
 const lowContrast=await page.locator('.buy-tile').evaluateAll(tiles=>{
  const light=(color:string)=>{const rgb=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(n=>n/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
  return tiles.flatMap(tile=>{const bg=light(getComputedStyle(tile).backgroundColor);return [...tile.querySelectorAll('strong,.buy-discount,.buy-quote,.buy-listing,.buy-return-compact')].flatMap(el=>{const fg=light(getComputedStyle(el).color),ratio=(Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05);return ratio<4.5?[`${el.textContent}: ${ratio.toFixed(2)}`]:[];});});
 });
 expect(lowContrast).toEqual([]);
});

test('round ten market access, equal tiles, method and all buy pages',async({page})=>{
 await page.setViewportSize({width:1728,height:970});await page.goto('/',{waitUntil:'networkidle'});
 await expect(page.locator('.buy-tile')).toHaveCount(8);
 for(const tile of await page.locator('.buy-tile').all()){
  await expect(tile.locator('.buy-owner-return')).toContainText(/About [\d.]+% a year expected \([\d.]+% cash \+ [\d.]+% growth\) vs Buffett's 10% bar/);
  const [total,cash,growth]=(await tile.locator('.buy-owner-return').innerText()).match(/[\d.]+(?=%)/g)!.map(Number);
  expect(total).toBeGreaterThan(10);
  expect(Math.abs(total-cash-growth)).toBeLessThanOrEqual(.100001);
  await expect(tile.locator('.region-badge')).not.toBeEmpty();
 }
 const markets=page.getByRole('combobox',{name:'Markets'});await markets.click();await page.getByRole('option',{name:/Markets: Easy to buy/}).click();
 await expect(page).toHaveURL(/markets=easy/);await expect(page.locator('.buy-tile')).toHaveCount(2);
 await expect(page.locator('.buy-zone')).toContainText('Infosys');await expect(page.locator('.buy-zone')).toContainText('Jumbo');
 await markets.click();await page.getByRole('option',{name:'Markets: Asia',exact:true}).click();await expect(page.locator('.buy-tile')).toHaveCount(6);
 await page.getByRole('combobox',{name:'Sort',exact:true}).click();await page.getByRole('option',{name:'Sort: closest to buy price',exact:true}).click();
 await expect(page.locator('.company-treemap')).toHaveAttribute('data-sort','closest');
 const rects=await page.locator('.equal-company-grid > div').evaluateAll(es=>es.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));
 expect(rects.length).toBeGreaterThan(1);for(const r of rects){expect(Math.abs(r.w-rects[0].w)).toBeLessThan(1);expect(Math.abs(r.h-rects[0].h)).toBeLessThan(1);}
 const ratios=await page.locator('.equal-company-grid .map-price').allTextContents();const nums=ratios.map(s=>Number(s.match(/[\d.]+/)?.[0]));expect(nums).toEqual([...nums].sort((a,b)=>a-b));
 await page.getByRole('button',{name:'About the method ↗',exact:true}).click();await expect(page.locator('.method-summary li')).toHaveCount(5);await expect(page.locator('.method-summary')).toContainText('simulation');await expect(page.locator('[data-author-slot]')).toBeEmpty();
 await page.keyboard.press('Escape');await page.goto('/',{waitUntil:'networkidle'});await page.setViewportSize({width:390,height:844});await expect(page.locator('.buy-tile')).toHaveCount(8);
 await expect(page.getByRole('navigation',{name:'Buy-zone pages'})).toHaveCount(0);
 for(const tile of await page.locator('.buy-tile').all())await expect(tile).toBeInViewport();
});

test('round ten b shows Visa, Mastercard and P&G multiples and the same Infosys return on its dossier',async({page})=>{
 await page.setViewportSize({width:1728,height:970});await page.goto('/',{waitUntil:'networkidle'});
 for(const [id,multiple] of [['v.us','2.7'],['ma.us','3.3'],['pg.us','2.9']]){
  const tile=page.locator(`.company-tile[href="/${id}"]`);
  await expect(tile.locator('.map-price')).toContainText(`${multiple}x`);
  await expect(tile).not.toContainText('Value unavailable');
 }
 const infy=await page.locator('.buy-tile[href="/infy.us"] .buy-owner-return').innerText();
 await page.goto('/infy.us',{waitUntil:'networkidle'});
 await expect(page.locator('.price-card .owner-return')).toHaveText(infy);
 await page.getByTestId('tile-price').click();
 await expect(page.getByRole('dialog').locator('.owner-return')).toHaveText(infy);
 await page.goto('/ko.us',{waitUntil:'networkidle'});
 await expect(page.locator('.price-card .owner-return')).toHaveText("About 2.8% a year expected (2.6% cash + 0.2% growth) vs Buffett's 10% bar");
});
test('round ten owner returns, reference metrics, verdict colours and phone type',async({page})=>{
 const colours=[];
 for(const id of ['ko.us','infy.us','dal.us']){
  await page.setViewportSize({width:390,height:844});await page.goto('/'+id,{waitUntil:'networkidle'});
  await expect(page.locator('.price-card .owner-return')).toContainText(/About [\d.]+% a year expected \([\d.]+% cash \+ [\d.]+% growth\) vs Buffett's 10% bar/);
  await expect(page.locator('.reference-metrics')).toContainText('P/E');await expect(page.locator('.reference-metrics')).toContainText('Dividend yield');
  colours.push(await page.locator('.plain-verdict').evaluate(e=>getComputedStyle(e).color));
  for(const el of await page.locator('.price-card .owner-return,.price-card .owner-growth,.quality-section .tile-sentence').all())expect(await el.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(14);
  await page.getByRole('button',{name:'About the method ↗',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Expected yearly return is owner cash yield');await page.keyboard.press('Escape');
 }
 expect(new Set(colours).size).toBe(3);
});
