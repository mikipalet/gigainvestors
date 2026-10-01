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
  if(await management.count())expect(await management.locator('.tile-sentence').innerText()).not.toMatch(/[≤≥;]|applied checks|Judgement override/);
 }
});

test('capital return drawer uses excluding-acquisitions summaries and keeps supporting observations visible',async({page})=>{
 await page.goto('/wkl.as');const tileValues=await page.getByTestId('tile-moat').locator('.tile-support dd').allTextContents();await page.getByRole('button',{name:'Open Lasting advantage evidence'}).click();
 expect((await page.locator('.drawer-numbers dd').allTextContents()).slice(0,3)).toEqual(tileValues);
 await expect(page.getByRole('tab')).toHaveCount(0);
 const values=await page.locator('.drawer-years tbody td:nth-of-type(2)').allTextContents();
 expect(values).toContain('>100%');
 await expect(page.locator('.drawer-years thead')).toContainText('ROIC ex. acq.');
 await expect(page.locator('.filing-quotes a')).toHaveAttribute('href',/^https:/);
});
