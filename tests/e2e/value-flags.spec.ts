import {test,expect} from '@playwright/test';
import {audit} from '../../scripts/value/design-audit.mjs';
test.skip(process.env.VALUE_FLAGS!=='1','Uses the local flags validation corpus.');
for(const [width,height]of [[1728,970],[390,844]])for(const id of ['orcl.us','googl.us','nvda.us','ko.us','lulu.us']){
 test(`${id}: single business section and drawer at ${width}x${height}`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width,height});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/'+id,{waitUntil:'networkidle'});const section=page.getByTestId('the-business');await expect(section).toHaveCount(1);
  const lines=section.locator('.business-lines>li:visible');expect(await lines.count()).toBeLessThanOrEqual(width<500?3:6);
  await expect(page.getByRole('heading',{name:'Flags',exact:true})).toHaveCount(0);
  const flag=section.locator('.business-line[data-tone]').first();const hasSummary=await flag.count()>0;const opener=hasSummary?flag:section.locator('.business-open');await expect(opener).toBeVisible();if(hasSummary){await flag.focus();await expect(section.getByRole('tooltip').filter({visible:true})).toHaveCount(1);}
  await opener.click();const dialog=page.getByRole('dialog',{name:'The business, in depth'});await expect(dialog).toBeVisible();await expect(dialog.getByRole('tab')).toHaveCount(0);
  await expect(dialog.getByRole('region',{name:'Flags by theme'})).toBeAttached();await expect(dialog.getByRole('heading',{name:'Relationships disclosed in filings'})).toBeAttached();
  const selected=hasSummary?dialog.locator('.flag-detail[data-selected=true]'):dialog.locator('.flag-detail').first();if(hasSummary)await expect(selected).toBeInViewport();await expect(selected.locator('blockquote').first()).not.toBeEmpty();await expect(selected.getByRole('link').first()).toHaveAttribute('href',/^https:\/\//);
  const links=dialog.getByRole('list',{name:'Disclosed relationships list'}).getByRole('button');if(await links.count()){await links.first().click();await expect(dialog.locator('.relationship-evidence blockquote,.relationship-evidence p').first()).not.toBeEmpty();}
  await dialog.locator('.panel-shell').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>{})));});
  expect((await page.evaluate(audit)).issues).toEqual([]);
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();expect(errors).toEqual([]);
  if(width>1500){expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(height+1);expect(await page.locator('.test-tile').evaluateAll(tiles=>tiles.every(tile=>[...tile.children].every(child=>child.getBoundingClientRect().bottom<=tile.getBoundingClientRect().bottom+1)))).toBe(true);}
 });
}
