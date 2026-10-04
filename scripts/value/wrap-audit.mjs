// Browser geometry audit. Run: node scripts/value/wrap-audit.mjs BASE OUTPUT [quick]
import {chromium,webkit} from '@playwright/test';
import {mkdirSync,writeFileSync,statfsSync} from 'node:fs';
import {audit} from './design-audit.mjs';
export function wrapAudit(){
 const root=document.querySelector('dialog[open]')??document.querySelector('.value-page');
 const issues=[];
 const visible=e=>e.checkVisibility({visibilityProperty:true,opacityProperty:true})&&!e.closest('.sr-only,svg,[popover]:not(:popover-open)');
 const fragments=e=>{const r=document.createRange();r.selectNodeContents(e);return [...r.getClientRects()].filter(r=>r.width>0&&r.height>0)};
 for(const e of root.querySelectorAll('dt,.annual-field')){
  if(!visible(e))continue;
  const tops=new Set(fragments(e).map(r=>Math.round(r.top)));
  if(tops.size>1)issues.push(`label wraps: ${e.textContent.trim()}`);
 }
 for(const row of root.querySelectorAll('.memo-lines>div,.drawer-numbers>div,.valuation-inputs>div,.tile-support>div,.reference-metrics>div,.method-rules dl>div')){
  if(!visible(row))continue;
  const dt=row.querySelector('dt'),dd=row.querySelector('dd');if(!dt||!dd)continue;
  const a=dt.getBoundingClientRect(),b=dd.getBoundingClientRect();
  if(Math.abs(a.top-b.top)>1)issues.push(`label/value top mismatch: ${dt.textContent.trim()}`);
  if(b.left<a.right-1)issues.push(`value outside own column: ${dt.textContent.trim()}`);
 }
 // Count actual words on each line, including nested links/buttons. A short
 // first line is only a finding when three words fit the available content box.
 for(const e of root.querySelectorAll('*')){
  if(!visible(e)||![...e.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim()))continue;
  const words=[],walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){const n=walker.currentNode;if(!visible(n.parentElement))continue;let separate=false;for(let a=n.parentElement;a&&a!==e;a=a.parentElement){if(!['inline','contents'].includes(getComputedStyle(a).display)){separate=true;break;}}if(separate)continue;for(const m of n.textContent.matchAll(/\S+/g)){const r=document.createRange();r.setStart(n,m.index);r.setEnd(n,m.index+m[0].length);const b=r.getBoundingClientRect();if(b.width&&b.height)words.push({text:m[0],left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width});}}
  if(words.length<3)continue;
  const line=words[0],first=words.filter(w=>Math.min(w.bottom,line.bottom)-Math.max(w.top,line.top)>Math.min(w.bottom-w.top,line.bottom-line.top)*.5);
  if(first.length>=3||first.length===words.length)continue;
  const cs=getComputedStyle(e);let block=e;while(getComputedStyle(block).display==='inline'&&block.parentElement)block=block.parentElement;const box=block.getBoundingClientRect(),available=box.right-line.left-parseFloat(getComputedStyle(block).paddingRight);
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const needed=ctx.measureText(words.slice(0,3).map(w=>w.text).join(' ')).width;
  if(available>needed+16)issues.push(`short first line (${first.length} words with ${Math.round(available-needed)}px spare): ${e.textContent.trim().slice(0,100)}`);
 }
 return [...new Set(issues)];
}
const [base='http://localhost:3942',out='/tmp/wrap-2',mode]=process.argv.slice(2);
mkdirSync(out,{recursive:true});
const report=[];
for(const [engine,type] of Object.entries(process.env.QA_ENGINE==='webkit'?{webkit}:mode==='quick'||process.env.QA_ENGINE==='chromium'?{chromium}:{chromium,webkit})){
 const browser=await type.launch();
 const sizes=mode==='quick'?[[1568,900]]:process.env.QA_VIEWPORTS?.split(',').map(s=>s.split('x').map(Number))??(process.env.QA_WIDTHS??'1280,1440,1568,1728,2056,390').split(',').map(Number).map(width=>[width,width===390?844:900]);
 try{for(const [width,height] of sizes){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,reducedMotion:'reduce'});
 try{for(const path of mode==='quick'?['/s/KO']:(process.env.QA_PATHS??'/s/KO,/s/AAPL,/s/PLX.PA,/s/ADBE,/value').split(',')){
  const disk=statfsSync('/');if(disk.bavail*disk.bsize<4*1024**3)throw Error('DISK STOP');
  await page.goto(base+path,{waitUntil:'networkidle',timeout:90000});await page.evaluate(()=>document.fonts.ready);
  await page.locator('.one-dossier,.main-view,.method-page').first().waitFor();
  const record=async state=>{await page.waitForLoadState('networkidle');await page.waitForFunction(()=>!document.querySelector('dialog[open] [aria-busy="true"]'));await page.mouse.move(0,0);await page.waitForTimeout(400);const wraps=await page.evaluate(wrapAudit),layout=await page.evaluate(audit);report.push({engine,width,height,path,state,wraps,...layout});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(`${engine} ${width} ${path} ${state}: wraps=${wraps.length} layout=${layout.issues.length}`);if(engine==='webkit'&&width===1568&&path==='/s/KO'&&state==='page'){await page.screenshot({path:out+'/KO-1568x900-webkit.png'});await page.locator('[data-testid="the-business"]').screenshot({path:out+'/KO-business-1568-webkit.png'});}};
  await record('page');
  if(mode==='quick')continue;
  const buttons=page.locator('.business-open,.tile-open,.company-holders-strip,.holder-summary,.about-method,[data-testid="price-story-line"],.main-more');
  for(let i=0;i<await buttons.count();i++){const button=buttons.nth(i);if(!await button.isVisible())continue;const name=await button.getAttribute('aria-label')||await button.innerText();await button.click();await page.locator('dialog[open] .panel-content[aria-busy="false"]').waitFor();await record(name);await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'detached'});}
 }}finally{await page.close();}
 }}finally{await browser.close();}
}
const bad=report.filter(r=>r.wraps.length||r.issues.length);console.log(`${bad.length}/${report.length} states with findings`);if(bad.length)process.exitCode=1;
