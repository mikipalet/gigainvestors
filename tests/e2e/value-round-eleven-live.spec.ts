import { expect,test } from '@playwright/test';
test.skip(process.env.VALUE_LIVE_QA!=='1','Needs live published data.');
test('long filters search, count, navigate, escape and recover from no matches',async({page})=>{
 await page.goto('/',{waitUntil:'networkidle'});
 await page.getByRole('combobox',{name:'Country',exact:true}).click();
 const input=page.getByRole('combobox',{name:'Search Country',exact:true});
 await expect(input).toBeFocused();await input.fill('united');
 await expect(page.getByRole('option')).toHaveCount(2);
 await expect(page.getByRole('option').first().locator('.option-count')).toHaveText(/\d/);
 await input.press('ArrowDown');await input.press('Enter');await expect(page).toHaveURL(/country=US/);
 await page.getByRole('combobox',{name:'Country',exact:true}).click();await input.fill('no such country');
 await expect(page.getByRole('status')).toHaveText('No matches');await input.press('Enter');await expect(input).toBeVisible();
 await input.press('Escape');await expect(input).toHaveCount(0);await expect(page.getByRole('combobox',{name:'Country',exact:true})).toBeFocused();
 await page.getByRole('combobox',{name:'Sector',exact:true}).click();await expect(page.getByRole('combobox',{name:'Search Sector',exact:true})).toBeFocused();
});
const sizes=[[1728,970],[2056,1180],[390,844],[430,932],[820,1180],[1280,720],[1366,768],[1440,800],[1470,836],[1512,862],[1536,730],[1680,950],[1728,1000],[1920,960],[2560,1300]];
async function smallText(page:import('@playwright/test').Page){return page.evaluate(()=>{
 const bad:string[]=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){const n=walker.currentNode,e=n.parentElement;if(!n.textContent?.trim()||!e||e.closest('.sr-only,nextjs-portal')||!e.checkVisibility({visibilityProperty:true,opacityProperty:true}))continue;
 const r=e.getBoundingClientRect();if(!r.width||!r.height)continue;let size=parseFloat(getComputedStyle(e).fontSize);
 if(e instanceof SVGTextElement){const matrix=e.getScreenCTM();if(matrix)size*=Math.hypot(matrix.a,matrix.b);}
 if(size<12.9)bad.push(`${n.textContent.trim().slice(0,45)}: ${size.toFixed(1)}px`);
 }return bad;
});}
for(const [width,height] of sizes)test(`type floor and one-screen layout at ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['/','/ko.us','/infy.us','/dal.us']){
  await page.goto(route,{waitUntil:'networkidle'});
  expect(await page.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight}))).toEqual({w:width,h:height});
  expect(await smallText(page),route).toEqual([]);await expect(page.locator('select')).toHaveCount(0);
 }expect(errors).toEqual([]);
});
test('method, evidence, search and missing-company recovery retain readable type',async({page})=>{
 for(const width of [390,1728]){await page.setViewportSize({width,height:width===390?844:970});
 await page.goto('/method',{waitUntil:'networkidle'});expect(await smallText(page)).toEqual([]);
 await page.goto('/nope.us',{waitUntil:'networkidle'});expect(await smallText(page)).toEqual([]);
 await page.goto('/6101.two',{waitUntil:'networkidle'});expect(await smallText(page)).toEqual([]);await expect(page.getByTestId('insufficient-data')).toBeVisible();for(const label of await page.locator('.insufficient-dossier .test-tile header > span').all())await expect(label).toBeVisible();
 await page.goto('/ko.us',{waitUntil:'networkidle'});
 for(let i=1;i<=6;i++){await page.keyboard.press(String(i));await expect(page.getByRole('dialog')).toBeVisible();expect(await smallText(page),`panel ${i}`).toEqual([]);await page.keyboard.press('Escape');}
 await page.getByRole('button',{name:'Search companies',exact:true}).click();await page.getByRole('combobox').fill('Infosys');await expect(page.getByRole('option').first()).toBeVisible();expect(await smallText(page)).toEqual([]);await page.keyboard.press('Escape');
 }
});
test('phone filters support search and escape without dismissing their panel',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/',{waitUntil:'networkidle'});await page.getByRole('button',{name:/Filter companies/}).click();
 await page.getByRole('combobox',{name:'Country',exact:true}).click();const input=page.getByRole('combobox',{name:'Search Country'});await input.fill('japan');await expect(page.getByRole('option')).toHaveCount(1);await input.press('Escape');await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('company list keeps the type floor and exposes names through search',async({page})=>{
 await page.goto('/',{waitUntil:'networkidle'});await page.getByRole('button',{name:/^Show all \d+/}).click();await expect(page.getByTestId('results-table')).toBeVisible();expect(await smallText(page)).toEqual([]);
});
test('live buy dossier keeps its verdict emphasis and readable value charts',async({page})=>{
 for(const [width,height] of [[390,844],[1280,720],[1728,970]]){
  await page.setViewportSize({width,height});await page.goto('/9906.jp',{waitUntil:'networkidle'});
  await expect(page.locator('.plain-verdict')).toHaveText('Buy zone');expect(await smallText(page)).toEqual([]);
  await page.getByTestId('tile-price').click();expect(await smallText(page)).toEqual([]);await expect(page.getByRole('dialog')).toContainText('required return 10.0%');await page.keyboard.press('Escape');
 }
});
