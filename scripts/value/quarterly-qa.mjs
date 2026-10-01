// Local quarterly transfer, paint latency and responsive screenshot probe.
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync,statfsSync} from 'node:fs';
const [base='http://localhost:3027',out='/tmp/value-quarterly-qa']=process.argv.slice(2);
const s=statfsSync('/');if(s.bavail*s.bsize<5e9)throw Error('Disk guard');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const [width,height] of [[1728,970],[2056,1180],[1440,800],[390,844]]){
 const page=await browser.newPage({viewport:{width,height}});
 await page.addInitScript(()=>{window.__cls=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value;}).observe({type:'layout-shift',buffered:true});});
 await page.goto(base+'/',{waitUntil:'networkidle'});await page.waitForTimeout(1600);
 const transfer=await page.evaluate(()=>({cls:window.__cls,postload:performance.getEntriesByType('resource').filter(r=>r.startTime>performance.getEntriesByType('navigation')[0].loadEventEnd).reduce((s,r)=>s+r.encodedBodySize,0)}));
 await page.screenshot({path:`${out}/${width}-today.png`});
 await page.goto(base+'/?q=2018Q3',{waitUntil:'networkidle'});await page.waitForTimeout(1700);
 await page.screenshot({path:`${out}/${width}-2018Q3.png`});
 const times=[];
 for(let i=0;i<6;i++){
  const target=i%2?'2018Q3':'2018Q2';
  await page.evaluate(target=>{
   window.__step={target,start:null,ms:null};
   const key=()=>{window.__step.start=performance.now();document.removeEventListener('keydown',key,true);};document.addEventListener('keydown',key,true);
   const ob=new MutationObserver(()=>{if(window.__step.start!==null&&document.querySelector('.main-view')?.dataset.frame===target){ob.disconnect();requestAnimationFrame(()=>requestAnimationFrame(()=>window.__step.ms=performance.now()-window.__step.start));}});
   ob.observe(document.querySelector('.main-view'),{attributes:true,subtree:true,childList:true});
  },target);
  await page.keyboard.press(i%2?'ArrowRight':'ArrowLeft');
  await page.waitForFunction(()=>window.__step.ms!==null);times.push(await page.evaluate(()=>window.__step.ms));
  await page.waitForTimeout(250);
 }
 await page.goto(base+'/?year=2011',{waitUntil:'networkidle'});await page.screenshot({path:`${out}/${width}-2011Q4.png`});
 results.push({width,height,...transfer,stepMs:times,maxStepMs:Math.max(...times)});console.log(JSON.stringify(results.at(-1)));await page.close();
}}finally{await browser.close();writeFileSync(`${out}/performance.json`,JSON.stringify(results)+'\n');}
if(results.some(r=>r.width>=768&&r.maxStepMs>=100||r.cls!==0||r.postload>250000))process.exitCode=1;
