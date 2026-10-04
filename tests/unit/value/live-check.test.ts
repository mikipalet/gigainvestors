import {chromium,type Browser} from '@playwright/test';
import {beforeAll,afterAll,expect,it} from 'vitest';
import {checkTimeTravel} from '@/scripts/value/live-check';
import type {HistoryIndex} from '@/lib/value/time-travel';
let browser:Browser;
beforeAll(async()=>{browser=await chromium.launch({headless:true});});
afterAll(async()=>browser?.close());
const history={years:[],quarters:['2018Q3','2026Q3'],western:{perQuarter:{'2018Q3':{atBuy:3},'2026Q3':{atBuy:7}}}} as unknown as HistoryIndex;
async function check(broken:string){
 const page=await browser.newPage();
 await page.route('https://value.test/**',route=>{
  const q=new URL(route.request().url()).searchParams.get('q')??'Today';
  const frame=broken==='deep-link'&&q==='2018Q3'?'Today':q;
  const buys=q==='2018Q3'?3:7;
  return route.fulfill({contentType:'text/html',body:`<div class="one-index" data-buy-count="${buys}"></div><section class="main-view" data-frame="${frame}" aria-busy="false" data-buy-count="${broken==='rows'?0:buys}"></section><input type="range" aria-label="Quarter" aria-valuetext="${frame.replace(/^(\d{4})Q(\d)$/,'$1 Q$2')}" onkeydown="if(event.key==='ArrowLeft'){event.preventDefault();document.querySelector('.main-view').setAttribute('data-frame','${broken==='step'?'Today':'2026Q3'}');this.setAttribute('aria-valuetext','2026 Q3');window.history.pushState({},'', '?q=2026Q3');}">`});
 });
 try{await checkTimeTravel(page,history,'https://value.test',500);}finally{await page.close();}
}
it('uses a real browser to step back and load the deep link',async()=>{await check('');});
it.each(['step','deep-link','rows'])('rejects a broken %s despite a successful page response',async broken=>{await expect(check(broken)).rejects.toThrow();},40_000);
