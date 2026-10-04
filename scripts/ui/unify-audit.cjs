const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.AUDIT_URL || 'https://gigainvestors.com';
const out = process.env.AUDIT_OUT || '/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/unify-1-evidence/before';
const sizes = process.env.AUDIT_SIZES ? JSON.parse(process.env.AUDIT_SIZES) : [[1728,970],[390,844]];
const pages = [['home','/'],['ha','/HA?q=2026Q2'],['brk','/BRK'],['empty-investor','/MP'],['value','/value'],['value-quarter','/value?q=2026Q2'],['value-year','/value/year/2020'],['missing-company','/s/UNIFYMISSING'],['aapl','/s/AAPL'],['plx','/s/PLX.PA'],['spy','/s/SPY'],['method','/value/method'],['about','/about'],['newsletter','/newsletter'],['privacy','/privacy'],['404','/unify-missing-page'],['forward','/value/forward'],['unsubscribe','/unsubscribe'],['munger','/munger'],['newsletter-issue','/newsletter/2026-q2']];
const geometry=require('./unify-geometry.cjs');
const auditPath=path.join(out,'audit.json');
const output=process.env.AUDIT_MERGE==='1'&&fs.existsSync(auditPath)?JSON.parse(fs.readFileSync(auditPath)):[];
const selected = process.env.AUDIT_PAGES?.split(',');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const {audit}=await import('../value/design-audit.mjs');
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext();
 await context.addInitScript(()=>{ window.__events=[]; new PerformanceObserver(list=>{for(const e of list.getEntries()) if(e.interactionId) window.__events.push({name:e.name,duration:e.duration});}).observe({type:'event',buffered:true,durationThreshold:16}); });
 const p=await context.newPage();
 async function capture(name){
  await p.waitForTimeout(220);
  const size=p.viewportSize(), id=`${name}-${size.width}`;
  const record=await p.evaluate(()=>{
   const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
   const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
   const style=e=>{const s=getComputedStyle(e);return Object.fromEntries(['fontSize','fontWeight','lineHeight','padding','border','borderRadius','boxShadow','gap','color','backgroundColor','textDecorationLine','opacity'].map(k=>[k,s[k]]));};
   const controls=[...document.querySelectorAll('button,input,select,a')].filter(visible).filter(e=>e.closest('nav,.timeline,.dock-tools,.map-toolbar,.panel-shell,.search-modal')||e.getBoundingClientRect().y>innerHeight-85||['switch','combobox'].includes(e.getAttribute('role'))).map(e=>({tag:e.tagName,text:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,140),cls:typeof e.className==='string'?e.className:'',box:box(e),style:style(e)}));
   const dialogs=[...document.querySelectorAll('dialog[open],[role=dialog]')].filter(visible).map(e=>({label:e.getAttribute('aria-label'),box:box(e),scroll:e.scrollHeight,client:e.clientHeight}));
   const clipped=[...document.querySelectorAll('button,input,select,h1,h2,h3,dialog[open],nav')].filter(visible).filter(e=>!e.closest('.sr-only,[aria-hidden=true]')).filter(e=>{const r=e.getBoundingClientRect();return r.left<-.5||r.right>innerWidth+.5;}).map(e=>({tag:e.tagName,text:e.textContent.slice(0,80),box:box(e)}));
   return {url:location.href,width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,controls,dialogs,clipped,headings:[...document.querySelectorAll('h1,h2,h3')].filter(visible).map(e=>({text:e.textContent.slice(0,80),style:style(e),box:box(e)})),events:window.__events,bodyText:document.body.innerText.slice(0,22000)};
  });
  await p.screenshot({path:path.join(out,id+'.png')});
  if(['method','forward'].includes(name))await p.screenshot({path:path.join(out,id+'-full.png'),fullPage:true});
  await p.screenshot({path:path.join(out,id+'-bar.png'),clip:{x:0,y:size.height-140,width:size.width,height:140}});
  record.geometry=await p.evaluate(geometry);
  record.layoutIssues=(await p.evaluate(audit)).issues.filter(x=>!x.startsWith('text below 13px'));
  const previous=output.findIndex(row=>row.id===id);if(previous>=0)output.splice(previous,1);
  output.push({id,...record}); fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify(output,null,2));
  console.log(id,record.dialogs.map(d=>d.label).join(','),'horizontal',record.clipped.length);
 }
 async function open(name,locator){
  try{if(!await locator.count()||!await locator.first().isVisible())return;await locator.first().click({timeout:5000});await p.waitForTimeout(600);await capture(name);await p.keyboard.press('Escape');await p.waitForTimeout(220);}catch(e){console.log('STATE_ERROR',name,e.message.split('\n')[0]);output.push({id:name,error:e.message.split('\n')[0]});}
 }
 for(const [width,height] of sizes){
  await p.setViewportSize({width,height});
  for(const [name,url] of pages){
   if(selected&&!selected.includes(name))continue;
   try{
    await p.goto(base+url,{waitUntil:'load',timeout:90000});await p.evaluate(()=>document.fonts.ready);await p.mouse.move(0,0);await p.waitForTimeout(600);await capture(name);
    if(['home','ha','value','aapl'].includes(name)){
     await open(name+'-search',p.locator('button').filter({hasText:/^Search \/$|^search \/$/}));
    }
    if(name==='value'){
     await open('all-companies',p.getByRole('button',{name:'All companies',exact:false}));
     await open('filters',p.getByRole('button',{name:'Filters',exact:true}));
     await open('countries',p.getByRole('combobox',{name:'Country',exact:true}));
     await open('sectors',p.getByRole('combobox',{name:'Sector',exact:true}));
     await open('buy-list',p.locator('.main-more').first());
     await open('next-list',p.locator('.next-list-open'));
     await open('quality-list',p.locator('.main-more').last());
     await open('method-drawer',p.getByRole('button',{name:'Method',exact:true}));
    }
    if(['aapl','plx'].includes(name)){
     await open(name+'-holders',p.locator('.company-holders-strip'));
     await open(name+'-business',p.locator('.business-open'));
     await open(name+'-price-story',p.getByRole('button',{name:/^Price story:/}));
     const tiles=p.locator('.tile-open');for(let i=0;i<await tiles.count();i++)await open(name+'-evidence-'+i,tiles.nth(i));
    }
   }catch(e){console.log('PAGE_ERROR',name,e.message.split('\n')[0]);output.push({id:name+'-'+width,error:e.message.split('\n')[0]});}
  }
 }
 fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify(output,null,2));await browser.close();
})();
