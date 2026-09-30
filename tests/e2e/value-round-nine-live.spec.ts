import { expect,test } from '@playwright/test';
test.skip(process.env.VALUE_LIVE_QA!=='1','Run against the production build with live published data.');
const sizes=[[1728,970],[2056,1180],[390,844],[430,932],[820,1180],[1280,720],[1366,768],[1440,800],[1470,836],[1512,862],[1536,730],[1680,950],[1728,1000],[1920,960],[2560,1300]];
for(const [width,height] of sizes)
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
