import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch();const runs=[];
try{for(let i=0;i<3;i++){
 const page=await browser.newPage({viewport:{width:1728,height:970},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push({message:e.message,stack:e.stack}));
 await page.goto('http://127.0.0.1:3048/s/nflx.us',{waitUntil:'networkidle',timeout:90000});
 await page.locator('[data-testid=tile-understandable] .tile-open').click();
 await page.locator('dialog[open]').waitFor();
 runs.push({run:i+1,drawerOpened:true,errors});await page.close();
}}finally{await browser.close();writeFileSync('research/understandable/outputs/browser-error-recheck.json',JSON.stringify(runs,null,2)+'\n');}
console.log(JSON.stringify(runs));
