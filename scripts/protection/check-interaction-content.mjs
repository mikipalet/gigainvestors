// Verify that responsive modal opening still mounts usable content and restores focus.
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const [origin,out]=process.argv.slice(2);
if(!origin||!out)throw Error('Expected origin and evidence directory');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),report=[];
try{
 for(const [width,height] of [[1728,970],[1440,800],[390,844]]){
  const context=await browser.newContext({viewport:{width,height},extraHTTPHeaders:{'x-vercel-skip-toolbar':'1'}});
  if(new URL(origin).hostname.endsWith('.vercel.app')){
   if(!process.env.VERCEL_AUTOMATION_BYPASS_SECRET)throw Error('Missing Preview automation credential');
   const auth=await context.request.get(origin,{headers:{'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET,'x-vercel-set-bypass-cookie':'true'}});
   if(!auth.ok())throw Error('Preview authentication failed');
  }
  const page=await context.newPage();await page.goto(origin+'/value',{waitUntil:'networkidle'});
  const slider=page.getByRole('slider',{name:'Quarter',exact:true});
  await slider.press('ArrowLeft');await page.waitForFunction(()=>document.querySelector('.main-view')?.getAttribute('data-frame')!=='Today'&&document.querySelector('.main-view')?.getAttribute('aria-busy')==='false');
  await slider.press('End');await page.waitForFunction(()=>document.querySelector('.main-view')?.getAttribute('data-frame')==='Today'&&document.querySelector('.main-view')?.getAttribute('aria-busy')==='false');
  for(const name of ['All companies','Method']){
   const button=page.getByRole('button',{name:name==='All companies'?/All companies/:name,exact:name==='Method'}).first();
   await button.click();await page.waitForFunction(()=>{const c=document.querySelector('dialog[open] .panel-content');return c?.getAttribute('aria-busy')==='false'&&c.textContent.trim().length>100;});
   await page.waitForTimeout(2000);
   const result=await page.locator('dialog[open]').evaluate(el=>{const c=el.querySelector('.panel-content'),r=el.getBoundingClientRect();return {open:el.open,contentCharacters:c.textContent.trim().length,contentBusy:c.getAttribute('aria-busy'),withinViewport:r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1};});
   if(!result.withinViewport)throw Error('Modal extends outside viewport');
   await page.screenshot({path:`${out}/${width}-${name.replaceAll(' ','-')}.png`});
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
   const focusRestored=await button.evaluate(el=>el===document.activeElement);
   if(!focusRestored)throw Error('Modal did not restore focus');
   report.push({width,height,name,...result,focusRestored});
  }
  await context.close();
 }
}finally{await browser.close();writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));}
console.log(`${report.length}/6 modal content/focus checks passed; quarter-back/Today passed on all 3 viewports`);
