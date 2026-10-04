// Verify unified navigation, host redirects, canonical identity and time travel on a built site.
import {request} from 'node:http';
import {chromium} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
const [base='http://localhost:3017',out='/tmp/merge-1-qa']=process.argv.slice(2);
const samples=[['/','/value'],['/?q=2018Q3','/value?q=2018Q3'],['/aapl.us','/s/AAPL'],['/aapl.us?q=2018Q3','/s/AAPL?q=2018Q3'],['/PLX.PA?markets=all','/s/PLX.PA?markets=all'],['/7203.jp','/s/7203.JP'],['/ko.us','/s/KO'],['/googl.us','/s/GOOGL'],['/adbe.us','/s/ADBE'],['/jpm.us','/s/JPM'],['/lulu.us','/s/LULU'],['/wkl.as','/s/WKL.AS'],['/brk-b.us','/s/BRK-B'],['/m%26m.nse','/s/M%26M.NSE'],['/method','/value/method'],['/forward','/value/forward'],['/sitemap.xml','/sitemap.xml'],['/robots.txt','/robots.txt'],['/value/aapl.us?q=2011Q4&markets=all','/s/AAPL?q=2011Q4&markets=all'],['/value?q=2018Q3','/value?q=2018Q3']];
const checks=[];
const check=(name,pass,details)=>{checks.push({name,pass,details});if(!pass)throw Error(`${name}: ${JSON.stringify(details)}`);};
mkdirSync(out,{recursive:true});
try{
 if(base.includes('localhost'))for(const [path,target]of samples){const response=await new Promise((resolve,reject)=>{const req=request(base+path,{headers:{host:'value.gigainvestors.com'}},res=>{res.resume();resolve({status:res.statusCode,to:res.headers.location});});req.on('error',reject);req.end();});check('308 '+path,response.status===308&&response.to==='https://gigainvestors.com'+target,response);}
 const b=await chromium.launch();try{
 const p=await b.newPage({viewport:{width:1728,height:970}});
 await p.goto(base+'/BRK?q=2018Q3',{waitUntil:'networkidle'});
 check('Investor restores quarter',(await p.getByRole('slider',{name:'Quarter',exact:true}).getAttribute('aria-valuetext')).replaceAll(' ','')==='2018Q3');
 check('Historical checklist snapshot served',await p.evaluate(async()=>{const r=await fetch('/api/value/data/history/2018Q3.json');return r.status===200;}));
 await p.locator('.checklist-mark').first().waitFor();check('Historical investor verdicts render',await p.locator('.checklist-mark').count()>0);
 await p.locator('a[href^="/s/AAPL"]').last().click();await p.waitForLoadState('networkidle');
 check('Holding opens one company with quarter',p.url()===base+'/s/AAPL?q=2018Q3',p.url());
 check('Company canonical',await p.locator('link[rel=canonical]').getAttribute('href')==='https://gigainvestors.com/s/AAPL');
 check('Historical holder quarter',(await p.locator('.company-holders-strip').innerText()).includes('2018 Q3'));
 await p.keyboard.press('/');await p.locator('.search-modal input').fill('Warren');await p.getByRole('option').filter({hasText:'Warren Buffett'}).waitFor();await p.getByRole('option').filter({hasText:'Warren Buffett'}).click();await p.waitForLoadState('networkidle');
 check('Shared search opens investor with quarter',p.url()===base+'/BRK?q=2018Q3',p.url());
 await p.locator('.dock-tools a').filter({hasText:'Checklist'}).click();await p.waitForLoadState('networkidle');
 check('Checklist restores quarter',await p.locator('.main-view').getAttribute('data-frame')==='2018Q3');
 await p.keyboard.press('ArrowLeft');await p.waitForTimeout(700);check('Shared arrow steps calendar quarter',new URL(p.url()).searchParams.get('q')==='2018Q2',p.url());
 await p.keyboard.press('/');await p.locator('.search-modal input').fill('AAPL');await p.getByRole('option').filter({hasText:'AAPL'}).first().waitFor();await p.getByRole('option').filter({hasText:'AAPL'}).first().click();await p.waitForLoadState('networkidle');check('Company search keeps quarter',p.url()===base+'/s/AAPL?q=2018Q2',p.url());
 for(const ticker of ['PLX.PA','7203.JP']){await p.goto(base+'/s/'+ticker,{waitUntil:'networkidle'});check(ticker+' has no holder strip',await p.locator('.company-holders-strip').count()===0);check(ticker+' canonical',await p.locator('link[rel=canonical]').getAttribute('href')==='https://gigainvestors.com/s/'+ticker);}
 await p.goto(base+'/s/LEN.B',{waitUntil:'networkidle'});check('13F-only layout retained',await p.locator('.locks-scroll').count()>0&&await p.locator('.one-dossier').count()===0);
 }finally{await b.close();}
}finally{writeFileSync(out+'/merge-check.json',JSON.stringify(checks,null,2));}
console.log(`${checks.length} checks passed`);
