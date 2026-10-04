import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import sharp from 'sharp';
const base=process.env.BASE_URL??'http://localhost:3181';
const out=process.env.SEARCH_REPORT_DIR??'.superpowers/search-1';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const routes=['/','/value','/s/AAPL','/HA?q=2026Q2'];
const sizes=[[1728,970],[2056,1180],[1440,800],[390,844]];
const results={screenshots:[],pixels:[],geometry:[],performance:[],errors:[],live:[],legacyModal:[]};
const queries='apple aapl google goog berkshire brk alphabet coca ko plexus pluxee toyota 7203 buffett ackman ha'.split(' ');
try{
 for(const [width,height] of sizes){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  page.on('pageerror',e=>results.errors.push(e.message));
  let reference,haReference;
  for(const [i,route] of routes.entries()){
   await page.goto(base+route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
   await page.getByRole('button',{name:'Search',exact:true}).click();
   const input=page.getByRole('combobox',{name:'Search investor, firm, ticker, company'});await input.waitFor();await input.fill('apple');
   await page.locator('[data-company=AAPL]').waitFor();
   await page.mouse.move(0,0);
   const modal=page.getByRole('dialog',{name:'Search',exact:true});
   const shot=`${width}x${height}-${i}-apple.png`;
   await page.screenshot({path:`${out}/${shot}`});results.screenshots.push({route,width,height,file:shot});
   const buffer=await modal.screenshot();const raw=await sharp(buffer).raw().toBuffer({resolveWithObject:true});
   if(!reference)reference=raw;
   const equal=raw.info.width===reference.info.width&&raw.info.height===reference.info.height&&raw.data.equals(reference.data);
   results.pixels.push({route,width,height,equal});
   assert.ok(equal,`Modal differs on ${route} at ${width}`);
   for(const query of queries){
    await input.fill(query);
    const geometry=await page.evaluate(()=>{
     const modal=document.querySelector('.search-modal'),input=modal.querySelector('input'),list=modal.querySelector('ul');
     const rect=modal.getBoundingClientRect();const errors=[];
     if(rect.left<0||rect.right>innerWidth||rect.bottom>innerHeight)errors.push('modal outside viewport');
     if(modal.scrollWidth>modal.clientWidth)errors.push('horizontal overflow');
     const companies=[...modal.querySelectorAll('[data-company]')].map(n=>n.dataset.company);
     if(new Set(companies).size!==companies.length)errors.push('duplicate company');
     for(const row of modal.querySelectorAll('[role=option]')){
      const box=row.getBoundingClientRect();
      if(row.scrollWidth>row.clientWidth)errors.push('row horizontal overflow');
      const children=[...row.children].map(c=>c.getBoundingClientRect());
      for(let j=1;j<children.length;j++)if(children[j-1].right>children[j].left+1)errors.push('overlapping columns');
      if(box.width>rect.width+1)errors.push('row wider than modal');
      const end=list.getBoundingClientRect().bottom;
      if(box.top<end-1&&box.bottom>end+1)errors.push('partially cut row');
     }
     return {errors,companies,input:input.value};
    });
    results.geometry.push({route,width,height,query,...geometry});
    assert.deepEqual(geometry.errors,[],`${route} ${width} ${query}`);
   }
   await input.fill('ha');
   const ha=await sharp(await modal.screenshot()).raw().toBuffer();if(!haReference)haReference=ha;assert.ok(ha.equals(haReference),`HA modal differs on ${route} at ${width}`);
   results.pixels.push({route,width,height,query:'ha',equal:true});
   await page.screenshot({path:`${out}/${width}x${height}-${i}-ha.png`});
   await page.keyboard.press('Escape');await page.keyboard.press('/');assert.equal(await input.count(),1);
   await page.keyboard.press('Escape');
  }
  // Fresh contexts avoid navigation-dependent image raster caches and hover state.
  const investorShots=[],legacyModals=[];
  for(const [side,origin] of [['local',base],['live','https://gigainvestors.com']]){
   const isolated=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   await isolated.goto(origin+'/HA?q=2026Q2',{waitUntil:'networkidle'});await isolated.evaluate(()=>document.fonts.ready);await isolated.waitForTimeout(700);await isolated.mouse.move(0,0);
   investorShots.push(await sharp(await isolated.screenshot({path:`${out}/${width}x${height}-investor-${side}.png`})).removeAlpha().raw().toBuffer());
   await isolated.keyboard.press('/');await isolated.getByRole('combobox',{name:'Search investor, firm, ticker, company'}).fill('buffett');
   await isolated.locator('#search-results li').first().waitFor();
   await isolated.locator('.search-modal [role=status]').waitFor({state:'hidden'});
   await isolated.locator('.search-modal img').evaluateAll(images=>Promise.all(images.map(img=>img.decode().catch(()=>{}))));
   legacyModals.push(await sharp(await isolated.locator('.search-modal').screenshot({path:`${out}/${width}x${height}-legacy-modal-${side}.png`})).raw().toBuffer());
   await isolated.close();
  }
  results.legacyModal.push({width,height,equal:legacyModals[0].equals(legacyModals[1])});
  assert.ok(legacyModals[0].equals(legacyModals[1]),`Legacy modal differs at ${width}`);
  const [a,b]=investorShots;
  let changed=0;for(let j=0;j<a.length;j+=3)if(a[j]!==b[j]||a[j+1]!==b[j+1]||a[j+2]!==b[j+2])changed++;
  results.live.push({width,height,changedPixels:changed,equal:a.equals(b)});
  assert.equal(changed,0,`Investor page differs from live at ${width}`);
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:844}});
 let requests=0;page.on('request',r=>{if(new URL(r.url()).pathname==='/api/search')requests++;});
 await page.goto(base,{waitUntil:'networkidle'});
 const session=await page.context().newCDPSession(page);await session.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.keyboard.press('/');const input=page.getByRole('combobox',{name:'Search investor, firm, ticker, company'});await input.fill('apple');await page.locator('[data-company=AAPL]').waitFor();
 // Measure input dispatch through DOM result commit, using MutationObserver.
 for(let round=0;round<3;round++)for(const word of queries){
  await input.fill('');
  for(const letter of word){
   const timing=await page.evaluate(letter=>new Promise(resolve=>{
    const input=document.querySelector('input[role=combobox]'),modal=document.querySelector('.search-modal');
    const start=performance.now();
    const observer=new MutationObserver(()=>{observer.disconnect();resolve(performance.now()-start);});
    observer.observe(modal,{subtree:true,childList:true,attributes:true,characterData:true});
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,input.value+letter);input.dispatchEvent(new Event('input',{bubbles:true}));
    setTimeout(()=>{observer.disconnect();resolve(performance.now()-start);},250);
   }),letter);
   results.performance.push({word,letter,ms:timing});
  }
 }
 await page.keyboard.press('Escape');await page.keyboard.press('/');await input.fill('toyota');
 results.indexRequests=requests;
 for(const route of ['/value/all','/value/method','/about']){
  await page.goto(base+route,{waitUntil:'networkidle'});await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByRole('combobox',{name:'Search investor, firm, ticker, company'}).fill('aapl');await page.locator('[data-company=AAPL]').waitFor();
 }
 assert.equal(results.indexRequests,1);
 assert.ok(Math.max(...results.performance.map(r=>r.ms))<=50,'Keystroke gate exceeds 50 ms');
 assert.deepEqual(results.errors,[]);
 await page.close();
}finally{writeFileSync(`${out}/browser-audit.json`,JSON.stringify(results,null,2));await browser.close();}
console.log(JSON.stringify({pixelComparisons:results.pixels,live:results.live,geometryChecks:results.geometry.length,legacyModal:results.legacyModal,performanceMax:Math.max(...results.performance.map(r=>r.ms)),indexRequests:results.indexRequests,errors:results.errors}));
