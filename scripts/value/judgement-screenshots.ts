import { chromium } from '@playwright/test';
import { mkdirSync,writeFileSync } from 'node:fs';
import { corpusPath } from '../../lib/value/corpus';
import { diskGuard } from '../../lib/value/thesis/sources';
async function main(){
 diskGuard();const directory=corpusPath('judgement/screenshots');mkdirSync(directory,{recursive:true});
 const browser=await chromium.launch({headless:true});const results=[];
 try{for(const viewport of [{width:1728,height:970},{width:390,height:844}]){
  const page=await browser.newPage({viewport});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  for(const id of ['googl.us','aapl.us','ko.us','lulu.us','wkl.as']){
   diskGuard();const response=await page.goto(`http://localhost:3117/${id}`,{waitUntil:'networkidle',timeout:90000});
   await page.getByTestId('the-business').waitFor();
   await page.addStyleTag({content:'nextjs-portal { display:none !important; }'});
   const judgements=page.locator('.test-tiles .human-judgement');
   if(await judgements.count()!==5)throw Error(`${id}: missing five judgements`);
   const overlaps=await page.evaluate(()=>{
    const section=document.querySelector('.dossier-checks')!.getBoundingClientRect();
    const business=document.querySelector('.business-section')!.getBoundingClientRect();
    const tiles=[...document.querySelectorAll('.quality-section .test-tile')];
    return business.top<section.bottom-1||tiles.some(t=>[...t.children].some(c=>c.getBoundingClientRect().bottom>t.getBoundingClientRect().bottom+2));
   });
   if(overlaps)throw Error(`${id}: dossier sections or tile contents overlap at ${viewport.width}`);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   if(overflow)throw Error(`${id}: horizontal overflow at ${viewport.width}`);
   const prefix=`${directory}/${id}-${viewport.width}x${viewport.height}`;
   await page.screenshot({path:`${prefix}-judgements.png`});
   await page.getByTestId('the-business').locator('h2').evaluate(e=>window.scrollTo({top:window.scrollY+e.getBoundingClientRect().top-20,behavior:'instant'}));
   await page.waitForTimeout(100);
   await page.screenshot({path:`${prefix}-business.png`});
   await page.screenshot({path:`${prefix}-full.png`,fullPage:true});
   results.push({id,viewport,status:response?.status(),judgements:5,businessTopics:await page.locator('.business-readings h3').allTextContents(),errors:[...errors]});
  }
  await page.close();
 }}finally{await browser.close();}
 writeFileSync(corpusPath('judgement/validation/browser.json'),JSON.stringify(results,null,2));
 if(results.some(r=>r.status!==200||r.errors.length))throw Error('Browser errors; inspect validation/browser.json');
 console.log(`Verified ${results.length} dossier viewports; screenshots in ${directory}`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
