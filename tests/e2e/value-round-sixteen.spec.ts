import {expect,test} from '@playwright/test';
import {dossierPaths,gapPhrases} from '../../scripts/value/design-cases.mjs';
import {audit} from '../../scripts/value/design-audit.mjs';
test.skip(process.env.VALUE_DESIGN_16!=='1','Requires the live dossier server.');
for(const [width,height] of [[1728,970],[2056,1180],[390,844]])for(const route of ['/',...dossierPaths])test(`${route} fits and has no gap copy at ${width}`,async({page})=>{
 await page.setViewportSize({width,height});await page.goto(route);await page.locator('.main-view,.one-dossier').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(400);
 expect(await page.locator('body').innerText()).not.toMatch(gapPhrases);
 expect((await page.evaluate(audit) as {issues:string[]}).issues).toEqual([]);
 for(const quality of await page.locator('.shelf-quality b').all()) {const value=(await quality.innerText()).trim();expect(value==='>100%'||parseFloat(value)<=100).toBe(true);}
 if(route!=='/'){
  await expect(page.locator('.price-card .exact-prices,.price-card .owner-return')).toHaveCount(0);
  const management=page.getByTestId('tile-management');
  if(await management.count())expect(await management.locator('.tile-sentence').innerText()).toMatch(/^\$?-?\d/);
 }
});

test('capital return drawer caps summaries and keeps exact annual observations visible',async({page})=>{
 await page.goto('/wkl.as');await page.getByRole('button',{name:'Open Lasting advantage evidence'}).click();
 await expect(page.locator('.drawer-numbers')).toContainText('>100%');
 await expect(page.getByRole('tab')).toHaveCount(0);
 const values=await page.locator('.drawer-years tbody td:first-of-type').allTextContents();
 expect(values.some(v=>parseFloat(v)>100)).toBe(true);
 expect(values.join(' ')).not.toContain('>100%');
 await expect(page.locator('.filing-quotes a')).toHaveAttribute('href',/^https:/);
});
