import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {checkTimeTravel} from '/Users/miki/GitHub/superinvestors-wt/value-cover/scripts/value/live-check';
const base='http://localhost:3047';
async function main(){
 const history=JSON.parse(readFileSync('/Users/miki/data/value-dedupe-2/staging/release/history/index.json','utf8'));
 const browser=await chromium.launch();const rows=[];
 try{for(const [width,height]of [[1728,970],[390,844]]){
  const page=await browser.newPage({viewport:{width,height}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await checkTimeTravel(page,history,base+'/value');
  for(const [suffix,frame]of [['?q=2018Q3','2018Q3'],['?year=2018','2018Q4']]){
   const response=await page.goto(base+'/value'+suffix,{waitUntil:'networkidle'});
   const rendered=await page.locator('.main-view').getAttribute('data-frame');
   const rewrite=response?.headers()['x-middleware-rewrite'];
   if(!response?.ok()||rendered!==frame)throw Error('Quarter rewrite frame mismatch');
   rows.push({width,height,suffix,frame:rendered,status:response.status(),rewrite});
  }
  if(errors.length)throw Error(errors.join('; '));
  rows.push({width,height,checkTimeTravel:'pass',pageErrors:errors});await page.close();
 }}finally{await browser.close();}
 writeFileSync('docs/value/dedupe-2/live-check.json',JSON.stringify({source:'scripts/value/live-check.ts:checkTimeTravel',base,rows,failures:[]},null,2)+'\n');console.log('Time travel and historical query routes passed at both viewports');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
