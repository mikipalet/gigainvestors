import {readFileSync} from 'node:fs';
import path from 'node:path';
import {unpackView} from '../../lib/value/browser-view';
import {expect,test} from '@playwright/test';
import {audit} from '../../scripts/value/design-audit.mjs';
test.skip(!process.env.VALUE_STORE_DIR,'Requires the complete local staging data.');
test.setTimeout(90000);
for(const [width,height] of [[1728,970],[2056,1180],[390,844]])for(const route of ['/','/?markets=all','/?year=2018','/?year=2008']){
 test(`Shelf+ ${route} ${width}x${height}`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height});await page.goto(route,{waitUntil:'networkidle'});
  const view=page.locator('.main-view');await expect(view).toBeVisible();
  const buys=Number(await view.getAttribute('data-buy-count'));
  await expect(page.locator('.shelf-hero')).toHaveCount(buys?1:0);
  if(buys===0)await expect(page.locator('.main-empty-buy')).toBeVisible();
  if(buys===1)await expect(page.locator('.main-buy-row')).toHaveCount(1);
  await expect(page.getByRole('navigation',{name:'Visualization'})).toHaveCount(0);
  await expect(view.locator('svg')).toHaveCount(0);
  const ratios=await page.locator('.main-next-row').evaluateAll(nodes=>nodes.map(n=>Number((n as HTMLElement).dataset.ratio)));
  expect(ratios).toEqual([...ratios].sort((a,b)=>a-b));
  expect(await page.locator('.main-next-row .main-return').allTextContents()).not.toContain('—');
  expect(await view.locator('[data-priority=true]').count()).toBeLessThanOrEqual(1);
  expect((await page.evaluate(audit)).issues).toEqual([]);expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const layout=await page.locator('.shelf-near-grid').evaluate(el=>({columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,rows:getComputedStyle(el).gridTemplateRows.split(' ').length}));
  if(width===390)expect(layout.columns).toBe(2);
  if(width===1728&&buys>0){expect(layout.rows).toBeGreaterThanOrEqual(3);expect(layout.rows).toBeLessThanOrEqual(4);}
  expect(await page.locator('h1').evaluate(el=>el.getBoundingClientRect().height<=parseFloat(getComputedStyle(el).lineHeight)+1)).toBe(true);
  const small=await view.evaluate(el=>[...el.querySelectorAll('*')].filter(e=>e.checkVisibility()&&e.textContent?.trim()&&parseFloat(getComputedStyle(e).fontSize)<13).map(e=>e.className));expect(small).toEqual([]);
  const negative=await page.locator('.main-return[data-negative=true]').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).color===getComputedStyle(document.querySelector('.main-view')!).color));expect(negative).toBe(true);
  const read=(file:string)=>JSON.parse(readFileSync(path.join(process.env.VALUE_STORE_DIR!,file),'utf8'));
  const meta=read('meta.json'),year=new URL(route,'http://localhost').searchParams.get('year');
  const rows=new Map(unpackView(read(year?meta.views.years[year]:meta.views.current)).map(row=>[row.id,row]));
  for(const card of await page.locator('.main-next-row').all()){
   const row=rows.get((await card.getAttribute('data-company'))!)!;expect(row).toBeDefined();
   const quality=row.quality,metric=card.locator('.shelf-quality');
   await expect(metric).toHaveCount(quality?1:0);
   if(quality){
    await expect(metric).toHaveText(`${quality.label} 10y ${quality.value==='unlimited'||quality.value>1?'>100%':`${Math.round(quality.value*100)}%`}`);
    if(width>767)await expect(metric).toBeVisible();
   }
  }
 });
}
test('pointer tooltip, keyboard dossier, lists and filters',async({page})=>{
 await page.goto('/',{waitUntil:'networkidle'});
 const card=page.locator('.main-next-row').first();await card.hover();await expect(page.getByRole('tooltip')).toContainText('Buy below');
 const box=(await card.boundingBox())!;await page.mouse.move(box.x+15,box.y+15);const tip=(await page.getByRole('tooltip').boundingBox())!;expect(Math.abs(tip.x-(box.x+15))).toBeLessThan(350);
 await card.focus();await page.keyboard.press('Escape');await expect(page.getByRole('tooltip')).toHaveCount(0);await page.keyboard.press('Enter');await expect(page.locator('.one-dossier')).toBeVisible();
 await page.goto('/',{waitUntil:'networkidle'});await page.locator('.main-rest .main-more').click();await expect(page.getByRole('dialog')).toBeVisible();await page.locator('dialog .main-list-row').first().focus();await expect(page.getByRole('dialog').getByRole('tooltip')).toBeVisible();await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'All companies'}).click();await expect(page.getByTestId('results-table')).toBeVisible();await page.keyboard.press('Escape');
 await page.goto('/?q=Microsoft',{waitUntil:'networkidle'});await expect(page.locator('.main-no-buys')).toBeVisible();
});
test('historical glide, rapid scrubbing, year buttons and URL restoration',async({page})=>{
 await page.goto('/?year=2018',{waitUntil:'networkidle'});const view=page.locator('.main-view');await expect(view).toHaveAttribute('data-frame','2018');
 await page.locator('.main-next-row').first().focus();await expect(page.getByRole('tooltip')).toContainText('Gain since then');await page.keyboard.press('Escape');
 const slider=page.getByRole('slider',{name:'Fiscal year'});await slider.press('ArrowRight');await expect(view).toHaveAttribute('data-frame','2019');
 const durations=await view.evaluate(el=>el.getAnimations({subtree:true}).map(a=>Number(a.effect?.getTiming().duration)));expect(durations.every(d=>d<=400)).toBe(true);
 const rapid=await slider.evaluate(async el=>{
  const input=el as HTMLInputElement,current=Number(input.value),set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
  for(const value of [current+1,current]){set.call(input,String(value));input.dispatchEvent(new Event('input',{bubbles:true}));}
  await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));const root=document.querySelector('.main-view') as HTMLElement;
  return {fast:root.dataset.fast,animations:root.getAnimations({subtree:true}).length};
 });expect(rapid).toEqual({fast:'true',animations:0});await expect(view).toHaveAttribute('data-fast','false');
 await page.getByRole('button',{name:'Next year',exact:true}).click();await expect(view).toHaveAttribute('data-frame','2020');
 await expect(page).toHaveURL(/year=2020/);await page.reload({waitUntil:'networkidle'});await expect(view).toHaveAttribute('data-frame','2020');
 await page.getByRole('button',{name:'Previous year',exact:true}).click();await expect(view).toHaveAttribute('data-frame','2019');
 await slider.press('End');await expect(view).toHaveAttribute('data-frame','Today');await expect(page.getByRole('button',{name:'Next year',exact:true})).toBeDisabled();
});
test('phone tap opens the dossier and controls do not intersect the slider',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});const page=await context.newPage();await page.goto(process.env.BASE_URL!+'/',{waitUntil:'networkidle'});
 const slider=(await page.getByRole('slider',{name:'Fiscal year'}).boundingBox())!,controls=(await page.locator('.dock-tools').boundingBox())!;
 expect(controls.x+controls.width<=slider.x||slider.x+slider.width<=controls.x||controls.y+controls.height<=slider.y||slider.y+slider.height<=controls.y).toBe(true);
 await page.locator('.shelf-hero').tap();await expect(page.locator('.one-dossier')).toBeVisible();await context.close();
});
test('failed rest logos leave no blank slots',async({page})=>{
 await page.route('**/*',route=>route.request().resourceType()==='image'?route.fulfill({status:404,body:''}):route.continue());await page.goto('/',{waitUntil:'networkidle'});
 await expect.poll(()=>page.locator('.main-logo-strip a').count(),{timeout:15000}).toBe(0);
});
