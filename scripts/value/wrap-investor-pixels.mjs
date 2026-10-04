// Exact RGBA comparison against live, with the same browser, viewport and DPR.
import {chromium,webkit} from '@playwright/test';
import sharp from 'sharp';
import {mkdirSync,writeFileSync,statfsSync} from 'node:fs';
const [base='http://localhost:3943',out='/tmp/wrap-2/investors']=process.argv.slice(2);
mkdirSync(out,{recursive:true});const report=[];
for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch();
 try{for(const width of [1280,1440,1568,1728,2056,390])for(const path of ['/HA?q=2026Q2','/BRK']){
  const d=statfsSync('/');if(d.bavail*d.bsize<4*1024**3)throw Error('DISK STOP');
  const height=width===390?844:900,images=[];
  for(const origin of [base,'https://gigainvestors.com']){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,reducedMotion:'reduce'});
   await page.goto(origin+path,{waitUntil:'networkidle',timeout:90000});await page.evaluate(()=>document.fonts.ready);
   await page.locator('.legacy-investor').waitFor();await page.mouse.move(0,0);
   await page.waitForTimeout(1200);
   images.push(await page.screenshot({animations:'disabled'}));await page.close();
  }
  const raw=await Promise.all(images.map(x=>sharp(x).ensureAlpha().raw().toBuffer()));
  let changed=0;for(let i=0;i<raw[0].length;i+=4)if(raw[0].subarray(i,i+4).compare(raw[1].subarray(i,i+4)))changed++;
  const result={engine,width,height,path,changedPixels:changed,totalPixels:width*height*4};report.push(result);
  const name=`${engine}-${width}-${path.replace(/[^a-z0-9]/gi,'_')}`;
  if(changed){writeFileSync(`${out}/${name}-local.png`,images[0]);writeFileSync(`${out}/${name}-live.png`,images[1]);}
  writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(result));
 }}finally{await browser.close();}
}
if(report.some(x=>x.changedPixels))process.exitCode=1;
