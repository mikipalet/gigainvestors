import {test,expect} from '@playwright/test';
import {audit} from '../../scripts/value/design-audit.mjs';
test.skip(process.env.VALUE_BUSINESS_THREE!=='1','Needs the local corpus staging build');
for(const viewport of [{width:1728,height:970},{width:2056,height:1180},{width:1440,height:800},{width:390,height:844}]){
 test(`shared panels and memo evidence ${viewport.width}`,async({page})=>{
  await page.setViewportSize(viewport);await page.goto('/adbe.us');
  const section=page.getByTestId('the-business');await expect(section).toBeVisible();
  for(const answer of await section.locator('dd button').all())expect((await answer.innerText()).trim().split(/\s+/).length).toBeLessThanOrEqual(18);
  await section.locator('.business-open').click();const panel=page.getByRole('dialog');
  await expect(panel).toBeVisible();const r=await panel.boundingBox();expect(r!.y).toBe(0);expect(r!.height).toBe(viewport.height);if(viewport.width<768)expect(r!.width).toBe(viewport.width);
  await expect(panel.locator('details,[role=tab]')).toHaveCount(0);
  await panel.locator('[popoverTarget]').first().click();await expect(panel.locator(':popover-open')).toBeVisible();
  await page.keyboard.press('Escape');await expect(panel).not.toBeVisible();
 });
}
test('Alphabet cannot pass cash conversion below 0.8',async({page})=>{
 await page.goto('/googl.us');await expect(page.getByTestId('tile-economics')).toContainText('fail');
 await expect(page.getByTestId('tile-economics')).not.toContainText('Judgement: passes');
});
test('empty search offers a directory and a company preview',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Search companies',exact:true}).click();
 const results=page.getByRole('navigation',{name:'Company results'}).getByRole('button');
 await expect(results.first()).toBeVisible();
 await expect(results.last()).toBeInViewport();
 await expect(page.locator('.search-preview')).toBeVisible();
 await page.getByRole('textbox',{name:'Search company or ticker'}).fill('Wolters');
 await expect(page.locator('.search-preview>header')).toContainText('Wolters');
});

for(const [width,height] of [[1728,970],[2056,1180],[1440,800]]){
 test(`search fits after memo summaries load at ${width}`,async({page})=>{
  await page.setViewportSize({width,height});
  await page.goto('/lulu.us',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Search companies',exact:true}).click();
  const panel=page.getByRole('dialog');
  await expect(panel.locator('.search-result-summary').first()).toBeVisible();
  await panel.evaluate(async el=>{await document.fonts.ready;await Promise.all(el.getAnimations({subtree:true}).map(animation=>animation.finished));});
  for(const query of ['', 'Wolters']){
   await panel.getByRole('textbox',{name:'Search company or ticker'}).fill(query);
   await page.waitForLoadState('networkidle');
   await expect(panel.getByRole('navigation',{name:'Company results'}).getByRole('button').last()).toBeInViewport();
   expect((await page.evaluate(audit)).issues).toEqual([]);
  }
 });
}
