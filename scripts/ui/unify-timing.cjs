const {chromium}=require('playwright');const fs=require('fs');
const root='/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/unify-1-evidence';
(async()=>{const b=await chromium.launch();const records=[];
for(const [width,height] of [[1728,970],[2056,1180],[1440,800],[390,844]])for(const route of ['/','/HA?q=2026Q2','/value','/s/AAPL','/about']){
 const p=await b.newPage({viewport:{width,height}});
 await p.addInitScript(()=>{window.events=[];new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.interactionId)window.events.push({name:e.name,duration:e.duration,processing:e.processingEnd-e.processingStart,delay:e.processingStart-e.startTime});}).observe({type:'event',durationThreshold:16,buffered:true});});
 await p.goto((process.env.AUDIT_URL||'http://localhost:3958')+route,{waitUntil:'load'});await p.waitForTimeout(500);
 async function act(name,fn){await p.evaluate(()=>window.events=[]);await fn();await p.waitForTimeout(250);const events=await p.evaluate(()=>window.events);const row={width,route,name,maxMs:Math.max(0,...events.map(e=>e.duration)),events};records.push(row);console.log(width,route,name,row.maxMs);fs.writeFileSync(root+'/timing.json',JSON.stringify(records,null,2));}
 await act('Search open',()=>p.getByRole('navigation',{name:'Site tools'}).getByRole('button',{name:'Search',exact:true}).click());
 const input=p.getByRole('combobox',{name:/Search investor/});for(const ch of 'apple')await act('Search type '+ch,()=>input.press(ch));
 await act('Search close',()=>p.keyboard.press('Escape'));
 if(route==='/'||route.startsWith('/HA')||route==='/value'){
  await act('Previous quarter',()=>p.getByRole('button',{name:'Previous quarter',exact:true}).click());
  await p.waitForTimeout(400);await act('Next quarter',()=>p.getByRole('button',{name:'Next quarter',exact:true}).click());
 }
 if(route==='/value'){
  const toggle=p.locator('.map-toolbar .design-toggle:visible').filter({hasText:'Western markets'});
  for(const name of ['All markets','Western markets','All markets warm','Western markets warm']){await act(name,()=>toggle.click());await p.waitForTimeout(400);}
  for(const label of ['Country','Sector']){const filter=p.getByRole('combobox',{name:label,exact:true});if(await filter.isVisible()){await act(label+' open',()=>filter.click());await act(label+' keyboard focus',()=>p.keyboard.press('ArrowDown'));await act(label+' close',()=>p.keyboard.press('Escape'));}}
  for(const [name,button]of [['All companies',p.getByRole('button',{name:'All companies',exact:false})],['Method',p.getByRole('button',{name:'Method',exact:true})],['Filters',p.getByRole('button',{name:'Filters',exact:true})],['Buy list',p.locator('.main-more').first()],['Next list',p.locator('.next-list-open')],['Quality list',p.locator('.main-more').last()]]){
   if(await button.isVisible()){await act(name+' open',()=>button.click());await p.waitForTimeout(500);await act(name+' close',()=>p.getByRole('button',{name:'Close panel'}).click());await p.locator('dialog[open]').waitFor({state:'detached'});}
  }
 }
 if(route==='/s/AAPL'){
  const targets=[p.locator('.company-holders-strip'),p.locator('.business-open'),p.getByRole('button',{name:/^Price story:/}),...await p.locator('.tile-open').all()];
  for(const target of targets){if(!await target.isVisible())continue;const name=(await target.getAttribute('aria-label')||await target.innerText()).slice(0,55);await act(name,()=>target.click());await p.waitForTimeout(500);await act('Close '+name,()=>p.getByRole('button',{name:'Close panel'}).click());await p.locator('dialog[open]').waitFor({state:'detached'});}
 }
 await p.close();
}
await b.close();console.log('MAX',Math.max(...records.map(r=>r.maxMs)),'OVER',records.filter(r=>r.maxMs>100).length);})();
