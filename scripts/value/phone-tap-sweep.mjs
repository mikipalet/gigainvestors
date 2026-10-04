// Real pointer dispatch at each control's centre; never force a locator click.
// BASE_URL=http://localhost:3981 node scripts/value/phone-tap-sweep.mjs <output>
import {chromium,webkit,devices,expect} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync,statfsSync} from 'node:fs';
import {audit} from './design-audit.mjs';
const base=process.env.BASE_URL??'http://localhost:3981';
const out=process.argv[2]??'.audit/phonetap-sweep';mkdirSync(out,{recursive:true});
const sizes=(process.env.QA_VIEWPORTS??'375x667,390x664,390x844,414x896,1440x900,1728x970').split(',').map(x=>x.split('x').map(Number));
const paths=(process.env.QA_PATHS??'/value,/value/all,/s/KO,/s/LULU,/s/FDS,/s/AAPL').split(',');
const engines=(process.env.QA_ENGINES??'chromium,webkit').split(',');
const report=process.env.QA_RESUME?JSON.parse(readFileSync(process.env.QA_RESUME,'utf8')):[];const save=()=>writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));
const disk=()=>{const s=statfsSync('.');if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP');};
const verifiedDrawers=new Set();
async function controls(page,scope='body'){
 return page.locator(scope).locator('button,a[href]').evaluateAll(es=>es.flatMap((el,index)=>{
  if(!el.checkVisibility({visibilityProperty:true,opacityProperty:true})||el.closest('.sr-only,[popover]:not(:popover-open)'))return [];
  return [{index,name:(el.getAttribute('aria-label')||el.textContent||'').trim(),href:el.getAttribute('href'),tag:el.tagName,disabled:!!el.disabled,cls:el.className}];
 }));
}
async function settle(page){
 await page.evaluate(()=>document.fonts.ready);
 await page.locator('dialog .panel-content[aria-busy=true],dialog[data-fitting=true],.compact-company-list[aria-busy=true]').waitFor({state:'hidden',timeout:20000}).catch(()=>{});
 await page.waitForTimeout(250);
 // WebKit may start the CSS entrance animation after its first compositor paint.
 await page.locator('dialog .panel-shell').evaluateAll(shells=>Promise.all(shells.flatMap(shell=>shell.getAnimations().map(animation=>animation.finished.catch(()=>{})))));
}
async function hit(control){
 await control.scrollIntoViewIfNeeded({timeout:4000});
 return control.evaluate(el=>{
  const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,top=document.elementFromPoint(x,y);
  return {ok:!!top&&(top===el||el.contains(top)),x,y,hit:top?.outerHTML.slice(0,220),rect:r.toJSON()};
 });
}
async function tap(page,control){const h=await hit(control);expect(h,`centre intercepted: ${JSON.stringify(h)}`).toMatchObject({ok:true});await page.touchscreen.tap(h.x,h.y);return h;}
for(const engine of engines){
 const browser=await ({chromium,webkit}[engine]).launch();
 try{for(const [width,height] of sizes)for(const path of paths){
  if(report.some(r=>r.complete&&r.engine===engine&&r.width===width&&r.height===height&&r.path===path))continue;
  disk();const context=await browser.newContext({...(width<768?devices['iPhone 13']:{}),viewport:{width,height},hasTouch:true,isMobile:width<768});
  const page=await context.newPage();page.setDefaultTimeout(8000);
  const row={engine,width,height,path,resolved:null,actions:[],audits:[],errors:[]};report.push(row);
  const load=async()=>{await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>{const b=document.querySelector('.about-method');return b&&Object.keys(b).some(k=>k.startsWith('__reactProps$')&&typeof b[k]?.onClick==='function');});
   await page.evaluate(()=>document.fonts.ready);
   await page.waitForFunction(()=>{const shelf=document.querySelector('.main-view');return !shelf||(getComputedStyle(shelf).visibility==='visible'&&[...shelf.querySelectorAll('img')].every(img=>img.complete));});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));row.resolved=new URL(page.url()).pathname;};
  const auditState=async state=>{const a=await page.evaluate(audit);row.audits.push({state,...a});};
  const close=async(trigger)=>{
   const el=page.locator('dialog[open]').last();
   if(!await el.count())return;
   await page.evaluate(()=>{document.addEventListener('click',event=>{if(event.target.closest('button[aria-label="Close panel"]'))queueMicrotask(()=>{window.__modalAfterClose=!!document.querySelector('dialog:modal');});},{once:true});window.__modalAfterClose=null;});
   await tap(page,page.getByRole('button',{name:'Close panel',exact:true}).last());
   expect(await page.evaluate(()=>window.__modalAfterClose)).toBe(false);
   await expect(page.locator('dialog[open]')).toHaveCount(0);
   if(trigger){expect(await hit(trigger)).toMatchObject({ok:true});}
  };
  const performLink=async(control,c)=>{
   if(c.href.startsWith('mailto:')){
    // Observe the trusted activation, preventing an external mail application launch.
    await control.evaluate(el=>el.addEventListener('click',e=>{window.__mailto=e.isTrusted?el.getAttribute('href'):null;e.preventDefault();},{once:true}));
    await tap(page,control);expect(await page.evaluate(()=>window.__mailto)).toBe(c.href);return 'trusted mailto activation';
   }
   const opensNewTab=await control.getAttribute('target')==='_blank';
   const expected=new URL(c.href,page.url());const external=expected.origin!==new URL(base).origin;
   let popup;const listener=p=>{popup=p;};context.on('page',listener);
   // External filing sites may reject automation; the requested URL proves link dispatch.
   let requested=false;const request=r=>{if(r.url().split('#')[0]===expected.href.split('#')[0])requested=true;};context.on('request',request);
   try{
    await tap(page,control);
    if(external){if(opensNewTab)await expect.poll(()=>!!popup,{timeout:10000}).toBe(true);await expect.poll(()=>requested||popup?.url()===expected.href,{timeout:10000}).toBe(true);if(!popup)await page.waitForURL(expected.href,{waitUntil:'domcontentloaded',timeout:10000}).catch(()=>{});return `requested ${expected.href}`;}
    await expect.poll(()=>new URL(page.url()).pathname,{timeout:20000}).toBe(expected.pathname);
    if(expected.pathname.startsWith('/s/'))await expect(page.locator('.one-dossier')).toBeVisible({timeout:20000});
    else{await page.waitForLoadState('domcontentloaded');await expect(page.locator('body')).not.toContainText('nothing filed here');}
    return `opened ${expected.pathname}`;
   }finally{context.off('page',listener);context.off('request',request);if(popup)await popup.close();}
  };
  try{
   await load();await auditState('page');
   const initial=(await controls(page)).filter(c=>!process.env.QA_NAMES||new RegExp(process.env.QA_NAMES).test(c.name));
   for(const c of initial){
    disk();const action={scope:'page',name:c.name,href:c.href};row.actions.push(action);
    if(c.disabled){action.result='disabled';continue;}
    try{
     await load();const control=page.locator('button,a[href]').nth(c.index);
     expect((await control.getAttribute('aria-label')||await control.textContent()).trim()).toBe(c.name);
     if(c.href){action.result=await performLink(control,c);continue;}
     const before=await page.locator('body').innerText();
     await tap(page,control);await settle(page);
     if(await page.locator('dialog[open]').count()){
      const title=await page.locator('dialog[open]').getAttribute('aria-label');
      action.result=`opened drawer: ${title}`;
      if(c.cls.includes('main-more'))expect(title).toContain(c.cls.includes('next-list')?'Next closest':c.name.includes('more')&&c.index<(await controls(page)).find(x=>x.cls.includes('next-list'))?.index?'Buy now':'The rest');
      if(c.name==='Method')expect(title).toMatch(/method/i);
      await auditState(title);
      // Every rendered drawer control is hit-tested and activated, including links,
      // sorting and pagination. Restore the same drawer before each action.
      const children=await controls(page,'dialog[open]');
      const drawerKey=JSON.stringify([engine,width,height,title,children.map(x=>[x.name,x.href])]);
      const sharedVerified=verifiedDrawers.has(drawerKey);
      const errorCount=row.actions.filter(x=>x.error).length;
      for(const child of children){
       const detail={scope:title,name:child.name,href:child.href};row.actions.push(detail);
       if(child.disabled){detail.result='disabled';continue;}
       try{
        if(!await page.locator('dialog[open]').count()){await load();await tap(page,page.locator('button,a[href]').nth(c.index));await settle(page);}
        const target=page.locator('dialog[open]').locator('button,a[href]').nth(child.index);
        if(sharedVerified&&child.name!=='Close panel'){expect(await hit(target)).toMatchObject({ok:true});detail.result='centre pass; identical shared drawer activation verified earlier';continue;}
        if(child.name==='Close panel'){await close(page.locator('button,a[href]').nth(c.index));detail.result='closed; native modality released synchronously';continue;}
        if(child.href){detail.result=await performLink(target,child);await load();await tap(page,page.locator('button,a[href]').nth(c.index));await settle(page);continue;}
        const old=await page.locator('dialog[open]').evaluate(el=>el.innerHTML);
        const popoverId=await target.getAttribute('popovertarget');
        await tap(page,target);await settle(page);
        if(!await page.locator('dialog[open]').count()){detail.result='drawer applied and closed';continue;}
        if(popoverId){
         const popover=page.locator(`[id="${popoverId}"]:popover-open`);await expect(popover).toBeVisible();detail.result='opened source popover';
         for(const link of await popover.locator('a[href]').all()){const href=await link.getAttribute('href');await performLink(link,{href});}
         await page.keyboard.press('Escape');await expect(popover).toHaveCount(0);
        }else{const updated=await page.locator('dialog[open]').evaluate(el=>el.innerHTML);expect(updated).not.toBe(old);detail.result='drawer state changed';}
        await close();await tap(page,page.locator('button,a[href]').nth(c.index));await settle(page);
       }catch(error){detail.error=error.message.split('\n').slice(0,8).join('\n');await page.evaluate(()=>document.querySelectorAll('[popover]:popover-open').forEach(el=>el.hidePopover())).catch(()=>{});}
      }
      if(row.actions.filter(x=>x.error).length===errorCount)verifiedDrawers.add(drawerKey);
      if(await page.locator('dialog[open]').count())await close(page.locator('button,a[href]').nth(c.index));
     }else if(c.name==='Search'||/Search companies/.test(c.name)){
      await expect(page.locator('.search-modal')).toBeVisible();action.result='opened shared search';await page.keyboard.press('Escape');
     }else if(c.cls.includes('design-toggle')){
      expect(await page.locator('body').innerText()).not.toBe(before);action.result='market scope changed';
     }else if(/quarter/.test(c.name)){
      await expect(page).toHaveURL(/[?&]q=/);action.result='quarter changed';
     }else{
      const after=await page.locator('body').innerText();expect(after).not.toBe(before);action.result='visible state changed';
     }
    }catch(error){action.error=error.message.split('\n').slice(0,8).join('\n');}
    save();
   }
  }catch(error){row.errors.push(error.message);}finally{row.complete=true;await context.close();save();}
  console.log(`${engine} ${width}x${height} ${path}: ${row.actions.length} actions, ${row.actions.filter(x=>x.error).length} action failures, ${row.audits.flatMap(x=>x.issues).length} audit issues`);
 }}finally{await browser.close();}
}
const failures=report.flatMap(r=>[...r.errors,...r.actions.filter(x=>x.error),...r.audits.flatMap(x=>x.issues)]);
console.log(`${report.length} page cases; ${report.reduce((n,r)=>n+r.actions.length,0)} actions; ${failures.length} failures. ${out}/report.json`);
if(failures.length)process.exitCode=1;
