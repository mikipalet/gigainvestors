import {expect,test} from '@playwright/test';
test.skip(process.env.VALUE_DESIGN_15!=='1','Requires the live-data density server.');
for(const [width,height] of [[1728,970],[2056,1180],[390,844]])for(const route of ['wkl.as','acn.us','jpm.us','cb.us','tsla.us','abnb.us']){
 test(`${route}: evidence, readable type and fit at ${width}`,async({page})=>{
  await page.setViewportSize({width,height});await page.goto('/'+route);
  await expect(page.locator('.quality-section .test-tile')).toHaveCount(5);
  await expect(page.getByRole('region',{name:'Key numbers'})).toBeVisible();
  for(const tile of await page.locator('.quality-section .test-tile').all())expect(await tile.locator('.tile-support>div').count()).toBeGreaterThanOrEqual(2);
  expect(await page.locator('.financial-strip .mini-series').count()).toBeGreaterThanOrEqual(3);
  const chart=page.locator('.mini-price .chart-hit-area');if(await chart.count()){await expect(page.locator('.valuation-math')).toBeVisible();await chart.focus();await chart.press('Home');
  await expect(page.getByRole('tooltip')).toContainText(route==='abnb.us'?'2021':'2016');
  await chart.press('End');await expect(page.getByRole('tooltip')).toContainText('2026');await chart.press('Escape');}
  const layout=await page.evaluate(()=>{
   const dossier=document.querySelector('.one-dossier')!.getBoundingClientRect(),dock=document.querySelector('.value-dock')!.getBoundingClientRect();
   const small:string[]=[];const walker=document.createTreeWalker(document.querySelector('main')!,NodeFilter.SHOW_TEXT);
   while(walker.nextNode()){const n=walker.currentNode,e=n.parentElement!;if(n.textContent?.trim()&&e.checkVisibility({visibilityProperty:true})&&!e.closest('.sr-only')&&parseFloat(getComputedStyle(e).fontSize)<13)small.push(n.textContent);}
   return {small,width:document.documentElement.scrollWidth,mainBottom:dossier.bottom,dockTop:dock.top};
  });
  expect(layout.small).toEqual([]);expect(layout.width).toBe(width);
  if(width>767)expect(layout.mainBottom).toBeLessThanOrEqual(layout.dockTop+1);
 });
}
for(const [width,height] of [[1728,970],[2056,1180],[390,844]])test(`short history preserves real figures without quality scores at ${width}`,async({page})=>{
 await page.setViewportSize({width,height});await page.goto('/arm.us');
 await expect(page.getByTestId('insufficient-data')).toContainText('6 annual periods');
 await expect(page.locator('.quality-section')).toHaveCount(0);
 await expect(page.locator('.financial-strip-short .chart-hit-area')).toHaveCount(4);
 const chart=page.locator('.financial-strip-short .chart-hit-area').first();await chart.focus();await chart.press('Home');await expect(page.getByRole('tooltip')).toContainText('2021');await chart.press('End');await expect(page.getByRole('tooltip')).toContainText('2026');
});
