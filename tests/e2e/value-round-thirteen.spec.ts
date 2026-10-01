import { expect,test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { audit } from '../../scripts/value/design-audit.mjs';
test.skip(process.env.VALUE_DESIGN_13!=='1','Requires release-5 local build.');
const store=process.env.VALUE_STORE_DIR??path.join(os.homedir(),'value-corpus/staging/release-5');
const history=()=>JSON.parse(readFileSync(path.join(store,'history/index.json'),'utf8')) as {years:number[];perYear:Record<number,{analysed:number}>};
for(const [width,height]of[[1728,970],[2056,1180],[390,844]]){
 test(`full-range timeline and uncluttered home at ${width}`,async({page})=>{
  await page.setViewportSize({width,height});await page.goto('/',{waitUntil:'networkidle'});
  const slider=page.getByRole('slider',{name:'Fiscal year'}),h=history();
  expect(h.years[0]).toBeLessThan(2016);expect(h.perYear[h.years[0]].analysed).toBeGreaterThanOrEqual(300);
  await expect(slider).toHaveAttribute('max',String(h.years.length-1));
  await expect(page.locator('.annual-tick')).toHaveCount(h.years.length);
  expect(await page.locator('.annual-track').evaluate(track=>{const badge=track.querySelector('output')!.getBoundingClientRect();return [...track.querySelectorAll('.annual-tick')].every(t=>{const r=t.getBoundingClientRect();return r.bottom<=badge.top||r.top>=badge.bottom;});})).toBe(true);
  await slider.press('Home');await expect(slider).toHaveAttribute('aria-valuetext',`Fiscal year ${h.years[0]}`);await expect(page).toHaveURL(new RegExp(`year=${h.years[0]}`));
  for(let i=1;i<h.years.length-1;i++){await slider.press('ArrowRight');await expect(slider).toHaveAttribute('aria-valuetext',`Fiscal year ${h.years[i]}`);}
  await slider.press('End');await expect(slider).toHaveAttribute('aria-valuetext','Today');await expect(page).not.toHaveURL(/year=/);
  for(let i=h.years.length-2;i>=0;i--){await slider.press('ArrowLeft');await expect(slider).toHaveAttribute('aria-valuetext',`Fiscal year ${h.years[i]}`);}await slider.press('End');
  await expect(page.locator('.simulation-line')).toHaveAttribute('aria-hidden','true');
  await expect(page.locator('.annual-tick span').filter({hasText:String(h.years.at(-1))})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Method',exact:true})).toHaveCount(1);
  const box=(await slider.boundingBox())!;await page.mouse.click(box.x+box.width*.2,box.y+box.height/2);await expect(slider).not.toHaveAttribute('aria-valuetext','Today');
  await page.mouse.move(box.x+box.width*.2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+box.height/2,{steps:10});await page.mouse.up();expect(Number(await slider.inputValue())).toBeGreaterThan(h.years.length*.6);
  await slider.press('End');await page.waitForTimeout(500);
  expect((await page.evaluate(audit)).issues).toEqual([]);
 });
 test(`each evidence and valuation tab fits at ${width}`,async({page})=>{
  await page.setViewportSize({width,height});await page.goto('/ko.us',{waitUntil:'networkidle'});
  for(const key of ['understandable','moat','economics','management','accounting','price']){
   await page.getByTestId('tile-'+key).click();
   const tabs=await page.getByRole('tab').allTextContents();
   for(const name of tabs){await page.getByRole('tab',{name,exact:true}).click();await page.waitForTimeout(80);expect((await page.evaluate(audit)).issues,`${key}/${name}`).toEqual([]);
    expect(await page.locator('dialog').evaluate(d=>[d,...d.querySelectorAll('*')].filter(e=>e.checkVisibility()&&/(auto|scroll)/.test(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight+2&&e.clientHeight>50).length)).toBe(0);
   }
   await page.getByRole('button',{name:'Close panel'}).click();
  }
 });
 test(`method, mobile filters and share status at ${width}`,async({page})=>{
  await page.setViewportSize({width,height});await page.goto('/',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Method',exact:true}).click();
  for(const name of await page.getByRole('tab').allTextContents()){await page.getByRole('tab',{name,exact:true}).click();expect((await page.evaluate(audit)).issues).toEqual([]);}
  await page.getByRole('button',{name:'Close panel'}).click();
  if(width<768)await page.getByRole('button',{name:'Filters',exact:true}).click();
  await page.getByRole('combobox',{name:'Country',exact:true}).click();await page.getByRole('combobox',{name:'Search Country'}).fill('ger');await page.getByRole('option').filter({hasText:'Germany'}).click();
  if(width<768)await page.locator('.filter-apply').click();await expect(page).toHaveURL(/country=DE/);
  await page.goto('/2330.tw',{waitUntil:'networkidle'});await expect(page.locator('body')).not.toContainText(/Verify valuation|Share count being checked|needs verification/i);await expect(page.locator('.exact-prices')).not.toContainText('Valuation unavailable');
 });
}
