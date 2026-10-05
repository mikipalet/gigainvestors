// Exact, unmasked raster comparison against the deployed master UI.
// node scripts/value/coverage-layout-pixels.mjs <local> <live> <sample.json> <out>
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, statfsSync } from 'node:fs';
const [local,live,sampleFile,out]=process.argv.slice(2);
if(!local||!live||!sampleFile||!out)throw Error('local, live, sample and output required');
const sample=JSON.parse(readFileSync(sampleFile,'utf8'));
mkdirSync(out,{recursive:true});
const report={at:new Date().toISOString(),local,live,sampleFile,widths:(process.env.QA_WIDTHS??'390,1728').split(',').map(Number),baselineRef:sample.baselineRef,masking:false,tolerance:0,comparisons:[],errors:[]};
const save=()=>writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');
function disk(){const s=statfsSync('/');if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP');}
const browser=await chromium.launch();
async function settle(p){await p.evaluate(()=>document.fonts.ready);await p.waitForLoadState('networkidle');await p.mouse.move(0,0);await p.waitForTimeout(600);}
async function compare(pages,selector,id,width,state,index=0){
 disk();
 const name=`${id}-${width}-${state}-${index}`.replace(/[^a-z0-9_-]/gi,'_');
 const buffers=[],boxes=[];
 for(let i=0;i<2;i++){
  const loc=pages[i].locator(selector).nth(index);
  boxes.push(await loc.boundingBox());
  buffers.push(await loc.screenshot({path:`${out}/${name}-${i?'live':'local'}.png`,animations:'disabled'}));
 }
 const raw=await Promise.all(buffers.map(b=>sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true})));
 const dimensions=raw.map(r=>({width:r.info.width,height:r.info.height}));
 let differentPixels=0;
 if(raw[0].data.length!==raw[1].data.length||JSON.stringify(dimensions[0])!==JSON.stringify(dimensions[1]))differentPixels=null;
 else for(let i=0;i<raw[0].data.length;i+=4)if(raw[0].data.subarray(i,i+4).compare(raw[1].data.subarray(i,i+4)))differentPixels++;
 report.comparisons.push({id,width,state,index,selector,boxes,dimensions,differentPixels,sha256:buffers.map(b=>createHash('sha256').update(b).digest('hex')),files:[`${name}-local.png`,`${name}-live.png`]});save();
 if(differentPixels!==0)console.log(JSON.stringify({id,width,state,index,differentPixels}));
}
try{
 for(const width of (process.env.QA_WIDTHS??'390,1728').split(',').map(Number))for(const [position,id]of sample.baseline.entries()){
  if(width===1728&&position>=5)continue;
  disk();const height=width===390?844:970;
  const pages=await Promise.all([local,live].map(async(base)=>{
   const p=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce',colorScheme:'light'});
   await p.goto(`${base}/s/${id}`,{waitUntil:'networkidle',timeout:90000});await settle(p);return p;
  }));
  try{
   await compare(pages,'nav.site-dock',id,width,'bottom-bar');
   const signals=await pages[0].locator('.filing-signals').count();
   if(signals!==await pages[1].locator('.filing-signals').count())throw Error('Signal count differs');
   for(let i=0;i<signals;i++)await compare(pages,'.filing-signals',id,width,'compact-signals',i);
   const selectors=width===390?['.business-open',...Array.from({length:await pages[0].locator('.tile-open').count()},(_,i)=>`.tile-open >> nth=${i}`)]:['.business-open','.tile-open >> nth=0',`.tile-open >> nth=${await pages[0].locator('.tile-open').count()-1}`];
   for(const [n,selector]of selectors.entries()){
    const visible=await Promise.all(pages.map(async p=>await p.locator(selector).count()>0&&await p.locator(selector).isVisible()));
    if(!visible.every(Boolean)){report.errors.push({id,width,selector,error:'Required drawer unavailable',visible});continue;}
    await Promise.all(pages.map(async p=>{await p.locator(selector).click();await p.locator('dialog[open] [aria-busy=false]').waitFor();await settle(p);}));
    const state=n===0?'in-depth':`year-drawer-${n}`;
    await compare(pages,'dialog[open]',id,width,state);
    const tables=await pages[0].locator('dialog[open] .drawer-years table').count();
    if(tables!==await pages[1].locator('dialog[open] .drawer-years table').count())throw Error('Year-table count differs');
    for(let t=0;t<tables;t++)await compare(pages,'dialog[open] .drawer-years table',id,width,`${state}-table`,t);
    if(n===0){
     await Promise.all(pages.map(p=>p.locator('dialog[open] .panel-content').evaluate(e=>e.scrollTop=e.scrollHeight)));
     await Promise.all(pages.map(settle));await compare(pages,'dialog[open]',id,width,'in-depth-bottom');
    }
    await Promise.all(pages.map(async p=>{await p.keyboard.press('Escape');await p.locator('dialog[open]').waitFor({state:'detached'});await settle(p);}));
   }
   console.log(`${id} ${width}: compared`);
  }catch(e){report.errors.push({id,width,error:e.message});save();if(e.message==='DISK STOP')throw e;}
  finally{await Promise.all(pages.map(p=>p.close()));}
 }
}finally{await browser.close();report.finishedAt=new Date().toISOString();save();}
const changed=report.comparisons.filter(r=>r.differentPixels!==0);
console.log(JSON.stringify({comparisons:report.comparisons.length,changed:changed.length,errors:report.errors.length}));
if(changed.length||report.errors.length)process.exitCode=1;
