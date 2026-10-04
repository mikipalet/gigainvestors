import { expect,test,type Page } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

test.skip(process.env.VALUE_DESIGN_12!=='1','Requires local release-3 build and data server.');
const sizes=[[1728,970],[2056,1180],[390,844]];
const store=process.env.VALUE_STORE_DIR??path.join(os.homedir(),'value-corpus/staging/release-3');
async function oneScreen(page:Page,width:number,height:number){
 expect(await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}))).toEqual({width,height});
}
for(const [width,height] of sizes){
 test(`short history is neutral, with real logos and no filler at ${width}x${height}`,async({page})=>{
  await page.setViewportSize({width,height});
  for(const id of ['race.mi','eni.mi']){
   await page.goto('/'+id,{waitUntil:'networkidle'});
   const verdict=page.locator('.plain-verdict');await expect(verdict).toHaveText('Financial history');
   expect(await verdict.evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(232, 231, 223)');
   await expect(page.locator('.company-about')).toHaveCount(0);
   const logo=page.locator('.company-heading .company-logo img');await expect(logo).toBeVisible();
   await expect.poll(()=>logo.evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>0)).toBe(true);
   for(const key of ['understandable','moat','economics','management']){
    const tile=page.getByTestId('tile-'+key);await expect(tile).toHaveClass(/unclear/);await expect(tile).toContainText('Not tested: only 7 years');
   }
   await oneScreen(page,width,height);
   await page.getByTestId('tile-understandable').click();await expect(page.getByRole('dialog')).toContainText('Not tested: only 7 years');
   await expect(page.getByRole('dialog').locator('[aria-label$=": fail"]')).toHaveCount(0);
   await page.keyboard.press('Escape');
  }
  await page.goto('/dal.us',{waitUntil:'networkidle'});await expect(page.locator('.plain-verdict')).toHaveText('Fails quality');
 });
}
