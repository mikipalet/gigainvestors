import {expect,test} from '@playwright/test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {matchesMarket} from '../../lib/value/listing-details';
import {unpackView} from '../../lib/value/browser-view';
test.skip(!process.env.VALUE_STORE_DIR,'Requires a complete local published store');
const read=(file:string)=>JSON.parse(readFileSync(path.join(process.env.VALUE_STORE_DIR!,file),'utf8'));
for(const markets of ['western','all'])for(const year of ['2005','2012','2018','Today']){
 test(`time travel ${year} ${markets} agrees with published counts`,async({page})=>{
  const history=read('history/index.json'),meta=read('meta.json');
  const summary=year==='Today'?(markets==='all'?meta.story:meta.western.story):(markets==='all'?history.perYear:history.western.perYear)[year];
  await page.goto(`/?${new URLSearchParams({...year!=='Today'?{year}:{},...markets==='all'?{markets}:{}})}`,{waitUntil:'networkidle'});
  const main=page.locator('.main-view');
  await expect(main).toHaveAttribute('data-frame',year);
  await expect(main).toHaveAttribute('data-buy-count',String(summary.atBuy));
  await expect(main).toHaveAttribute('data-total',String(summary.qualityPasses));
  // 2005 legitimately has no buys in the source; do not invent picks.
  if(year!=='2005')expect(summary.atBuy).toBeGreaterThan(0);
  if(year!=='Today'){const gain=summary.medianReturnAtBuy;await expect(page.locator('.simulation-line')).toContainText(gain==null?'median gain not available':`median gain ${gain>=0?'+':''}${Math.round(gain*100)}%`);}
  const rows=unpackView(read(year==='Today'?meta.views.current:meta.views.years[year])).filter(r=>r.t==='PPPPP'&&matchesMarket(r,markets==='all'?'all':''));
  const distances=rows.filter(r=>!r.b).map(r=>year==='Today'?(r.quote&&r.v?r.quote[0]/(r.v[1]*(1-(r.m??.25))):null):r.historicalPrice?(r.historicalPrice.price&&r.historicalPrice.buyPrice?r.historicalPrice.price/r.historicalPrice.buyPrice:null):r.pm??null).filter((n):n is number=>n!==null);
  const next=Number(await page.locator('.main-next h2 span').textContent());
  const rest=await page.locator('.main-band-title strong').allTextContents();
  expect(next).toBeGreaterThan(0);
  expect(next).toBe(distances.filter(n=>n<=1.5).length);
  expect(rest.map(text=>parseInt(text))).toEqual([distances.filter(n=>n>1.5&&n<=3).length,distances.filter(n=>n>3).length]);
  expect(rest.reduce((sum,text)=>sum+parseInt(text),0)).toBeGreaterThan(0);
  expect(next+rest.reduce((sum,text)=>sum+parseInt(text),0)+summary.atBuy).toBeLessThanOrEqual(summary.qualityPasses);
 });
}
