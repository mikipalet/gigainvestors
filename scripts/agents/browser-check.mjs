import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.argv[2]??'http://127.0.0.1:3097';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1728,height:970}});
const alternate=()=>page.locator('link[rel=alternate][type="text/markdown"]');
try{
 await page.goto(base+'/BRK?q=2018%20Q3',{waitUntil:'networkidle'});
 assert.equal(await alternate().count(),1);
 assert.equal(new URL(await alternate().getAttribute('href')).searchParams.get('q'),'2018 Q3');
 assert.ok((await page.locator('section.sr-only').innerText()).includes('Positions, 2018 Q3'));
 await page.keyboard.press('ArrowLeft');await page.waitForTimeout(500);
 assert.equal(new URL(await alternate().getAttribute('href')).searchParams.get('q'),'2018 Q2');
 assert.ok((await page.locator('section.sr-only').innerText()).includes('Positions, 2018 Q2'));
 await page.goto(base+'/value/?q=2018Q3',{waitUntil:'networkidle'});
 assert.ok((await page.locator('section[aria-label="Published checklist data"]').innerText()).includes('2018Q3'));
 await page.keyboard.press('ArrowLeft');await page.waitForTimeout(900);
 assert.ok((await page.locator('section[aria-label="Published checklist data"]').innerText()).includes('2018Q2'));
 assert.equal(new URL(await alternate().getAttribute('href')).searchParams.get('q'),'2018Q2');
 await page.goto(base+'/value/ko.us',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:/valuation/i}).first().click();await page.waitForTimeout(800);
 const dialog=page.locator('dialog[open]');
 const before=await dialog.evaluate(el=>el.style.getPropertyValue('--reading-font'));
 assert.ok(await dialog.locator('[aria-label$="all chart observations"]').count());
 await dialog.evaluate(el=>{for(const span of el.querySelectorAll('[aria-label$="all chart observations"]'))span.remove();window.dispatchEvent(new Event('resize'));});await page.waitForTimeout(800);
 assert.equal(await dialog.evaluate(el=>el.style.getPropertyValue('--reading-font')),before,'Hidden chart observations must not alter drawer fitting');
 console.log('10 live time-travel, alternate-link and hidden-chart layout assertions passed.');
}finally{await browser.close();}
