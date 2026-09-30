import {expect,test,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type {IndexRow} from '@/lib/value/types';

test.skip(process.env.VALUE_DESIGN_12!=='1','Requires local release-3 build and data server.');
const sizes=[[1728,970],[2056,1180],[390,844]];
const store=process.env.VALUE_STORE_DIR??path.join(os.homedir(),'value-corpus/staging/release-3');
async function oneScreen(page:Page,width:number,height:number){
 expect(await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}))).toEqual({width,height});
}
for(const [width,height] of sizes){
 test(`natural card slots, paging and freed treemap width at ${width}x${height}`,async({page})=>{
  await page.setViewportSize({width,height});
  // An eight-card first page from the real global population is the size baseline.
  await page.goto('/?markets=all',{waitUntil:'networkidle'});
  const baseline=(await page.locator('.buy-tile').first().boundingBox())!;
  const waiting=(await page.locator('.waiting-zone').boundingBox())!;
  for(const [country,count] of [['PL',1],['JP',2],['ID',3],['US',0]] as const){
   await page.goto(`/?markets=all&country=${country}`,{waitUntil:'networkidle'});
   await expect(page.locator('.buy-zone')).toHaveAttribute('data-count',String(count));
   await expect(page.locator('.buy-tile[data-priority=true]')).toHaveCount(count?1:0);
   await oneScreen(page,width,height);
   if(count){
    const box=(await page.locator('.buy-tile').first().boundingBox())!;
    expect(Math.abs(box.width-baseline.width)).toBeLessThan(1);
    expect(Math.abs(box.height-baseline.height)).toBeLessThan(1);
    if(width>=1100)expect((await page.locator('.waiting-zone').boundingBox())!.width).toBeGreaterThan(waiting.width);
   }
  }
  // release-2/3 have 14 global picks. Explicit fixtures exercise 8/17 total,
  // including the one-card final page, without changing staged financial data.
  const rows=JSON.parse(readFileSync(path.join(store,'index/default.json'),'utf8')) as IndexRow[];
  const buys=rows.filter(r=>r.b);
  for(const count of [8,17]){
   const picks=Array.from({length:count},(_,i)=>({...buys[i%buys.length],id:`QA${i}.US`}));
   await page.route('**/release-3/index/CN.json',route=>route.fulfill({json:[...picks,...rows.filter(r=>!r.b)]}));
   await page.goto('/?markets=all&country=CN',{waitUntil:'networkidle'});
   await expect(page.locator('.buy-zone')).toHaveAttribute('data-count',String(count));
   const seen:number[]=[];
   while(true){
    for(const card of await page.locator('.buy-tile').all()){
     seen.push(Number(await card.getAttribute('data-rank')));
     const box=(await card.boundingBox())!;
     expect(Math.abs(box.width-baseline.width)).toBeLessThan(1);
     expect(Math.abs(box.height-baseline.height)).toBeLessThan(1);
    }
    await oneScreen(page,width,height);
    const next=page.getByRole('button',{name:'Next buy-zone companies'});
    if(!await next.count()||await next.isDisabled())break;
    await next.click();
   }
   expect(seen).toEqual(Array.from({length:count},(_,i)=>i+1));
   await page.unroute('**/release-3/index/CN.json');
  }
 });
 test(`short history is neutral, with real logos and no filler at ${width}x${height}`,async({page})=>{
  await page.setViewportSize({width,height});
  for(const id of ['race.mi','eni.mi']){
   await page.goto('/'+id,{waitUntil:'networkidle'});
   const verdict=page.locator('.plain-verdict');await expect(verdict).toHaveText('Not enough history yet');
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

test('country picker and markets toggle produce the real staging counts',async({page})=>{
 await page.goto('/',{waitUntil:'networkidle'});
 await expect(page.locator('.buy-zone')).toHaveAttribute('data-count','1');
 await page.getByRole('switch',{name:'Show all markets'}).click();
 await expect(page.locator('.buy-zone')).toHaveAttribute('data-count','14');
 for(const [name,count] of [['Japan','2'],['Indonesia','3'],['Poland','1'],['United States','0']]){
  await page.getByRole('combobox',{name:'Country',exact:true}).click();
  await page.getByRole('combobox',{name:'Search Country',exact:true}).fill(name);
  await page.getByRole('option',{name:new RegExp(name)}).click();
  await expect(page.locator('.buy-zone')).toHaveAttribute('data-count',count);
 }
});

test('short history stays neutral in treemap, tooltip and company table',async({page})=>{
 await page.goto('/?markets=all&country=IT&awaiting=1&q=Ferrari',{waitUntil:'networkidle'});
 const tile=page.locator('.company-tile').filter({hasText:'Ferrari'});
 await expect(tile.locator('.map-verdict')).toHaveText('Not enough history yet');
 await tile.hover();await expect(page.getByRole('tooltip')).toContainText('Not enough history yet');
 await expect(page.getByRole('tooltip')).not.toContainText('fails');
 await page.getByRole('button',{name:'Show all 1 ↗',exact:true}).click();
 const row=page.locator('[data-company-row]').filter({hasText:'Ferrari'});
 await expect(row).toContainText('Not enough history yet');await expect(row).not.toContainText('Fails quality');
});
