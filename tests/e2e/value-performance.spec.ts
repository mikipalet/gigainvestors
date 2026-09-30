import { expect,test } from '@playwright/test';
import { gzipSync } from 'node:zlib';
test.skip(process.env.VALUE_PERF_QA!=='1','Requires the complete local staging production build');
test('missing valuations use the neutral visual state',async({page})=>{
 await page.goto('/uri.us',{waitUntil:'networkidle'});
 const verdict=page.locator('.plain-verdict');
 await expect(verdict).toHaveText('Valuation unavailable');
 await expect(verdict).toHaveCSS('background-color','rgb(232, 231, 223)');
});
test('first paint is complete without price or third-party browser data requests',async({page})=>{
 for(const route of ['/', '/ko.us', '/?year=2018']){
  const requests:string[]=[];
  const listener=(r:import('@playwright/test').Request)=>{if(['fetch','xhr'].includes(r.resourceType()))requests.push(r.url());};
  page.on('request',listener);
  const response=await page.goto(route,{waitUntil:'networkidle'});
  if(route==='/')expect(gzipSync(await response!.body()).length).toBeLessThanOrEqual(100_000);
  if(route==='/ko.us')await expect(page.locator('.exact-prices')).not.toContainText('Price unavailable');
  if(route.includes('year'))await expect(page.locator('.main-view')).toHaveAttribute('data-frame','2018');
  expect(requests.filter(u=>/raw\.githubusercontent\.com|\/prices\/|\/index\/[A-Z]{2}\.json/.test(u))).toEqual([]);
  expect(await page.locator('link[rel=preload][as=font]').count()).toBe(1);
  page.off('request',listener);
 }
});
test('year requests are deduplicated, cached and within the wire budget',async({page})=>{
 const counts=new Map<string,number>();
 page.on('request',r=>{if(r.url().includes('/api/value/data/views/'))counts.set(r.url(),(counts.get(r.url())??0)+1);});
 await page.goto('/',{waitUntil:'networkidle'});
 await page.waitForTimeout(2500);
 const slider=page.getByRole('slider',{name:'Fiscal year'});
 for(const key of ['Home','ArrowRight','ArrowRight','ArrowLeft','End'])await slider.press(key);
 await expect(page.locator('.main-view')).toHaveAttribute('data-frame','Today');
 expect([...counts.values()].every(n=>n===1)).toBe(true);
 for(const url of [...counts.keys()].slice(0,5)){
  const response=await page.request.get(url);
  expect(response.headers()['cache-control']).toContain('immutable');
  const data=await response.json();
  // Current view has more cohorts; historical payloads are bounded at publication.
  if(data.columns.includes('pm'))expect(gzipSync(JSON.stringify(data)).length).toBeLessThanOrEqual(75_000);
 }
});
