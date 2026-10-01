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
