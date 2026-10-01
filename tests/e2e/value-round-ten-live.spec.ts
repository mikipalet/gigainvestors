import { expect,test } from '@playwright/test';
test.skip(process.env.VALUE_LIVE_QA!=='1','Run against the production build with live published data.');
test('live phone price panels expose readable history and both data tables',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const id of ['ko.us','infy.us','dal.us']){
  await page.goto('/'+id,{waitUntil:'networkidle'});
  await page.getByTestId('tile-price').click();
  const history=page.getByTestId('price-history');await history.scrollIntoViewIfNeeded();
  await expect(history).toContainText('Price and estimated value per share, USD');
  await history.getByText('Show value data',{exact:true}).click();
  await expect(history.getByRole('table',{name:'Fiscal-year value ranges'})).toBeVisible();
  await history.getByText('Show price data',{exact:true}).click();
  await expect(history.getByRole('table',{name:'Monthly closing prices'})).toBeVisible();
  expect(await page.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight}))).toEqual({w:390,h:844});
 }
});
test('round ten owner returns, reference metrics, verdict colours and phone type',async({page})=>{
 const colours=[];
 for(const id of ['ko.us','infy.us','dal.us']){
  await page.setViewportSize({width:390,height:844});await page.goto('/'+id,{waitUntil:'networkidle'});
  await expect(page.locator('.price-card .owner-return')).toContainText(/About [\d.]+% a year expected \([\d.]+% cash \+ [\d.]+% growth\) vs required return [\d.]+% a year \((?:10% floor; )?[A-Z]{2} 10-year bond [\d.]+% \+ 4 points\)/);
  await expect(page.locator('.reference-metrics')).toContainText('P/E');await expect(page.locator('.reference-metrics')).toContainText('Dividend yield');
  colours.push(await page.locator('.plain-verdict').evaluate(e=>getComputedStyle(e).color));
  for(const el of await page.locator('.price-card .owner-return,.price-card .owner-growth,.quality-section .tile-sentence').all())expect(await el.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(14);
  await page.getByRole('button',{name:'About the method ↗',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Expected yearly return is owner cash yield');await page.keyboard.press('Escape');
 }
 expect(new Set(colours).size).toBe(3);
});
