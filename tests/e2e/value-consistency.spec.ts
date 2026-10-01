import {test,expect} from '@playwright/test';
import {audit} from '../../scripts/value/design-audit.mjs';
test.skip(process.env.VALUE_AUDIT!=='1','Uses the audited local corpus.');
for(const width of [1728,390])test(`compact lists sort and fit at ${width}`,async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width,height:970});await page.goto('/?markets=all',{waitUntil:'networkidle'});await page.locator('.main-view[aria-busy=false]').waitFor();
 for(const button of await page.locator('.main-more,.table-toggle').all()){
  await button.click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  for(const name of ['Company','Return / yr','Price to buy','ROIC / ROE']){
   const header=dialog.locator('thead th').filter({hasText:name});await header.getByRole('button').click();await expect(header).not.toHaveAttribute('aria-sort','none');
   if(name==='Return / yr'||name==='Price to buy'){
    const key=name==='Return / yr'?'return':'ratio';const numbers=await dialog.locator('tbody tr').evaluateAll((rows,key)=>rows.map(r=>(r as HTMLElement).dataset[key]).filter(v=>v!==''&&v!==undefined).map(Number),key);
    const ascending=await header.getAttribute('aria-sort')==='ascending';expect(numbers).toEqual([...numbers].sort((a,b)=>ascending?a-b:b-a));
   }
  }
  await expect(dialog.locator('.compact-needs').first()).toBeVisible();await expect(dialog.locator('.company-logo').first()).toBeVisible();
  const empty=await dialog.evaluate(el=>{const r=el.getBoundingClientRect();let bottom=0;for(const child of el.querySelectorAll('*')){if(child.children.length||!child.checkVisibility())continue;const b=child.getBoundingClientRect();if(b.width>2&&b.height>2)bottom=Math.max(bottom,b.bottom-r.top);}return 100*(1-bottom/r.height);});
  expect(empty).toBeLessThan(8);expect((await page.evaluate(audit)).issues).toEqual([]);await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
 }
});
test('Lululemon tile/drawer share ROIC, years, units and visible key numbers',async({page})=>{
 await page.goto('/lulu.us');const tile=page.getByTestId('tile-moat');const chart=tile.locator('[data-series]');const series=await chart.getAttribute('data-series'),currency=await chart.getAttribute('data-currency');const values=await tile.locator('.tile-support dd').allTextContents();
 await tile.locator('.tile-open').click();const drawer=page.locator('dialog');await expect(drawer.locator('[data-series]')).toHaveAttribute('data-series',series!);await expect(drawer.locator('[data-series]')).toHaveAttribute('data-currency',currency!);expect((await drawer.locator('.drawer-numbers dd').allTextContents()).slice(0,3)).toEqual(values);
 await page.keyboard.press('Escape');await expect(page.locator('[data-financial=netCash] [data-series]')).toBeVisible();
});

test('return, price verdict and quality-rule text agree on the reviewed pages',async({page})=>{
 for(const id of ['googl.us','ko.us','aapl.us','lulu.us','wkl.as','acn.us']){
  await page.goto('/'+id);await expect(page.locator('.reference-metrics')).toContainText("a year at today's price (needs 10.0%)");
  const math=page.locator('.valuation-math');await expect(math).toContainText('Cash-flow inputs');await expect(math).not.toContainText('cash +');
  const sentence=await page.getByTestId('tile-moat').locator('.tile-sentence').innerText();expect(sentence).toContain('ROIC ex acquisitions median');expect(sentence).toContain('one bad year allowed');
  await page.getByRole('button',{name:'Open Lasting advantage evidence'}).click();await expect(page.locator('.panel-answer')).toHaveText(sentence);await expect(page.locator('.applied-rules')).toContainText('Gross-margin drop');
  await page.keyboard.press('Escape');
 }
 await page.goto('/ko.us');await expect(page.locator('.business-lines')).not.toContainText('Has paid dividends');
});

test('cash-covered prices explain why no finite annual IRR exists',async({page})=>{
 await page.goto('/apo.us');await expect(page.locator('.reference-metrics')).toContainText('Excess cash covers price · no finite IRR');
 await expect(page.locator('.valuation-math')).toContainText('The return hurdle is met.');
 await page.getByRole('button',{name:'Open valuation'}).click();await expect(page.locator('.drawer-numbers')).toContainText('Cash covers price');await expect(page.locator('dialog')).toContainText('no finite annual IRR');
});

test('method explains return using the valuation cash flows',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Method',exact:true}).click();
 await expect(page.locator('dialog')).toContainText('discounts the same future cash flows');await expect(page.locator('dialog')).not.toContainText('cash yield plus capped growth');
});
