import{audit}from'../../../../scripts/value/design-audit.mjs';import{chromium}from'@playwright/test';import{writeFileSync}from'node:fs';
const browser=await chromium.launch(),results=[];
for(const [width,height]of (process.env.QA_VIEWPORTS??'1728x970,2056x1180,1440x800,390x844').split(',').map(s=>s.split('x').map(Number)))for(const route of(process.env.QA_PATHS??'/value,/value?q=2018Q3,/s/AAPL,/s/KO,/s/7203.JP').split(',')){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
 await page.addInitScript(()=>{window.events=[];new PerformanceObserver(list=>window.events.push(...list.getEntries().filter(e=>e.interactionId).map(e=>({name:e.name,duration:e.duration,processing:e.processingEnd-e.processingStart,delay:e.processingStart-e.startTime})))).observe({type:'event',durationThreshold:16,buffered:true});});
 await page.goto('http://localhost:3066'+route,{waitUntil:'networkidle'});await page.waitForTimeout(1000);
 const buttons=page.locator('.main-more,.table-toggle,.about-method,.tile-open,.holder-summary,.thesis-source-button,.business-open,.company-holders-strip');
 for(let i=0;i<await buttons.count();i++){
  const button=buttons.nth(i);if(!await button.isVisible())continue;
  const name=await button.getAttribute('aria-label')||await button.innerText();await page.evaluate(()=>window.events=[]);await button.click();await page.locator('dialog[open]').waitFor();await page.waitForLoadState('networkidle');await page.waitForTimeout(500);
  await page.locator('dialog[open] .panel-content[aria-busy=false]').waitFor();if(await page.locator('.compact-company-list').count())await page.locator('.compact-company-list[aria-busy=false]').waitFor();await page.waitForFunction(()=>!document.querySelector('dialog[open][data-fitting]'));const geometry=await page.evaluate(audit);const events=await page.evaluate(()=>window.events);results.push({width,height,route,name,issues:geometry.issues,max:Math.max(0,...events.map(e=>e.duration)),events});writeFileSync(process.argv[2]??'.int6/perf-drawers.json',JSON.stringify(results,null,2));
  await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'detached'});await page.waitForTimeout(200);
 }
 await page.close();
}
await browser.close();console.log(JSON.stringify({states:results.length,max:Math.max(...results.map(x=>x.max)),failures:results.filter(x=>x.max>100),geometryFailures:results.filter(x=>x.issues.length)}));
