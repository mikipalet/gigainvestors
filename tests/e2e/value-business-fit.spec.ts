import {test,expect} from '@playwright/test';
test.skip(process.env.VALUE_BUSINESS_FIT!=='1','Uses the local validated business overview corpus.');
for(const [width,height] of [[1728,970],[1440,800],[2056,1180]])for(const id of ['googl.us','aapl.us','ko.us','lulu.us','wkl.as','jpm.us','cbg.lse','7203.jp','reliance.nse','race.mi']){
 test(`${id} stays within one screen at ${width}x${height}`,async({page})=>{
  await page.setViewportSize({width,height});await page.goto('/'+id,{waitUntil:'networkidle'});
  const lines=page.locator('.business-line');expect(await lines.count()).toBeGreaterThan(0);expect(await lines.count()).toBeLessThanOrEqual(6);
  for(const text of await lines.locator('span:not(.sr-only)').allTextContents())expect(text.trim().split(/\s+/).length).toBeLessThanOrEqual(15);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(height);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  await expect(page.locator('.test-tiles .numeric-reading')).toHaveCount(0);
  expect(await page.locator('.quality-section .test-tile').evaluateAll(tiles=>tiles.every(tile=>[...tile.children].every(child=>child.getBoundingClientRect().bottom<=tile.getBoundingClientRect().bottom+1)))).toBe(true);
  expect(await page.locator('.judgement-compact strong').evaluateAll(lines=>lines.every(line=>line.getBoundingClientRect().height<=22))).toBe(true);
  await lines.first().click();const dialog=page.getByRole('dialog',{name:'The business, in depth'});await expect(dialog).toBeVisible();
  await expect(dialog.locator('blockquote').first()).toBeAttached();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(lines.first()).toBeFocused();
 });
}
