// Capture before editing HTML, then compare after. Build output stays in .next.
// Retain raw pixel counts; use the repository change-review threshold (0.2%) for visual diffs.
import {chromium} from '@playwright/test';
import sharp from 'sharp';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
const [mode,base,out='/tmp/agent-1-visual']=process.argv.slice(2);
const sizes=['1728x970','2056x1180','1440x800','390x844'];
const cases=[['home','/value'],['ko','/value/ko.us'],['adbe','/value/adbe.us'],['googl','/value/googl.us'],['jpm','/value/jpm.us'],['year','/value/?year=2011'],['method','/value/method'],['investors','/'],['investor','/BRK'],['stock','/s/KO']];
mkdirSync(out,{recursive:true});
const browser=await chromium.launch(); const report=[];
try {for(const size of sizes)for(const [name,path] of cases){
 const [width,height]=size.split('x').map(Number);const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
 const response=await page.goto(base+path,{waitUntil:'networkidle',timeout:90000});
 if(!response?.ok())throw Error(`${path}: ${response?.status()}`);
 await page.addStyleTag({content:'nextjs-portal{display:none!important} *{animation:none!important;transition:none!important;caret-color:transparent!important}'});
 await page.waitForTimeout(700);const png=await page.screenshot();const file=`${out}/${size}-${name}`;
 if(mode==='before')writeFileSync(file+'-before.png',png);
 else {writeFileSync(file+'-after.png',png);const [a,b]=await Promise.all([readFileSync(file+'-before.png'),png].map(p=>sharp(p).removeAlpha().raw().toBuffer()));let changed=0;for(let i=0;i<a.length;i+=3)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>30)changed++;report.push({size,name,changedPixels:changed,changedShare:changed/(width*height),visualDiff:changed/(width*height)>0.002});console.log(size,name,changed);}
 await page.close();
}}finally{await browser.close();}
if(mode!=='before'){writeFileSync(out+'/report.json',JSON.stringify(report,null,2));if(report.some(r=>r.visualDiff))process.exitCode=1;}
