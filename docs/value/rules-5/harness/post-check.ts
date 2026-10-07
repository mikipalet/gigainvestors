import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from '@playwright/test';
import {verifyPublication} from '../../../../scripts/value/post-publish';
import {checkTimeTravel} from '../../../../scripts/value/live-check';
const root=process.env.PUBFIX_ROOT!;
const repo=path.join(process.env.VALUE_CORPUS_DIR!,'publish-repo');
async function main(){
 await verifyPublication(repo,{check:async repo=>{
  const receipt=JSON.parse(readFileSync(path.join(repo,'.git/value-publish-pending.json'),'utf8'));
  // The ordinary real publish has already enforced the exact manifest invariant.
  const history=JSON.parse(readFileSync(path.join(repo,'history/index.json'),'utf8'));
  const browser=await chromium.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width:1440,height:900}});
   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await checkTimeTravel(page,history,'http://127.0.0.1:3189/value');
   await page.screenshot({path:path.join(root,'evidence/2018Q3.png')});
   writeFileSync(path.join(root,'evidence/live-check.json'),JSON.stringify({passed:true,latest:history.quarters.at(-1),deepLink:'2018Q3',pageErrors:errors,before:receipt.before,after:receipt.after},null,2));
   if(errors.length)throw Error(`Browser errors: ${errors.length}`);
  }catch(error){console.error(error instanceof Error?error.message:String(error));throw error;}finally{await browser.close();}
 }});
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
