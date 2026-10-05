import {chromium} from '@playwright/test';import fs from 'node:fs';
const browser=await chromium.launch();const rows=[];
try{for(const [width,height] of [[1728,970],[390,844]]){const page=await browser.newPage({viewport:{width,height}});await page.goto('http://localhost:3047/s/NSRGY',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Search',exact:true}).click();
for(const query of ['nestle','diageo','alibaba','gsk','carlsberg','u-haul','biglari']){await page.locator('.search-modal input').fill(query);await page.waitForTimeout(300);const hits=await page.locator('[data-company]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.company,text:n.textContent})));rows.push({width,height,query,hits,pass:hits.length===1});await page.screenshot({path:'/Users/miki/data/value-dedupe-2/browser-gate/search-'+query+'-'+width+'.png'});}await page.close();}}finally{await browser.close();}
fs.writeFileSync('docs/value/dedupe-2/browser-search.json',JSON.stringify({rows,failures:rows.filter(r=>!r.pass)},null,2)+'\n');console.log('searches',rows.length,'failures',rows.filter(r=>!r.pass).length);

if(rows.some(r=>!r.pass))process.exitCode=1;
