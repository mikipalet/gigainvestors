import {expect,test} from '@playwright/test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
test.skip(process.env.VALUE_PERF_QA!=='1','Requires the local complete staging build');
const meta=()=>JSON.parse(readFileSync(path.join(process.env.VALUE_STORE_DIR!,'meta.json'),'utf8'));
for(const route of ['/', '/?year=2018','/?markets=all','/?year=2018&markets=all'])test(`bounded idle transfers ${route}`,async({page})=>{
 const views:string[]=[],images:string[]=[];
 page.on('request',r=>{if(r.url().includes('/data/views/'))views.push(r.url().split('/data/')[1]);if(r.resourceType()==='image')images.push(r.url());});
 await page.goto(route,{waitUntil:'networkidle'});await page.waitForTimeout(3200);
 const m=meta(),historical=route.includes('year=');
 const neighbors=!historical?[m.views.years['2025']]:[m.views.years['2017'],m.views.years['2019']];
 expect(views.every(file=>neighbors.includes(file))).toBe(true);
 expect(views.length).toBeLessThanOrEqual(neighbors.length);
 expect(images.length).toBeLessThanOrEqual(40);
 for(const file of views)expect(gzipSync(readFileSync(path.join(process.env.VALUE_STORE_DIR!,file))).length).toBeLessThan(80_000);
 const transfer=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>['fetch','img'].includes((e as PerformanceResourceTiming).initiatorType)).reduce((n,e)=>n+(e as PerformanceResourceTiming).transferSize,0));
 expect(transfer).toBeLessThanOrEqual(historical?150_000:250_000);
 await expect(page.locator('h1')).toBeVisible();
 await page.getByRole('slider',{name:'Fiscal year'}).press(historical?'End':'ArrowLeft');
 if(!historical)await page.getByRole('slider',{name:'Fiscal year'}).press('End');
 await expect(page.locator('.main-view')).toHaveAttribute('data-frame','Today');
 expect(views.filter(file=>file===m.views.current)).toHaveLength(0);
});
for(const connection of [{saveData:true,effectiveType:'4g'},{effectiveType:'2g'},{effectiveType:'3g'}])test(`no speculative data on ${JSON.stringify(connection)}`,async({page})=>{
 await page.addInitScript(connection=>Object.defineProperty(navigator,'connection',{value:connection,configurable:true}),connection);
 const requests:string[]=[];page.on('request',r=>{if(r.url().includes('/api/value/data/'))requests.push(r.url());});
 await page.goto('/',{waitUntil:'networkidle'});await page.waitForTimeout(3200);
 expect(requests).toEqual([]);
 await page.getByRole('slider',{name:'Fiscal year'}).press('ArrowLeft');
 await expect(page.locator('.main-view')).toHaveAttribute('data-frame','2025');
 expect(requests).toHaveLength(1);
});
test('mobile reserves row geometry before hydration',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{(window as any).shifts=[];new PerformanceObserver(l=>(window as any).shifts.push(...l.getEntries().filter((e:any)=>!e.hadRecentInput).map((e:any)=>e.value))).observe({type:'layout-shift',buffered:true});});
 await page.goto('/',{waitUntil:'networkidle'});await page.waitForTimeout(2000);
 expect(await page.evaluate(()=>(window as any).shifts.reduce((a:number,b:number)=>a+b,0))).toBeLessThan(.02);
 const next=await page.locator('.main-next').boundingBox(),rest=await page.locator('.main-rest').boundingBox();
 expect(rest!.y-next!.y-next!.height).toBeLessThanOrEqual(20);
});
for(const [width,height] of [[1728,970],[2056,1180],[390,844]])test(`Shelf+ reserves geometry at ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});
 await page.addInitScript(()=>{(window as any).shifts=[];new PerformanceObserver(l=>(window as any).shifts.push(...l.getEntries().filter((e:any)=>!e.hadRecentInput).map((e:any)=>e.value))).observe({type:'layout-shift',buffered:true});});
 await page.goto('/',{waitUntil:'networkidle'});
 expect(await page.evaluate(()=>(window as any).shifts.reduce((a:number,b:number)=>a+b,0))).toBe(0);
});
