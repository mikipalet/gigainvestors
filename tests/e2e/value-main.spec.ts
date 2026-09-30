import { expect,test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { audit } from '../../scripts/value/design-audit.mjs';
test.setTimeout(120000);
test.skip(process.env.RELEASE_QA!=='1','Requires release-5 staging.');
const store=process.env.VALUE_STORE_DIR??path.join(os.homedir(),'value-corpus/staging/release-5');
const earliest=()=>JSON.parse(readFileSync(path.join(store,'history/index.json'),'utf8')).years[0];
for(const [width,height] of [[1728,970],[2056,1180],[390,844]])for(const route of ['/', '/?markets=all', '/?year=2018','earliest']){
 test(`main ${route} ${width}×${height}`,async({page})=>{
  await page.setViewportSize({width,height});await page.goto(route==='earliest'?`/?year=${earliest()}`:route,{waitUntil:'networkidle'});
  await expect(page.locator('.main-view')).toBeVisible();
  expect(await page.locator('.main-buy-row').evaluateAll(nodes=>{const values=nodes.map(n=>Number((n as HTMLElement).dataset.return));return values.every((v,i)=>i===0||values[i-1]>=v);})).toBe(true);
  await expect(page.getByRole('navigation',{name:'Visualization'})).toHaveCount(0);
  await expect(page.locator('.main-view .company-monogram')).toHaveCount(0);
  expect(await page.locator('.main-company[data-priority=true]').count()).toBeLessThanOrEqual(1);
  expect((await page.evaluate(audit)).issues).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const ratios=await page.locator('.main-next-row').evaluateAll(nodes=>nodes.map(n=>Number((n as HTMLElement).dataset.ratio)));expect(ratios).toEqual([...ratios].sort((a,b)=>a-b));
  if(route==='/'){
   const under=page.locator('.main-next-row').filter({hasText:'below'});
   for(const row of await under.all()){const value=Number(await row.getAttribute('data-return'));expect(value).toBeLessThan(.1);expect(value).toBeGreaterThan(0);}
   const buys=Number(await page.locator('.main-view').getAttribute('data-buy-count'));
   if(width>=1728&&buys>0&&buys<=3){const columns=page.locator('.main-next-column');expect(await columns.count()).toBeLessThanOrEqual(3);for(const column of await columns.all())expect(await column.locator('.main-next-row').count()).toBeGreaterThan(0);}
  }
  if(route.includes('year')||route==='earliest')await expect(page.locator('.simulation-line')).toContainText(`FY${route==='earliest'?earliest():2018} simulation`);
 });
}
test('pointer, keyboard, paginated lists, filter, history and dossier',async({page})=>{
 await page.goto('/',{waitUntil:'networkidle'});
 const pick=page.locator('.main-buy-row').first();await pick.focus();await expect(page.getByRole('tooltip')).toContainText('Buy price');await expect(page.getByRole('tooltip')).toContainText('Expected return/yr');await page.keyboard.press('Escape');await expect(page.getByRole('tooltip')).toHaveCount(0);
 await pick.click();await expect(page.locator('.one-dossier')).toBeVisible();
 await page.goto('/',{waitUntil:'networkidle'});
 for(const band of ['middle','far']){
  await page.locator(`[data-band=${band}] .main-band-title`).click();const panel=page.getByRole('dialog');
  const ratios=await panel.locator('.main-list-row').evaluateAll(nodes=>nodes.map(n=>Number((n as HTMLElement).dataset.ratio)));
  expect(ratios.every(n=>band==='middle'?n>1.5&&n<=3:n>3)).toBe(true);
  await panel.locator('.main-list-row').first().focus();await expect(panel.getByRole('tooltip')).toContainText('Buy price');await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 }
 await page.getByRole('button',{name:'All companies'}).click();await expect(page.getByTestId('results-table')).toBeVisible();await page.keyboard.press('Escape');
 await page.goto('/?year=2018',{waitUntil:'networkidle'});await page.locator('.main-next-row').first().focus();await expect(page.getByRole('tooltip')).toContainText('Price in 2018');await page.keyboard.press('Escape');
 const slider=page.getByRole('slider',{name:'Fiscal year'});await slider.press('ArrowRight');await expect(page.locator('.simulation-line')).toContainText('FY2019');
 await page.goto('/?q=Microsoft',{waitUntil:'networkidle'});await expect(page.locator('.main-no-buys')).toBeVisible();
});
test('mobile buy pagination exposes all picks',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/?markets=all',{waitUntil:'networkidle'});
 const total=Number(await page.locator('.main-view').getAttribute('data-buy-count'));
 const ids=new Set(await page.locator('.main-buy-row').evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).dataset.company)));
 const more=page.locator('.main-buys .main-more');
 if(await more.count()){
  await more.click();
  for(;;){for(const id of await page.locator('dialog .main-list-row').evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).dataset.company)))ids.add(id);
   expect((await page.evaluate(audit)).issues).toEqual([]);
   const next=page.getByRole('button',{name:'Next detail page'});if(!await next.count()||await next.isDisabled())break;await next.click();
  }
 }
 expect(ids.size).toBe(total);
});
test('failed logos leave no blank slots and release width to Next closest',async({page})=>{
 await page.setViewportSize({width:1728,height:970});
 await page.route('**/*',route=>route.request().resourceType()==='image'?route.fulfill({status:404,body:''}):route.continue());
 await page.goto('/',{waitUntil:'networkidle'});
 await expect.poll(()=>page.locator('.main-logo-strip img').count()).toBe(0);
 await expect(page.locator('.main-logo-strip .company-logo-empty')).toHaveCount(0);
 expect((await page.locator('.main-rest').boundingBox())!.width).toBeLessThanOrEqual(190);
 expect(await page.locator('.main-next-column').count()).toBeLessThanOrEqual(3);
});
