// Run against a local candidate: node scripts/value/drawer-clipping-regression.mjs BASE
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {audit} from './design-audit.mjs';

const browser=await chromium.launch();
const results=[];
try {
  for(const [id,width,height,button,expectedWidth] of [
    ['lulu.us',1728,970,'In depth',600],
    ['lulu.us',1440,800,'In depth',560],
    ['kalmar.he',1440,800,'Open Lasting advantage evidence',680],
  ]) {
    const page=await browser.newPage({viewport:{width,height}});
    await page.goto(`${process.argv[2]??'http://localhost:3042'}/${id}`,{waitUntil:'networkidle'});
    await page.getByRole('button',{name:button,exact:button!=='In depth'}).click();
    const dialog=page.locator('dialog[open]');
    await dialog.waitFor();
    await page.waitForFunction(()=>!document.querySelector('dialog[open][data-fitting]'));
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(300);
    const result=await page.evaluate(audit);
    const geometry=await dialog.evaluate(el=>({width:el.getBoundingClientRect().width,font:el.style.cssText,columns:el.dataset.readingColumns}));
    const issues=result.issues.filter(x=>/cut|below the fold|overlap|off-screen|overflow/.test(x));
    results.push({id,width,height,geometry,issues});
    assert.equal(geometry.width,expectedWidth,'Fixed drawer width changed');
    await page.close();
  }
  console.log(JSON.stringify(results,null,2));
  assert.equal(results.flatMap(r=>r.issues).length,0,'Drawer text must fit its actual clipping ancestors');
} finally {
  await browser.close();
}
