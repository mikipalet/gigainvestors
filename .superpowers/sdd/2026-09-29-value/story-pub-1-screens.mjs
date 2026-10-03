import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync,statfsSync} from 'node:fs';
const [base='http://localhost:3047',out='.story-2/screens']=process.argv.slice(2);
const ids=['ADBE.US','NVDA.US','KO.US','LULU.US','7203.JP','PLX.PA'];
mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const [width,height]of [[1728,970],[2056,1180]])for(const id of ids){
 const disk=statfsSync('.');if(disk.bavail*disk.bsize<Number(process.env.STORY_MIN_FREE_GIB??6)*1024**3)throw Error('DISK STOP: below configured free-space floor');
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/'+id.toLowerCase(),{waitUntil:'networkidle',timeout:90000});
  await page.locator('[data-testid=price-story-line]').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  const line=await page.getByTestId('price-story-line').innerText();
  const placement=await page.getByTestId('price-story-line').evaluate(el=>{const prior=el.previousElementSibling;return {verdict:prior?.textContent,underVerdict:prior?.matches('.plain-verdict,h2')&&el.getBoundingClientRect().top>=prior.getBoundingClientRect().bottom-1};});
  if(!placement.underVerdict)throw Error('Story is not under verdict');
  if(placement.verdict==='Great business, but the price already assumes a lot')throw Error('Old verdict retained');
  const pageFile=`${width}x${height}-${id}-line.png`;
  await page.screenshot({path:`${out}/${pageFile}`});
  const scroll=await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight+1);
  await page.getByTestId('price-story-line').click();
  await page.getByTestId('price-story-panel').waitFor();
  await page.waitForTimeout(400);
  const drawerFile=`${width}x${height}-${id}-drawer.png`;
  await page.screenshot({path:`${out}/${drawerFile}`});
  const box=await page.locator('dialog').boundingBox();
  results.push({id,width,height,line,...placement,pageFile,drawerFile,scroll,fullHeight:box?.y===0&&box?.height===height,errors});
 }catch(e){results.push({id,width,height,error:e.message,errors});}finally{await page.close();}
 writeFileSync(`${out}/report.json`,JSON.stringify(results,null,2));
}}finally{await browser.close();}
console.log(JSON.stringify({states:results.length,failed:results.filter(r=>r.error||r.scroll||!r.fullHeight||r.errors.length).length}));
