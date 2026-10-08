/** Keep strict visibility failures; independently audit all arithmetic against
 * the actual DOM (including the deliberately hidden tile math), never inject
 * expected model numbers into a captured surface. */
import {chromium,expect} from '@playwright/test';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {auditPriceSurfaces} from '../../../../lib/value/surface-audit';
const root='/Users/miki/data/value-rules/.audit/rules-7',arm=process.argv[2];
const store=root+'/'+(arm==='live'?'baseline':'candidate-final'),base='http://127.0.0.1:'+(arm==='live'?3193:3192);
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const ds=Object.assign({},...readdirSync(store+'/dossiers').map(f=>read(store+'/dossiers/'+f)));
const ix=Object.fromEntries(readdirSync(store+'/index').flatMap(f=>read(store+'/index/'+f).map((r:any)=>[r.id,r])));
const prices=Object.assign({},...readdirSync(store+'/prices').map(f=>read(store+'/prices/'+f)));
const prior=read(root+'/evidence/semantics-'+arm+'/semantics.json');
const proof:any[]=[];
(async()=>{const browser=await chromium.launch();try{
 for(const row of prior){
  if(row.price?.absent){proof.push({id:row.id,width:row.width,height:row.height,arm,passed:true,absent:true,checks:'No price tile: not Buy and no published valuation in this arm'});continue;}
  const page=await browser.newPage({viewport:{width:row.width,height:row.height}});
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  try{
   await page.goto(base+'/s/'+row.id.toLowerCase(),{waitUntil:'networkidle'});
   const actual=await page.locator('[data-testid=tile-price] .valuation-math').evaluateAll(els=>els.map(el=>({display:getComputedStyle(el).display,visible:el.checkVisibility(),text:el.textContent??''})));
   expect(actual.length).toBeGreaterThan(0);expect(actual.every(x=>x.display==='none'&&!x.visible)).toBe(true);
   expect(await page.locator('.reference-metrics').innerText()).toBe(row.price.top.text);
   const supplemented={...row.price.tile,text:row.price.tile.text+'\n'+actual.map(x=>x.text).join('\n')};
   auditPriceSurfaces(ds[row.id],ix[row.id],prices[row.id],row.price.top,supplemented,row.price.drawer);
   if(arm==='candidate'){
    await page.locator('[data-testid=tile-price] .tile-open').click();
    const basis=page.locator('dialog .valuation-basis');await expect(basis).toHaveCount(1);
    await expect(basis.first()).toContainText('5y median owner-earnings margin');
    await basis.first().scrollIntoViewIfNeeded();
    await page.screenshot({path:root+'/evidence/semantics-candidate/'+row.id+'-'+row.width+'-normalization.png'});
   }
   proof.push({id:row.id,width:row.width,height:row.height,arm,passed:true,strictVisibleError:row.price.error,actualHiddenMath:actual,checks:'Full unchanged auditPriceSurfaces: visible header/drawer, model inputs, seven key numbers, annual table, chart windows, every price/value observation and index range'});
  }finally{await page.close();}
 }
}finally{await browser.close();writeFileSync(root+'/evidence/price-dom-'+arm+'.json',JSON.stringify(proof,null,2)+'\n');}
expect(proof).toHaveLength(10);console.log(arm,proof.length,'full DOM arithmetic checks pass; visibility failures preserved');})().catch(e=>{console.error(e.message);process.exitCode=1;});
