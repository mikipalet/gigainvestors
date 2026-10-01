// Same leaf-bottom measurement as the owner's drawers.mjs, with explicit drawer selectors.
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync,statfsSync} from 'node:fs';
const [base='http://localhost:3017',out='/tmp/value-design17/drawers',paths='/wkl.as,/jpm.us,/cbg.lse,/race.mi']=process.argv.slice(2);
const sizes=(process.env.QA_VIEWPORTS??'1728x970,1440x800,2056x1180,390x844').split(',').map(s=>s.split('x').map(Number));
mkdirSync(out,{recursive:true});const browser=await chromium.launch();const report=[];
try {for(const [width,height] of sizes)for(const path of paths.split(',')){
 const page=await browser.newPage({viewport:{width,height}});await page.goto(base+path,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
 const buttons=page.locator((path==='/'||path.startsWith('/?'))?'.main-more,.table-toggle,.about-method':'.tile-open,.holder-summary,.thesis-source-button');
 for(let i=0;i<await buttons.count();i++){
  const s=statfsSync('/');if(s.bavail*s.bsize<5*1024**3)throw Error('DISK STOP: below 5 GiB');
  const button=buttons.nth(i),name=await button.getAttribute('aria-label')||await button.innerText();await button.click();const d=page.locator('dialog[open]');await d.waitFor();await page.mouse.move(0,0);await d.getByRole('button',{name:'Close panel'}).focus();await page.waitForTimeout(350);
  const metrics=await d.evaluate(el=>{const r=el.getBoundingClientRect();let used=0;for(const c of el.querySelectorAll('*')){if(c.children.length||!c.checkVisibility())continue;const b=c.getBoundingClientRect();if(b.width>2&&b.height>2)used=Math.max(used,b.bottom-r.top);}const content=el.querySelector('.panel-content');return {list:!!el.querySelector('.compact-company-list'),emptyBottomPct:Math.round(100*(1-used/r.height)),overflow:content.scrollHeight-content.clientHeight,tabs:el.querySelectorAll('[role=tab]').length};});
  const file=`${width}x${height}${path.replace(/[^a-z0-9]/gi,'_')}-${i}.png`;await page.screenshot({path:`${out}/${file}`});if(width<768&&metrics.overflow>1){await d.locator('.panel-content').evaluate(el=>el.scrollTop=el.scrollHeight);await page.screenshot({path:`${out}/${file.replace('.png','-bottom.png')}`});}report.push({width,height,path,name,file,...metrics});writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));
  await page.keyboard.press('Escape');await d.waitFor({state:'detached'});
 }await page.close();console.log(width,height,path);
}} finally {await browser.close();}console.log(JSON.stringify(report.map(({file,...r})=>r),null,2));

if(report.some(r=>r.list&&r.emptyBottomPct>=8))throw Error('List drawer empty area must be below 8%');
