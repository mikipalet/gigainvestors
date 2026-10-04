import {expect,test} from '@playwright/test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
test.skip(!process.env.VALUE_POLISH,'Requires release-8.');
const root=process.env.VALUE_STORE_DIR!;
const aliases:Record<string,string>=root?JSON.parse(readFileSync(path.join(root,'aliases.json'),'utf8')):{};
for(const [width,height] of [[1728,970],[390,844]]){
 test(`Western state and URL, names and TSM search at ${width}`,async({page})=>{
  await page.setViewportSize({width,height});await page.goto('/');
  const toggle=page.getByRole('switch',{name:'Western markets',exact:true});
  await expect(toggle).toHaveAttribute('aria-checked','true');
  const western=await page.locator('.main-view').getAttribute('data-buy-count');
  await toggle.click();await expect(page).toHaveURL(/markets=all/);await expect(toggle).toHaveAttribute('aria-checked','false');
  await page.reload();await expect(toggle).toHaveAttribute('aria-checked','false');
  await toggle.click();await expect(page).not.toHaveURL(/markets=all/);await expect(toggle).toHaveAttribute('aria-checked','true');
  await expect(page.locator('.main-view')).toHaveAttribute('data-buy-count',western!);
  await page.goto('/?markets=all');await expect(toggle).toHaveAttribute('aria-checked','false');
  await page.goto('/jpm.us');await expect(page.getByRole('heading',{level:1})).toHaveText('JPMorgan Chase & Co.');
  await page.getByRole('button',{name:'Search companies',exact:true}).click();
  await page.getByRole('combobox',{name:'Search investor, firm, ticker, company'}).fill('TSM');
  const option=page.locator('#search-results [role=option]').filter({hasText:/Taiwan Semiconductor/});
  await expect(option.first()).toBeVisible();await option.first().click();await expect(page).toHaveURL(/2330.tw/);
 });
}
for(const id of ['tsm.us','infy.us','race.us','stla.us','asml.us'])test(`listing route contract: ${id}`,async({request})=>{
 const home=aliases[id.toUpperCase()];
 const response=await request.get('/'+id,{maxRedirects:0});
 if(home){expect(response.status()).toBe(308);expect(response.headers().location).toMatch(new RegExp('/'+home.toLowerCase().replaceAll('.','\\.')+'$'));expect((await request.get(response.headers().location)).status()).toBe(200);}
 else expect(response.status()).toBe(id==='stla.us'?404:200); // Stellantis remains in the reported undecided residual.
});
test('every published alias has a home dossier and returns 308',async({request})=>{
 test.setTimeout(120000);
 for(const [alias,home] of Object.entries(aliases)){
  const response=await request.get('/'+alias.toLowerCase(),{maxRedirects:0});
  expect(response.status(),alias).toBe(308);expect(response.headers().location,alias).toContain('/'+home.toLowerCase());
 }
});
test('partial-decade companies retain neutral dossiers after completion',async({page})=>{
 for(const id of ['8411.jp','stlam.mi']){
  const response=await page.goto('/'+id);expect(response?.status()).toBe(200);
  await expect(page.getByTestId('insufficient-data')).toContainText('Financial history');
  await expect(page.getByTestId('tile-price')).toHaveCount(0);
 }
});
