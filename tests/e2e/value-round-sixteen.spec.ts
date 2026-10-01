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

test('capital return drawer caps summaries and keeps exact observations in Data',async({page})=>{
 await page.goto('/wkl.as');await page.getByRole('button',{name:'Open Lasting advantage evidence'}).click();
 await page.getByRole('tab',{name:'Measures',exact:true}).click();
 await expect(page.locator('.measure-row').first()).toContainText('>100%');
 await page.getByRole('tab',{name:'Data',exact:true}).click();await page.locator('.data-series select').selectOption('roic');
 const values=await page.locator('.data-pair b').allTextContents();
 expect(values.some(v=>Number(v.replaceAll(',',''))>1)).toBe(true);
 expect(values.join(' ')).not.toContain('>100%');
});

test('capital returns in filing notes use the same cap',async({page})=>{
 await page.goto('/wkl.as');await page.getByRole('button',{name:'Open Value created per $1 kept evidence'}).click();
 await page.getByRole('tab',{name:'Filing',exact:true}).click();
 await page.getByRole('button',{name:'Next detail page'}).click();await page.getByRole('button',{name:'Next detail page'}).click();
 await expect(page.locator('.evidence-list')).toContainText('ROIC first 3 years vs last 3 years: >100% vs >100%');
});
