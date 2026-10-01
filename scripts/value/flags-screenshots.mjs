import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync,statfsSync} from 'node:fs';
import {join} from 'node:path';
const corpusPath=p=>join(process.env.VALUE_CORPUS_DIR??'/Users/miki/value-corpus',p);
const diskGuard=()=>{const s=statfsSync('/');if(s.bavail*s.bsize<5e9)throw new Error('Disk below 5 GB');};
import {audit} from './design-audit.mjs';
async function main(){
 const browser=await chromium.launch(),out=corpusPath('flags/screenshots');diskGuard();mkdirSync(out,{recursive:true});const report=[];
 try{for(const [width,height]of [[1728,970],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<500});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const id of process.env.FLAGS_SCREENSHOT_IDS?.split(',')??['orcl.us','googl.us','nvda.us','ko.us','lulu.us']){
   diskGuard();await page.goto(`http://localhost:3118/${id}`,{waitUntil:'networkidle',timeout:90000});await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
   const prefix=`${out}/${id}-${width}x${height}`;
   const snap=async(state)=>{diskGuard();await page.waitForTimeout(280);await page.locator('.panel-shell').evaluateAll(async els=>{await Promise.all(els.flatMap(el=>el.getAnimations()).map(a=>a.finished.catch(()=>{})));});const result=await page.evaluate(audit);report.push({id,width,height,state,...result,errors:[...errors]});await page.screenshot({path:`${prefix}-${state}.png`});};
   await snap('page');const flag=page.locator('.business-line[data-tone]').first();await flag.hover();await flag.focus();await snap('hover');await flag.click();await page.getByRole('dialog',{name:'The business, in depth'}).waitFor();await snap('drawer');
   const network=page.locator('.business-connections');await network.scrollIntoViewIfNeeded();const partner=page.locator('.network-partner').first();if(await partner.count()){await partner.click();await snap('relationships');}
   await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'});
  }await page.close();
 }}finally{await browser.close();writeFileSync(corpusPath('flags/validation/screenshots.json'),JSON.stringify(report,null,2));}
 for(const r of report)console.log(r.id,r.width,r.state,r.issues.length?JSON.stringify(r.issues):'clean');
 if(report.some(r=>r.issues.length||r.errors.length))process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
