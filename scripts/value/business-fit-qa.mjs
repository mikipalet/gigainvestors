import {audit} from './design-audit.mjs';
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync,statfsSync} from 'node:fs';
const [base='http://localhost:3117',out='/Users/miki/value-corpus/business-fit']=process.argv.slice(2);
const paths=['googl.us','aapl.us','ko.us','lulu.us','wkl.as','jpm.us','cbg.lse','7203.jp','reliance.nse','race.mi'];
const sizes=[[1728,970],[1440,800],[2056,1180]];
const report=[];mkdirSync(out,{recursive:true});const browser=await chromium.launch();
try{for(const [width,height] of sizes)for(const id of paths){
 const disk=statfsSync('/');if(disk.bavail*disk.bsize<5*1024**3)throw Error('DISK STOP: below 5 GiB');
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(`${base}/${id}`,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 const geometry=await page.evaluate(()=>{
  const rect=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height}};
  const tiles=[...document.querySelectorAll('.quality-section .test-tile')];
  const clipped=tiles.flatMap(t=>[...t.children].filter(c=>{const r=rect(c),p=rect(t);return r.bottom>p.bottom+1||r.right>p.right+1||r.left<p.left-1}).map(c=>c.className));
  const judgement=[...document.querySelectorAll('.judgement-compact strong')].map(e=>({text:e.textContent,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
  return {height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,clipped,judgement,business:[...document.querySelectorAll('.business-line')].map(e=>e.textContent)};
 });
 const issues=(await page.evaluate(audit)).issues; if(response.status()!==200)issues.push(`HTTP ${response.status()}`);if(geometry.height!==height)issues.push(`page height ${geometry.height} != ${height}`);if(geometry.width!==width)issues.push('horizontal overflow');if(geometry.clipped.length)issues.push('tile contents overflow');if(geometry.judgement.some(j=>j.height>22))issues.push('judgement wraps');
 await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
 await page.screenshot({path:`${out}/${id}-${width}x${height}-full.png`,fullPage:true});
 const lines=page.locator('.business-line');
 for(const text of await lines.locator('span:not(.sr-only)').allTextContents())if(text.trim().split(/\s+/).length>15)issues.push('business sentence exceeds 15 words');
 if(await page.locator('.test-tiles .numeric-reading').count())issues.push('numeric assessment remains on page');
 if(await lines.count()){
  await lines.first().hover();issues.push(...(await page.evaluate(audit)).issues.map(i=>`hover: ${i}`));await page.screenshot({path:`${out}/${id}-${width}x${height}-hover.png`});
  await lines.first().click();await page.getByRole('dialog',{name:'The business, in depth'}).waitFor();await page.waitForTimeout(300);
  issues.push(...(await page.evaluate(audit)).issues.map(i=>`drawer: ${i}`));
  await page.screenshot({path:`${out}/${id}-${width}x${height}-drawer.png`});
 }

 report.push({id,width,height,...geometry,errors,issues});await page.close();
} }finally{await browser.close();writeFileSync(`${out}/geometry.json`,JSON.stringify(report,null,2));}
console.log(JSON.stringify(report.map(({id,width,height,issues,errors})=>({id,width,height,issues,errors})),null,2));
if(report.some(r=>r.issues.length||r.errors.length))process.exitCode=1;
