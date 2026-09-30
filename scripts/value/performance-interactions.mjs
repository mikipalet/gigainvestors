// Event Timing (including presentation delay) and input-to-next-painted-result.
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
  window.__valueFrameReady=()=>{
    const frame=document.querySelector('.answer-stage'),label=document.querySelector('input[type=range]')?.getAttribute('aria-valuetext');
    const expected=label?.replace('Fiscal year ','');
    return frame?.dataset.frame?frame.dataset.frame===expected:frame?.getAttribute('aria-busy')!=='true';
  };
  new PerformanceObserver(l=>window.__events.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration,name:e.name,id:e.interactionId})))).observe({type:'event',durationThreshold:16,buffered:true});
  new PerformanceObserver(l=>window.__shifts.push(...l.getEntries().map(e=>({start:e.startTime,value:e.value,recent:e.hadRecentInput})))).observe({type:'layout-shift',buffered:true});
  document.addEventListener('input',()=>{
    const m=window.__measure;if(!m?.drag)return;const start=performance.now();
    const tick=()=>{if(window.__measure!==m)return;if(window.__valueFrameReady())requestAnimationFrame(()=>m.dragFrames.push(Math.round(performance.now()-start)));else requestAnimationFrame(tick);};requestAnimationFrame(tick);
  },true);
  for(const type of ['pointerdown','keydown','input','pointerover'])document.addEventListener(type,()=>{
    const m=window.__measure;if(!m||m.event!==null||type==='pointerover'&&!m.hover)return;
    m.event=performance.now();
    const tick=()=>{if(window.__measure!==m)return;if(m.check())requestAnimationFrame(()=>{m.visualMs=Math.round(performance.now()-m.event);});else requestAnimationFrame(tick);};
    requestAnimationFrame(tick);
  },true);
 });
 const go=async path=>{await page.goto(base+path,{waitUntil:'networkidle'});await page.waitForTimeout(3000);};
 async function measure(name,action,predicate){
  await page.evaluate(({check,hover,drag})=>{window.__measure={start:performance.now(),event:null,hover,drag,dragFrames:[],check:check?(0,eval)(`(${check})`):()=>true};},{check:predicate?.toString(),hover:/hover|tooltip/.test(name),drag:name==='year-full-drag'});
  const wall=Date.now();
  try{
   await action();
   await page.waitForFunction(()=>window.__measure?.visualMs!==undefined,null,{polling:'raf',timeout:10000});
   await page.waitForTimeout(50); // Allow Event Timing entries to reach the observer.
   const timing=await page.evaluate(()=>{
    const mark=window.__measure;const result={visualMs:mark.dragFrames.length?Math.max(...mark.dragFrames):mark.visualMs,dragFrames:mark.dragFrames.length||undefined,events:window.__events.filter(e=>e.start>=mark.start),cls:window.__shifts.filter(e=>e.start>=mark.start&&!e.recent).reduce((n,e)=>n+e.value,0),allShifts:window.__shifts.filter(e=>e.start>=mark.start).reduce((n,e)=>n+e.value,0)};window.__measure=null;return result;
   });
   results.push({device,name,wallMs:Date.now()-wall,...timing,eventMs:Math.max(0,...timing.events.filter(e=>e.id).map(e=>e.duration))});
  }catch(error){results.push({device,name,error:String(error).slice(0,250)});}
  console.log(JSON.stringify(results.at(-1)));writeFileSync(output,JSON.stringify(results,null,2));
 }
 const close=async name=>measure(name,()=>page.getByRole('button',{name:'Close panel',exact:true}).click(),()=>!document.querySelector('dialog[open]'));
 await go('/');
 const slider=page.getByRole('slider',{name:'Fiscal year'});
 await slider.focus();
 await measure('year-step-first',()=>slider.press('ArrowLeft'),()=>window.__valueFrameReady()&&document.querySelector('input[type=range]')?.getAttribute('aria-valuetext')!=='Today');
 await measure('year-step-next',()=>slider.press('ArrowLeft'),()=>window.__valueFrameReady());
 await measure('year-today',()=>slider.press('End'),()=>document.querySelector('input[type=range]')?.getAttribute('aria-valuetext')==='Today'&&window.__valueFrameReady());
 const box=await slider.boundingBox();
 await measure('year-click',()=>page.mouse.click(box.x+box.width*.4,box.y+box.height/2),()=>window.__valueFrameReady());
 await measure('year-full-drag',async()=>{await page.mouse.move(box.x+2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width-2,box.y+box.height/2,{steps:22});await page.mouse.up();},()=>window.__valueFrameReady());
 await slider.press('End');
 await measure('market-toggle',()=>page.getByRole('switch').filter({hasText:'Western markets'}).click(),()=>document.querySelector('.market-scope [role=switch]')?.getAttribute('aria-checked')==='true');
 if(width<768)await measure('filters-open',()=>page.getByRole('button',{name:'Filters',exact:true}).click(),()=>!!document.querySelector('dialog[open]'));
 for(const [label,text] of [['Country','ger'],['Sector','tech']]){
  await measure(`${label}-open`,()=>page.getByRole('combobox',{name:label,exact:true}).click(),()=>!!document.querySelector('.search-options input'));
  const input=page.getByRole('combobox',{name:`Search ${label}`,exact:true});
  for(const char of text)await measure(`${label}-type-${char}`,()=>input.press(char),()=>!!document.querySelector('.search-options [role=option]'));
  await measure(`${label}-pick`,()=>page.getByRole('option').first().click(),()=>!document.querySelector('.search-options'));
 }
 if(width<768)await close('filters-close');
 await go('/');
 const pager=page.getByRole('button',{name:'Next buy-zone companies'});
 if(await pager.count())await measure('buy-page',()=>pager.click());
 await measure('treemap-tooltip',()=>page.locator('.value-map-canvas [data-testid=company-tile]').first().hover(),()=>!!document.querySelector('.pointer-tooltip'));
 await page.mouse.move(0,0);
 for(const [label,button] of [['companies','All companies'],['method','Method']]){
  await measure(`${label}-open`,()=>page.getByRole('button',{name:button,exact:label==='method'}).click(),()=>!!document.querySelector('dialog[open]'));
  for(const tab of await page.getByRole('tab').all()){const title=await tab.textContent();await measure(`${label}-tab-${title}`,()=>tab.click());}
  await close(`${label}-close`);
 }
 await measure('search-open',()=>page.getByRole('button',{name:'Search companies',exact:true}).click(),()=>!!document.querySelector('.search-modal'));
 const search=page.getByRole('combobox',{name:'Search investor, firm, ticker, company'});
 for(const char of 'coca')await measure(`search-type-${char}`,()=>search.press(char),()=>!!document.querySelector('#search-results [role=option]')&&!document.querySelector('.search-modal')?.textContent?.includes('searching'));
 await page.keyboard.press('Escape');
 await go('/ko.us');
 for(const key of ['understandable','moat','economics','management','accounting','price']){
  await measure(`${key}-open`,()=>page.getByTestId(`tile-${key}`).click(),()=>!!document.querySelector('dialog[open] [role=tabpanel],dialog[open] .panel-content p'));
  const point=page.locator('dialog[open] .chart-interaction button').first();
  if(await point.count())await measure(`${key}-chart-hover`,()=>point.hover(),()=>!!document.querySelector('dialog[open] [role=tooltip]'));
  for(const tab of await page.getByRole('tab').all()){const title=await tab.textContent();await measure(`${key}-tab-${title}`,()=>tab.click());}
  await close(`${key}-close`);
 }
 const investors=page.getByRole('button').filter({hasText:/tracked investors?/});
 if(await investors.count()){await measure('investors-open',()=>investors.click(),()=>!!document.querySelector('dialog[open]'));await close('investors-close');}
 await ctx.close();
}
await browser.close();
