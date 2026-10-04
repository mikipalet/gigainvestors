// node scripts/value/all-drawers-clipping-regression.mjs BASE OUTPUT
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync,statfsSync} from 'node:fs';
import {audit} from './design-audit.mjs';

const [base='http://localhost:3976',out='/tmp/all-drawers']=process.argv.slice(2);
const sizes=(process.env.QA_VIEWPORTS??'1280x720,1366x768,1440x800,1536x864,1728x970,2056x1180,390x844').split(',').map(s=>s.split('x').map(Number));
const paths=(process.env.QA_PATHS??'/value,/value?q=2018Q3,/value?year=2011,/s/AAPL,/s/LULU,/s/ADBE,/s/GOOGL,/s/KO,/s/JPM').split(',');
const selectors=process.env.QA_BUTTONS??'.main-more,.table-toggle,.about-method,.tile-open,.holder-summary,.thesis-source-button,.business-open,.company-holders-strip,[data-testid=price-story-line]';
const results=[],widths=new Map();
mkdirSync(out,{recursive:true});
const browser=await chromium.launch();
try {
 for(const [width,height] of sizes)for(const path of paths){
  const disk=statfsSync('/');assert.ok(disk.bavail*disk.bsize>=4*1024**3,'DISK STOP');
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  try {
   await page.goto(base+path,{waitUntil:'networkidle'});
   const buttons=page.locator(selectors);
   for(let i=0;i<await buttons.count();i++){
    const button=buttons.nth(i);if(!await button.isVisible())continue;
    const name=await button.getAttribute('aria-label')||await button.innerText();
    // Programmatic opening isolates drawer geometry from pre-existing page hit-target failures.
    await button.evaluate(el=>el.click());
    const dialog=page.locator('dialog[open]');await dialog.waitFor();
    await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);
    await page.waitForFunction(()=>!document.querySelector('dialog[data-fitting],.panel-content[aria-busy=true],.compact-company-list[aria-busy=true]'));
    await page.waitForTimeout(350);await page.mouse.move(0,0);
    let pagination=0;
    do {
     const issues=[...(await page.evaluate(audit)).issues];
     const geometry=await dialog.evaluate(el=>{
      const content=el.querySelector('.panel-content'),r=el.getBoundingClientRect();
      const article=el.querySelector('.evidence-layout');
      const type=article?.dataset.test??(article?'price':el.querySelector('.method-sections')?'method':el.querySelector('.company-holders-panel')?'holders':null);
      const orphans=[...el.querySelectorAll('.method-sections h3,.method-sections h4')].flatMap(h=>{
       const next=h.nextElementSibling;if(!next)return [];
       const walker=document.createTreeWalker(next,NodeFilter.SHOW_TEXT);let node;
       while(walker.nextNode())if(walker.currentNode.textContent.trim()){node=walker.currentNode;break;}
       if(!node)return [];
       const range=document.createRange();range.selectNodeContents(node);
       const first=range.getClientRects()[0],heading=h.getBoundingClientRect();
       return first&&(first.left<heading.left-1||first.left>=heading.right||first.top<heading.top)?[h.textContent]:[];
      });
      return {type,width:r.width,top:r.top,bottom:r.bottom,contentHeight:content.clientHeight,scrollHeight:content.scrollHeight,orphans};
     });
     if(geometry.top!==0||geometry.bottom!==height)issues.push('drawer is not full height');
     if(width>=768&&geometry.scrollHeight>geometry.contentHeight+1)issues.push('desktop drawer overflows vertically');
     if(geometry.orphans.length)issues.push(...geometry.orphans.map(h=>`orphan heading: ${h}`));
     if(geometry.type){
      const key=`${width}x${height}-${geometry.type}`,previous=widths.get(key);
      if(previous!==undefined&&previous!==geometry.width)issues.push(`width differs across companies/routes: ${previous} / ${geometry.width}`);
      widths.set(key,geometry.width);
      if(geometry.type==='holders'&&geometry.width!==Math.min(560,width))issues.push('holders width changed');
     }
     if(width<768){
      for(let top=0;top<geometry.scrollHeight;top+=Math.floor(geometry.contentHeight*.8)){
       await page.locator('dialog[open] .panel-content').evaluate((el,top)=>el.scrollTop=top,top);
       issues.push(...(await page.evaluate(audit)).issues);
      }
      await page.locator('dialog[open] .panel-content').evaluate(el=>el.scrollTop=0);
     }
     const file=`${width}x${height}-${path.replace(/[^a-z0-9]/gi,'_')}-${i}-${pagination}.png`;
     await page.screenshot({path:`${out}/${file}`});
     results.push({width,height,path,name,pagination,geometry,issues:[...new Set(issues)],file});
     writeFileSync(`${out}/report.json`,JSON.stringify(results,null,2));
     console.log(`${width}x${height} ${path} ${name} [${pagination}]: ${issues.length?JSON.stringify([...new Set(issues)]):'PASS'}`);
     const next=dialog.locator('.company-holders-panel nav button').last();
     if(!await next.count()||!await next.isEnabled())break;
     await next.click();await page.waitForTimeout(200);pagination++;
    }while(pagination<30);
    await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
   }
  }finally{await page.close();}
 }
}finally{await browser.close();writeFileSync(`${out}/report.json`,JSON.stringify(results,null,2));}
assert.ok(results.length,'No drawers tested');
assert.equal(results.filter(r=>r.issues.length).length,0,'Every drawer must fit, with headings attached to content');
