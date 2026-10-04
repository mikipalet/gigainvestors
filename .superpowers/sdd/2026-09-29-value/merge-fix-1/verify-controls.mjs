import{chromium}from'@playwright/test';import{writeFileSync}from'node:fs';
const b=await chromium.launch(),out=[];
for(const [width,height]of(process.env.QA_VIEWPORTS??'1728x970,2056x1180,1440x800,390x844').split(',').map(x=>x.split('x').map(Number)))for(const route of(process.env.QA_PATHS??'/HA?q=2026Q2,/BRK,/vg,/psc,/TGM').split(',')){
 const p=await b.newPage({viewport:{width,height}});await p.addInitScript(()=>{window.events=[];new PerformanceObserver(l=>window.events.push(...l.getEntries().filter(e=>e.interactionId).map(e=>({duration:e.duration,name:e.name,processing:e.processingEnd-e.processingStart})))).observe({type:'event',durationThreshold:16,buffered:true});});await p.goto('http://localhost:3941'+route,{waitUntil:'networkidle'});await p.waitForTimeout(500);
 for(const [name,locator]of[['more-positions',p.getByRole('button',{name:/^\+\d+ more/})],['portfolio-chart',p.locator('svg[role=slider]')],['timeline-pointer',p.locator('input[type=range]')]]){
  if(!await locator.count())continue;
  await p.evaluate(()=>window.events=[]);if(name==='more-positions')await locator.click();else await locator.click({position:{x:100,y:20}});await p.waitForTimeout(700);const events=await p.evaluate(()=>window.events);out.push({width,height,route,name,max:Math.max(0,...events.map(e=>e.duration)),events});writeFileSync(process.argv[2]??'.owner-fix/investor-controls.json',JSON.stringify(out,null,2));
 }
 await p.close();
}
await b.close();console.log(JSON.stringify({states:out.length,max:Math.max(...out.map(x=>x.max)),failures:out.filter(x=>x.max>100)}));
