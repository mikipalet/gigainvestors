import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
test.skip(process.env.VALUE_LIVE_QA!=='1','Requires the production build and live data.');
const shots='/tmp/claude-1000/value-shots/design-10c/final';
for(const [width,height] of [[1728,970],[390,844]])test(`polish live QA ${width}x${height}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height});await mkdir(shots,{recursive:true});
 for(const route of ['/','/dal.us','/ko.us']){
  await page.goto(route,{waitUntil:'networkidle'});
  expect(await page.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight}))).toEqual({w:width,h:height});
  if(route==='/'){
   await expect(page.locator('.buy-tile')).toHaveCount(8);
   for(const tile of await page.locator('.buy-tile').all()){
    await expect(tile).toBeInViewport({ratio:1});
    expect(await tile.locator('.buy-owner-return').textContent()).toMatch(/About \d+\.\d% a year expected \(\d+\.\d% cash \+ \d+\.\d% growth\)/);
   }
   await expect(page.getByRole('navigation',{name:'Buy-zone pages'})).toHaveCount(0);
   const clipped=await page.locator('.buy-tile').evaluateAll(tiles=>tiles.flatMap(tile=>{const box=tile.getBoundingClientRect();return [...tile.children].filter(child=>{const r=child.getBoundingClientRect();return r.width>0&&r.height>0&&(r.bottom>box.bottom+1||r.right>box.right+1);}).map(child=>child.textContent);}));
   expect(clipped).toEqual([]);
  }else{
   await expect(page.locator('.price-card .owner-return')).toContainText(/About -?\d+\.\d% a year expected/);
   if(route==='/dal.us'){
    const tile=page.getByTestId('tile-understandable');
    await expect(tile).toContainText('Margins swing wildly, including losses.');
    await expect(tile).toContainText('>100%');
    await expect(tile).not.toContainText('936%');
    if(width>=768)await expect(tile.locator('.mini-series figcaption')).toBeVisible();
    const chart=tile.locator('.mini-series svg');
    await expect(chart).toHaveAttribute('aria-label','Operating margin by fiscal year');
    const line=await chart.locator('path[stroke="currentColor"]').getAttribute('d');
    expect(line?.match(/L/g)?.length).toBeGreaterThanOrEqual(5);
    expect(line?.match(/M/g)).toHaveLength(1);
   }
  }
  await page.screenshot({path:`${shots}/${route==='/'?'index':route.slice(1)}-${width}x${height}.png`,fullPage:true});
  if(route!=='/'){
   await page.getByTestId('tile-understandable').click();
   await expect(page.getByRole('dialog')).toBeVisible();
   if(route==='/dal.us')await expect(page.getByRole('dialog')).toContainText('>100%');
   await page.keyboard.press('Escape');
  }
 }
 expect(errors).toEqual([]);
});
