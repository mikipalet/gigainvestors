import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from '@playwright/test';
import {checkTimeTravel} from '../../../../scripts/value/live-check';
const root=process.env.PUBFIX_ROOT!;
async function main(){
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('response',r=>{if(r.status()>=400)console.error('HTTP',r.status(),new URL(r.url()).pathname);});
 page.on('requestfailed',r=>console.error('request failed',new URL(r.url()).pathname,r.failure()?.errorText));
 page.on('pageerror',e=>console.error('page error',e.message));
 const history=JSON.parse(readFileSync(path.join(process.env.VALUE_STORE_DIR!,'history/index.json'),'utf8'));
 await checkTimeTravel(page,history,'http://127.0.0.1:3189/value');
 console.log('Time travel passed');
}catch(error){
 const text=error instanceof Error?error.message:String(error);
 writeFileSync(path.join(root,'evidence/time-travel-error.txt'),text);console.error(text);process.exitCode=1;
}finally{await browser.close();}

}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
