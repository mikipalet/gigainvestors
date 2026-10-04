import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const b=await chromium.launch(),out=[];
try{
 for(const [width,height] of [[1728,970],[2056,1180],[1440,800],[390,844]]){
  const p=await b.newPage({viewport:{width,height}});
  for(const route of ['/s/AAPL','/s/PLX.PA']){
   await p.goto('http://localhost:3941'+route,{waitUntil:'networkidle'});await p.waitForTimeout(500);
   const current=await p.locator('.one-dossier').innerText();
   for(const suffix of ['?q=2018Q3','?q=2018%20Q3']){
    await p.goto('http://localhost:3941'+route+suffix,{waitUntil:'networkidle'});await p.waitForTimeout(500);
    assert.equal(await p.locator('.one-dossier').innerText(),current);
    assert.equal(await p.locator('input[type=range]').count(),0);
    assert.equal(await p.locator('.site-brand').count(),0);
    await p.keyboard.press('ArrowLeft');assert.equal(await p.locator('.one-dossier').innerText(),current);
    out.push({width,height,route:route+suffix,current:true,noSlider:true,noAddedBrand:true,arrowsDoNotTravel:true});
   }
   if(route==='/s/AAPL'){
    const rects=await p.evaluate(()=>({button:document.querySelector('.company-holders-strip').getBoundingClientRect().toJSON(),band:document.querySelector('.dossier-band').getBoundingClientRect().toJSON()}));
    assert(rects.button.top>=rects.band.top&&rects.button.bottom<=rects.band.bottom);
    await p.getByRole('button',{name:/Open all .* holders/}).click();await p.locator('dialog[open] .company-holders-table').waitFor();
    const rows=await p.locator('.company-holders-table tbody tr').count();assert(rows>0);
    const held=await p.locator('.company-holders-table').innerText();
    await p.locator('.holders-chart svg').first().click({position:{x:25,y:30}});
    assert.equal(await p.locator('.company-holders-table').innerText(),held);
    const next=p.getByRole('button',{name:'Next →',exact:true});if(await next.isVisible()){await next.click();assert((await p.locator('.company-holders-panel nav').innerText()).includes('2 /'));}
    await p.keyboard.press('Escape');await p.locator('dialog[open]').waitFor({state:'detached'});assert.equal(await p.locator('dialog[open]').count(),0);
    out.push({width,height,route,holdersWithinBand:true,drawerRows:rows,pagination:true,close:true});
   }
  }
  await p.goto('http://localhost:3941/value',{waitUntil:'networkidle'});assert.equal(await p.locator('.site-brand').count(),0);await p.getByRole('button',{name:'Method',exact:true}).click();await p.locator('dialog[open]').waitFor();assert.equal(await p.locator('.site-brand').count(),0);await p.keyboard.press('Escape');
  await p.goto('http://localhost:3941/',{waitUntil:'networkidle'});assert.equal(await p.locator('.shared-dock a[href="/value"]').innerText(),'GigaValue');out.push({width,height,valueAndMethodNoAddedBrand:true,bottomButton:'GigaValue'});
  await p.close();writeFileSync('.owner-fix/flows.json',JSON.stringify(out,null,2));
 }
}finally{await b.close();}
console.log(`${out.length} flow checks passed`);
