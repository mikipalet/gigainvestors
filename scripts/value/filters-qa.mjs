// Local filter states + event-to-render timing. No deployment or data mutation.
import {chromium} from '@playwright/test';
import {audit} from './design-audit.mjs';
import {mkdirSync,writeFileSync,statfsSync,readFileSync} from 'node:fs';
const [base='http://localhost:3018',out='/tmp/value-design18/filters',paths='/']=process.argv.slice(2);
const sizes=(process.env.QA_VIEWPORTS??'1728x970,1440x800,390x844').split(',').map(s=>s.split('x').map(Number));
mkdirSync(out,{recursive:true});
const disk=()=>{const s=statfsSync('/');if(s.bavail*s.bsize<5*1024**3)throw Error('DISK STOP: below 5 GiB');};
const browser=await chromium.launch(),report=[],timings=[];
try{for(const [width,height]of sizes)for(const path of paths.split(',')){
 disk();const page=await browser.newPage({viewport:{width,height},hasTouch:width<500});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 // The browser uses the same local release snapshot as the server.
 if(process.env.VALUE_STORE_DIR)await page.route('https://raw.githubusercontent.com/mikipalet/gigainvestors-value-data/main/**',route=>{const file=new URL(route.request().url()).pathname.split('/main/')[1];try{return route.fulfill({contentType:'application/json',body:readFileSync(`${process.env.VALUE_STORE_DIR}/${file}`)});}catch{return route.fulfill({status:404,body:'{}'});}});
 await page.goto(base+path,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
 await page.evaluate(()=>{
  window.filterTimings=[];
  for(const type of ['click','input','keydown'])document.addEventListener(type,e=>{
   const el=e.target;if(!(el instanceof Element))return;
   const opening=type==='click'&&el.closest('.filter-trigger,.mobile-filter-button');
   const typing=(type==='input'&&el.matches('.filter-search'))||(type==='keydown'&&el.matches('[role=listbox]')&&e.key.length===1);
   if(!opening&&!typing)return;
   const start=performance.now(),scope=opening?document.querySelector('.one-index'):el.closest('.design-select');
   let commitMs=null;
   const observer=new MutationObserver(()=>{commitMs??=performance.now()-start;});
   observer.observe(scope,{subtree:true,childList:true,attributes:true,characterData:true});
   requestAnimationFrame(()=>{
    observer.disconnect();
    const query=(el.value??'').toLowerCase().trim();
    const ready=opening?!!scope.querySelector('.filter-options'):type==='input'?[...scope.querySelectorAll('.filter-scroll .option-name')].every(n=>n.textContent.toLowerCase().includes(query)):!!el.querySelector('[data-active=true]');
    // A type-ahead key can retain the already active row: no DOM mutation is required.
    window.filterTimings.push({kind:opening?'open':'typing',label:el.getAttribute('aria-label')??el.textContent,query:el.value,commitMs,frameMs:performance.now()-start,ready});
   });
  },true);
 });
 const snap=async state=>{disk();await page.waitForTimeout(100);const result=await page.evaluate(audit);const file=`${width}x${height}-${path.replace(/[^a-z0-9]/gi,'_')}-${state}.png`;await page.screenshot({path:`${out}/${file}`});report.push({viewport:`${width}x${height}`,path,state,file,...result,errors:[...errors]});};
 await snap('closed');
 if(!await page.locator('.main-view').count()){await page.close();continue;}
 if(width<500){await page.getByRole('button',{name:'Filters',exact:true}).click();await page.waitForTimeout(220);await snap('sheet-open');}
 for(const [label,plural,query,selection] of [['Country','Countries','united','United States'],['Sector','Sectors','tech','Technology']]){
  const mobile=width<500,list=page.getByRole('listbox',{name:mobile?plural:label,exact:true});
  if(!mobile)await page.getByRole('combobox',{name:label,exact:true}).click();
  else await list.scrollIntoViewIfNeeded();
  await snap(`${label}-open`);
  if(!mobile||label==='Country'){
   const search=page.getByRole('combobox',{name:`Search ${mobile?plural:label}`,exact:true});
   await search.pressSequentially(query,{delay:80});await snap(`${label}-typing`);
   await list.getByRole('option').filter({has:page.locator('.option-name',{hasText:new RegExp(`^${selection}$`)})}).click();
  }else{
   await list.focus();await list.pressSequentially(query,{delay:80});await snap(`${label}-typing`);await list.press('Enter');
  }
  await snap(`${label}-selected`);
  if(!mobile){await page.getByRole('combobox',{name:label,exact:true}).click();await snap(`${label}-selected-open`);await page.keyboard.press('Escape');}
 }
 // Reset filters before showing every toggle state.
 if(width<500){
  const country=page.getByRole('combobox',{name:'Search Countries'});await country.fill('');
  await page.getByRole('listbox',{name:'Countries',exact:true}).getByRole('option').first().click();
  await page.getByRole('listbox',{name:'Sectors',exact:true}).getByRole('option').first().click();
 }else for(const label of ['Country','Sector']){await page.getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('listbox',{name:label,exact:true}).getByRole('option').first().click();}
 const scope=width<500?page.getByRole('dialog'):page;
 for(const label of ['Near misses','Held by superinvestors','Western markets']){
  const toggle=scope.getByRole('switch',{name:label,exact:true});await toggle.scrollIntoViewIfNeeded();await snap(`${label.replaceAll(' ','-')}-before`);await toggle.click();await page.waitForTimeout(180);await snap(`${label.replaceAll(' ','-')}-after`);await toggle.click();
 }
 if(width<500){await page.getByRole('button',{name:/Show \d+ companies/}).click();await snap('sheet-applied');}
 timings.push({path,viewport:`${width}x${height}`,samples:await page.evaluate(()=>window.filterTimings)});await page.close();
}}finally{await browser.close();writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));writeFileSync(`${out}/latency.json`,JSON.stringify(timings,null,2));}
const issues=report.filter(r=>r.issues.length||r.errors.length);console.log(JSON.stringify({states:report.length,issues,timings:timings.map(t=>({viewport:t.viewport,openMax:Math.max(...t.samples.filter(s=>s.kind==='open').map(s=>s.frameMs)),typingMax:Math.max(...t.samples.filter(s=>s.kind==='typing').map(s=>s.frameMs)),commitMax:Math.max(...t.samples.map(s=>s.commitMs))}))},null,2));
if(issues.length||timings.some(t=>t.samples.some(s=>s.frameMs>=50||!s.ready)))process.exitCode=1;
