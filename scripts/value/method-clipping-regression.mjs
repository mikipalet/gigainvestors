// node scripts/value/method-clipping-regression.mjs BASE [OUTPUT]
// Reproduces columns escaping the viewport, including the links at the end.
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync,statfsSync} from 'node:fs';
import {audit} from './design-audit.mjs';
const [base='http://localhost:3966',out='/tmp/method-regression']=process.argv.slice(2);
const sizes=(process.env.QA_VIEWPORTS??'1280x720,1366x768,1440x800,1536x864,1728x970,2056x1180,390x844').split(',').map(s=>s.split('x').map(Number));
const paths=['/value','/value?q=2018Q3','/s/AAPL','/value/method'];
const browser=await chromium.launch(),results=[];
mkdirSync(out,{recursive:true});
try {
 for(const [width,height] of sizes) {
  let fixedWidth;
  for(const path of paths) {
   const disk=statfsSync('/');assert.ok(disk.bavail*disk.bsize>=4*1024**3,'DISK STOP');
   const page=await browser.newPage({viewport:{width,height}});
   await page.goto(base+path,{waitUntil:'networkidle'});
   await page.getByRole('button',{name:'Method',exact:true}).click();
   await page.locator('.method-sections').waitFor();
   await page.waitForFunction(()=>!document.querySelector('dialog[data-fitting]'));
   await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
   const result=await page.evaluate(audit);
   const geometry=await page.locator('dialog[open]').evaluate(el=>{
    const content=el.querySelector('.panel-content'),method=el.querySelector('.method-sections'),r=el.getBoundingClientRect();
    return {width:r.width,top:r.top,bottom:r.bottom,contentHeight:content.clientHeight,scrollHeight:content.scrollHeight,methodWidth:method.clientWidth,scrollWidth:method.scrollWidth};
   });
   const issues=[...result.issues];
   if(fixedWidth!==undefined&&fixedWidth!==geometry.width)issues.push('Method width changed across routes');fixedWidth=geometry.width;
   if(width>=768&&geometry.scrollHeight>geometry.contentHeight+1)issues.push('desktop content overflows vertically');
   if(geometry.scrollWidth>geometry.methodWidth+1)issues.push('Method columns overflow horizontally');
   if(geometry.top!==0||geometry.bottom!==height)issues.push('Method is not full height');
   if(width<768){
    await page.screenshot({path:`${out}/${width}x${height}-${path.replace(/[^a-z0-9]/gi,'_')}-top.png`});
    const scrollHeight=geometry.scrollHeight;
    for(let top=0;top<scrollHeight;top+=Math.floor(geometry.contentHeight*.8)){
     await page.locator('.panel-content').evaluate((el,top)=>el.scrollTop=top,top);
     issues.push(...(await page.evaluate(audit)).issues);
    }
    await page.locator('.panel-content').evaluate(el=>el.scrollTop=el.scrollHeight);
    const link=await page.getByRole('link',{name:'Full method ↗',exact:true}).boundingBox();
    if(!link||link.y+link.height>height)issues.push('Full method cannot be reached');
   }
   await page.screenshot({path:`${out}/${width}x${height}-${path.replace(/[^a-z0-9]/gi,'_')}.png`});
   results.push({width,height,path,geometry,issues});console.log(`${width}x${height} ${path}: ${issues.length?JSON.stringify(issues):'PASS'}`);
   await page.close();
  }
 }
 // Keep Method open while crossing layout breakpoints in both width and height.
 const page=await browser.newPage();
 await page.goto(base+'/value',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Method',exact:true}).click();
 await page.locator('.method-sections').waitFor();
 await page.evaluate(()=>document.fonts.ready);
 for(const width of [1280,1366,1440,1536,1728,2056])for(const height of [720,768,800,849,850,864,969,970,1179,1180]){
  await page.setViewportSize({width,height});
  const {issues}=await page.evaluate(audit);
  results.push({width,height,path:'/value',resized:true,issues});
 }
 await page.close();
} finally {await browser.close();writeFileSync(`${out}/report.json`,JSON.stringify(results,null,2));}
assert.equal(results.flatMap(r=>r.issues).length,0,'Method must fit without cut text or desktop scrolling');
