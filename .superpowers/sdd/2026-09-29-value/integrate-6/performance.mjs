import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const b=await chromium.launch(),results=[];
for(const [width,height] of (process.env.QA_VIEWPORTS??'1728x970,2056x1180,1440x800,390x844').split(',').map(s=>s.split('x').map(Number)))for(const route of (process.env.QA_PATHS??'/,/value,/s/AAPL,/s/PLX.PA,/s/7203.JP,/BRK').split(',')){
 const p=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});
 await p.addInitScript(()=>{
  window.events=[];window.tasks=[];
  new PerformanceObserver(l=>window.events.push(...l.getEntries().filter(e=>e.interactionId).map(e=>({name:e.name,duration:e.duration,processing:e.processingEnd-e.processingStart,delay:e.processingStart-e.startTime,start:e.startTime,target:e.target?.outerHTML?.slice(0,180)})))).observe({type:'event',durationThreshold:16,buffered:true});
  new PerformanceObserver(l=>window.tasks.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});
 });
 await p.goto('http://localhost:3066'+route,{waitUntil:'networkidle'});await p.waitForTimeout(900);
 async function act(name,fn){await p.evaluate(()=>{window.events=[];window.tasks=[];});await fn();await p.waitForTimeout(500);const x=await p.evaluate(()=>({events:window.events,tasks:window.tasks}));results.push({width,height,route,name,max:Math.max(0,...x.events.map(e=>e.duration)),...x});writeFileSync(process.argv[2]??'.int6/perf.json',JSON.stringify(results,null,2));}
 await act('search-open',()=>p.keyboard.press('/'));
 await act('search-type',()=>p.locator('.search-modal input').pressSequentially('Apple',{delay:100}));
 await act('search-close',()=>p.keyboard.press('Escape'));
 const drawer=p.getByRole('button',{name:/Open Predictable profits evidence|All companies ↗/}).first();
 if(await drawer.count()){await act('drawer-open',()=>drawer.click());await act('drawer-close',()=>p.keyboard.press('Escape'));}
 await act('quarter',()=>p.keyboard.press('ArrowLeft'));await p.close();
}
await b.close();console.log(JSON.stringify({states:results.length,max:Math.max(...results.map(r=>r.max)),failures:results.filter(r=>r.max>100).map(({events,tasks,...r})=>r)}));
