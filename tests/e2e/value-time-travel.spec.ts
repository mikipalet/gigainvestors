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
  if(year!=='Today'){const gain=summary.medianReturnAtBuy;if(gain!=null)await expect(page.locator('.simulation-line')).toContainText(`median gain ${gain>=0?'+':''}${Math.round(gain*100)}%`);await expect(page.locator('.simulation-line')).not.toContainText('not available');}
  const rows=unpackView(read(year==='Today'?meta.views.current:meta.views.years[year])).filter(r=>r.t==='PPPPP'&&matchesMarket(r,markets==='all'?'all':''));
  const expectedNext=rows.filter(r=>!r.b&&(year==='Today'?r.expected!=null:r.gain!=null)&&(year==='Today'?r.quote&&r.v:r.historicalPrice?.price&&r.historicalPrice?.buyPrice));
  const shown=await page.locator('.main-next-row').count();
  const rest=Number(await page.locator('.main-rest>span b').textContent());
  expect(shown).toBeLessThanOrEqual(expectedNext.length);
  expect(shown+rest+summary.atBuy).toBe(summary.qualityPasses);
  expect(await page.locator('.main-next-row .main-return').allTextContents()).not.toContain('—');
 });
}
