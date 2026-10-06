import {chromium,type Browser} from '@playwright/test';
import {beforeAll,afterAll,expect,it} from 'vitest';
import {checkTimeTravel} from '@/scripts/value/live-check';
import type {HistoryIndex} from '@/lib/value/time-travel';
let browser:Browser;
beforeAll(async()=>{browser=await chromium.launch({headless:true});});
afterAll(async()=>browser?.close());
const history={years:[],quarters:['2018Q3','2026Q3'],western:{perQuarter:{'2018Q3':{atBuy:3,avgReturnAtBuy:.1,avgReturnAll:.2},'2026Q3':{atBuy:7,avgReturnAtBuy:.1,avgReturnAll:.2}}}} as unknown as HistoryIndex;
async function check(broken:string){
 const page=await browser.newPage();
 await page.route('https://value.test/**',route=>{
  const q=new URL(route.request().url()).searchParams.get('q')??'Today';
  const frame=broken==='deep-link'&&q==='2018Q3'?'Today':q;
  const buys=q==='2018Q3'?3:7;
  const headline=(quarter:string,count:number)=>`${quarter.replace(/^(\d{4})Q/,'$1 Q')}: ${count} at a fair price. Up 10% since; ${broken==='headline'?'all covered companies':'analysed index companies'} +20%.`;
  return route.fulfill({contentType:'text/html',body:`<div class="one-index" data-buy-count="${buys}"></div><section class="index-story"><h1>${headline(q,buys)}</h1></section><section class="main-view" data-frame="${frame}" aria-busy="false" data-buy-count="${broken==='rows'?0:buys}"></section><input type="range" aria-label="Quarter" aria-valuetext="${frame.replace(/^(\d{4})Q(\d)$/,'$1 Q$2')}" onkeydown="if(event.key==='ArrowLeft'){event.preventDefault();document.querySelector('.main-view').setAttribute('data-frame','${broken==='step'?'Today':'2026Q3'}');document.querySelector('.index-story h1').textContent='${headline('2026Q3',7)}';this.setAttribute('aria-valuetext','2026 Q3');window.history.pushState({},'', '?q=2026Q3');}">`});
 });
 try{await checkTimeTravel(page,history,'https://value.test',500);}finally{await page.close();}
}
it('uses a real browser to step back and load the deep link',async()=>{await check('');});
it.each(['step','deep-link','rows','headline'])('rejects a broken %s despite a successful page response',async broken=>{await expect(check(broken)).rejects.toThrow();},40_000);

it.each(['ok','no-image','broken-image','no-page','http-error'])('checks company page rendering and decoded logo pixels (%s)',async state=>{
 const {checkCompanyPages}=await import('@/scripts/value/live-check');
 const page=await browser.newPage();
 await page.route('https://company.test/**',route=>route.fulfill({status:state==='http-error'?500:200,contentType:'text/html',body:state==='no-page'?'<h1>Error</h1>':`<main class="company-page"><div class="one-dossier"><div class="company-heading"><h1>Acme</h1><span class="company-logo">${state==='no-image'?'':`<img width="20" height="20" src="${state==='broken-image'?'data:image/png;base64,invalid':'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}">`}</span></div></div></main>`}));
 try{
  const run=checkCompanyPages(page,[{id:'ACME.US',file:'dossiers/000.json',country:'US',logo:'expected'}],'https://company.test',300);
  if(state==='ok')await run;else await expect(run).rejects.toThrow(/CRITICAL.*ACME.US/);
 }finally{await page.close();}
});
