import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
test.beforeEach(async({page})=>{await page.route('https://raw.githubusercontent.com/mikipalet/gigainvestors-value-data/main/**',async route=>{
 const file=new URL(route.request().url()).pathname.split('/main/')[1];
 try{await route.fulfill({contentType:'application/json',body:await readFile(path.resolve('tests/fixtures/value/store',file),'utf8')});}catch{await route.fulfill({status:404,body:'{}'});}
});});
for (const [width,height] of [[390,844],[1280,800],[1440,900],[1920,1080]]) {
 test(`one screen and evidence panels at ${width}`,async({page})=>{
  await page.setViewportSize({width,height});
  for(const path of ['/value','/value/ko.us','/value/nope.us']){
   await page.goto(path,{waitUntil:'networkidle'});
   expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(height);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  }
  await page.goto('/value/ko.us',{waitUntil:'networkidle'});
  for(let i=1;i<=6;i++){
   await page.keyboard.press(String(i));
   await expect(page.getByRole('dialog')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(height);
   await page.keyboard.press('Escape');
   await expect(page.getByRole('dialog')).toHaveCount(0);
  }
 });
}
