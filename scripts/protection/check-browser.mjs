import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const [base, output] = process.argv.slice(2);
const browser = await chromium.launch(), report = [];
try {
  for (const [device,width,height,cpu] of [['desktop',1728,970,1],['mobile-4x',390,844,4]]) {
    const context = await browser.newContext({viewport:{width,height},extraHTTPHeaders:{'x-vercel-skip-toolbar':'1'}});
    const origin = new URL(base).origin;
    if (new URL(base).hostname.endsWith('.vercel.app')) {
      if (!process.env.VERCEL_AUTOMATION_BYPASS_SECRET) throw Error('Preview timing requires the existing automation bypass secret');
      // Authenticate once with an origin-scoped cookie. Request interception
      // disables browser caching and biases Preview timings relative to live.
      const auth = await context.request.get(origin, {headers:{'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET,'x-vercel-set-bypass-cookie':'true'}});
      if (!auth.ok()) throw Error('Preview authentication failed');
    }
    const page = await context.newPage();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
    await page.addInitScript(()=>{
      window.__events=[];
      new PerformanceObserver(l=>window.__events.push(...l.getEntries().filter(e=>e.interactionId).map(e=>e.duration))).observe({type:'event',buffered:true,durationThreshold:16});
    });
    await page.goto(base,{waitUntil:'networkidle'});
    await page.waitForTimeout(3500);
    const traffic=await page.evaluate(()=>{
      const resources=performance.getEntriesByType('resource');
      const loaded=performance.getEntriesByType('navigation')[0].loadEventEnd;
      return {afterLoadAllBytes:resources.filter(r=>r.startTime>=loaded).reduce((s,r)=>s+r.transferSize,0),postLoadBytes:resources.filter(r=>['fetch','img','xmlhttprequest'].includes(r.initiatorType)).reduce((s,r)=>s+r.transferSize,0),githubRequests:resources.filter(r=>/raw\.githubusercontent\.com|api\.github\.com/.test(r.name)).length};
    });
    const actions=[];
    async function measure(name,kind,action){
      await page.evaluate(kind=>{
        window.__timing=null;window.__events=[];
        const previous=document.querySelector('.main-view')?.getAttribute('data-frame');
        const matches=()=>kind==='quarter' ? document.querySelector('.main-view')?.getAttribute('data-frame')!==previous&&document.querySelector('.main-view')?.getAttribute('aria-busy')==='false' : kind==='search' ? !!document.querySelector('.search-modal') : !!document.querySelector('dialog[open]');
        const start=()=>{
          document.removeEventListener('pointerdown',start,true);document.removeEventListener('keydown',start,true);
          const t=performance.now();window.__timing={start:t};
          const poll=()=>{if(matches())requestAnimationFrame(()=>{window.__timing.end=performance.now()});else if(performance.now()-t<10000)requestAnimationFrame(poll)};
          requestAnimationFrame(poll);
        };
        document.addEventListener('pointerdown',start,{capture:true});document.addEventListener('keydown',start,{capture:true});
      },kind);
      await action();await page.waitForFunction(()=>window.__timing?.end,{},{timeout:12000});await page.waitForTimeout(100);
      const measured=await page.evaluate(()=>({paintMs:Math.round((window.__timing.end-window.__timing.start)*10)/10,eventMs:Math.max(0,...window.__events)}));
      actions.push({name,...measured});
    }
    await measure('quarter-back','quarter',()=>page.getByRole('slider',{name:'Quarter',exact:true}).press('ArrowLeft'));
    await measure('quarter-today','quarter',()=>page.getByRole('slider',{name:'Quarter',exact:true}).press('End'));
    await measure('all-companies','dialog',()=>page.getByRole('button',{name:/All companies/}).first().click());
    await page.keyboard.press('Escape');await page.waitForTimeout(200);
    await measure('method','dialog',()=>page.getByRole('button',{name:'Method',exact:true}).click());
    await page.keyboard.press('Escape');await page.waitForTimeout(200);
    await measure('search','search',()=>page.getByRole('button',{name:'Search companies',exact:true}).click());
    report.push({device,...traffic,actions});console.log(JSON.stringify(report.at(-1)));
    await context.close();
  }
} finally {await browser.close();writeFileSync(output,JSON.stringify(report,null,2));}
if(report.some(r=>r.afterLoadAllBytes>250000||r.postLoadBytes>250000||r.githubRequests||r.actions.some(a=>a.paintMs>100||a.eventMs>100)))process.exitCode=1;
