// Input -> DOM result -> next paint; URL debounce/network-idle is not visual latency.
// Usage: node scripts/value/performance-interactions.mjs <base> <output.json>
import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const base=process.argv[2]??'http://localhost:3015',output=process.argv[3]??'/tmp/value-interactions.json';
const browser=await chromium.launch(),results=[];
for(const [device,width,height,cpu] of [['desktop',1728,970,1],['mobile-4x',390,844,4]]){
 const ctx=await browser.newContext({viewport:{width,height}}),page=await ctx.newPage();
 const cdp=await ctx.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
 await page.addInitScript(()=>{
  window.__events=[];window.__shifts=[];
  new PerformanceObserver(l=>window.__events.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration,name:e.name,id:e.interactionId})))).observe({type:'event',durationThreshold:16,buffered:true});
  new PerformanceObserver(l=>window.__shifts.push(...l.getEntries().map(e=>({start:e.startTime,value:e.value,recent:e.hadRecentInput,sources:e.sources.map(s=>({node:s.node?.className,previous:s.previousRect,current:s.currentRect}))})))).observe({type:'layout-shift',buffered:true});
  for(const type of ['pointerdown','keydown','input'])document.addEventListener(type,()=>{
   const m=window.__measure;if(!m||m.event!==null)return;m.event=performance.now();
  },true);
  new MutationObserver(()=>{
   const m=window.__measure;if(!m||m.event===null||m.paintPending||!m.check())return;
   m.paintPending=true;
   requestAnimationFrame(()=>requestAnimationFrame(()=>{if(window.__measure===m&&m.check())m.visualMs=Math.round(performance.now()-m.event);else m.paintPending=false;}));
  }).observe(document,{subtree:true,childList:true,attributes:true,characterData:true});
 });
 const go=async path=>{await page.goto(base+path,{waitUntil:'networkidle'});await page.waitForTimeout(1600);};
 async function measure(name,action,predicate,arg){
  await page.evaluate(({check,arg})=>{const fn=(0,eval)(`(${check})`);window.__measure={start:performance.now(),event:null,check:()=>fn(arg)};},{check:predicate.toString(),arg});
  try{
   await action();
   await page.waitForFunction(()=>window.__measure?.visualMs!==undefined,null,{polling:'raf',timeout:10000});
   const timing=await page.evaluate(()=>{const m=window.__measure;return {visualMs:m.visualMs,eventMs:Math.max(0,...window.__events.filter(e=>e.start>=m.start&&e.id).map(e=>e.duration)),shifts:window.__shifts.filter(e=>e.start>=m.start&&!e.recent)};});
   results.push({device,name,...timing});
  }catch(error){results.push({device,name,error:String(error).slice(0,300)});}
  await page.evaluate(()=>window.__measure=null);
  console.log(JSON.stringify(results.at(-1)));writeFileSync(output,JSON.stringify(results,null,2));
 }
 const frame=y=>document.querySelector('.main-view')?.getAttribute('data-frame')===y&&document.querySelector('.main-view')?.getAttribute('aria-busy')==='false';
 await go('/');
 const slider=page.getByRole('slider',{name:'Fiscal year'});
 // Determine actual target years from the rendered timeline, not today's calendar year.
 await measure('year-step-first',()=>slider.press('ArrowLeft'),()=>{const y=document.querySelector('input[type=range]')?.getAttribute('aria-valuetext')?.replace('Fiscal year ','');return y!=='Today'&&document.querySelector('.main-view')?.getAttribute('data-frame')===y;});
 await measure('year-step-next',()=>slider.press('ArrowLeft'),()=>{const y=document.querySelector('input[type=range]')?.getAttribute('aria-valuetext')?.replace('Fiscal year ','');return document.querySelector('.main-view')?.getAttribute('data-frame')===y;});
 await measure('year-today',()=>slider.press('End'),frame,'Today');
 const oldTitle=await page.locator('.main-view').getAttribute('data-buy-count');
 await measure('market-toggle',()=>page.locator('.market-scope [role=switch]').click(),old=>document.querySelector('.main-view')?.getAttribute('data-buy-count')!==old&&document.querySelector('.market-scope [role=switch]')?.getAttribute('aria-checked')==='true',oldTitle);
 if(width<768)await page.getByRole('button',{name:'Filters',exact:true}).click();
 await page.getByRole('combobox',{name:'Country',exact:true}).click();
 await page.getByRole('combobox',{name:'Search Country',exact:true}).fill('ger');
 await measure('filter-pick',()=>page.getByRole('option').filter({hasText:'Germany'}).click(),()=>document.querySelector('[aria-label=Country]')?.textContent?.includes('Germany')&&!document.querySelector('.search-options')&&document.querySelector('.main-view')?.getAttribute('aria-busy')==='false');
 if(width<768)await page.getByRole('button',{name:/Show \d+ companies/}).click();
 await go('/');
 await measure('drawer-open',()=>page.getByRole('button',{name:'All companies'}).click(),()=>!!document.querySelector('dialog[open] [data-testid=results-table]'));
 await page.keyboard.press('Escape');
 await measure('search-open',()=>page.getByRole('button',{name:'Search companies',exact:true}).click(),()=>!!document.querySelector('.search-modal input'));
 const search=page.getByRole('combobox',{name:'Search investor, firm, ticker, company'});
 let query='';for(const char of 'coca'){query+=char;await measure(`search-key-${query}`,()=>search.press(char),q=>document.querySelector('.search-modal input')?.value===q&&!!document.querySelector('#search-results [role=option]'),query);}
 await page.keyboard.press('Escape');
 await go('/ko.us');
 await measure('dossier-drawer-open',()=>page.getByTestId('tile-price').click(),()=>!!document.querySelector('dialog[open] [role=tabpanel]'));
 const tabs=page.getByRole('tab');
 for(let i=1;i<await tabs.count();i++){
  const title=await tabs.nth(i).textContent();
  await measure(`drawer-tab-${title}`,()=>tabs.nth(i).click(),label=>document.querySelector('dialog[open] [role=tab][aria-selected=true]')?.textContent===label,title);
 }
 await ctx.close();
}
await browser.close();
if(results.some(r=>r.error))process.exitCode=1;
