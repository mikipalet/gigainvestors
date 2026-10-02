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
test('search is the shared gigainvestors modal, not a drawer',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Search companies',exact:true}).click();
 await expect(page.locator('.search-modal')).toBeVisible();
 await expect(page.locator('dialog[open]')).toHaveCount(0);
 await page.locator('.search-modal input').fill('Wolters');
 await expect(page.locator('.search-modal')).toContainText('Wolters');
});
