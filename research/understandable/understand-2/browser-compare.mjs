import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const results=[];
const browser=await chromium.launch();
try {
 for(let run=1;run<=5;run++)for(const [arm,port] of [['master',3049],['candidate',3048]]) {
  const context=await browser.newContext({viewport:{width:1728,height:970},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],failedRequests=[];page.setDefaultTimeout(15000);
  page.on('pageerror',e=>errors.push({message:e.message,stack:e.stack}));
  page.on('requestfailed',r=>failedRequests.push({url:new URL(r.url()).pathname,error:r.failure()?.errorText}));
  const record={arm,run,errors,failedRequests};
  try {
   const response=await page.goto(`http://127.0.0.1:${port}/s/nflx.us`,{waitUntil:'networkidle',timeout:90000});
   record.status=response.status();
   record.tile=await page.locator('[data-testid=tile-understandable]').innerText();
   await page.locator('[data-testid=tile-understandable] .tile-open').click({timeout:15000});
   await page.locator('dialog[open]').waitFor();
   record.drawerOpened=true;
   record.drawerText=await page.locator('dialog[open]').innerText();
   await page.getByRole('button',{name:'Close panel',exact:true}).click();
   record.drawerClosed=await page.locator('dialog[open]').count()===0;
  } catch(e) {record.failure=e.message;}
  results.push(record);console.log(arm,run,JSON.stringify({status:record.status,errors:errors.length,drawerOpened:record.drawerOpened,failure:record.failure}));
  await context.close();
 }
} finally {
 await browser.close();
 writeFileSync('research/understandable/outputs/understand-2/browser-compare.json',JSON.stringify(results,null,2)+'\n');
}
if(results.length!==10||results.some(r=>r.errors.length||r.failure||r.status!==200||!r.drawerOpened||!r.drawerClosed))process.exitCode=1;
