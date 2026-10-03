import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {audit} from './design-audit.mjs';
const out='.audit/spinoff-pub-1/screenshots';mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const results=[];
try{
 for(const [width,height] of [[1728,970],[2056,1180]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const capture=async name=>{await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);await page.mouse.move(0,0);await page.waitForTimeout(800);const geometry=await page.evaluate(audit);assert.equal(errors.length,0);const file=`${width}x${height}-${name}.png`;await page.screenshot({path:`${out}/${file}`});results.push({file,...geometry});};
  await page.goto('http://localhost:3027/plx.pa',{waitUntil:'networkidle'});await page.locator('.one-dossier').waitFor();assert.match(await page.locator('.one-dossier').innerText(),/7 years/);await capture('pluxee-page');
  await page.getByRole('button',{name:'Open Lasting advantage evidence',exact:true}).click();await page.locator('dialog[open]').waitFor();const notes=await page.locator('dialog[open] .drawer-table-note').allTextContents();assert(notes.some(t=>t.includes('FY2019–2020')&&t.includes('before the spin-off: Sodexo')));assert(notes.some(t=>t.includes('FY2021–2023')&&t.includes('combined accounts')));await capture('pluxee-lasting-advantage');
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Search companies',exact:true}).click();await page.locator('.search-modal input').fill('Pluxee');const option=page.getByRole('option').filter({hasText:'PLX.PA'});await option.waitFor();await capture('search-pluxee');await option.click();await page.waitForURL('**/plx.pa');await page.locator('.one-dossier').waitFor();
  await page.goto('http://localhost:3027/?gate=0&markets=all&country=FR',{waitUntil:'networkidle'});await page.locator('.main-view[aria-busy=false]').waitFor();await page.locator('.table-toggle').click();await page.locator('.compact-company-list[aria-busy=false]').waitFor();await page.getByRole('button',{name:/^Company /}).click();await page.locator('.compact-company-list[aria-busy=false]').waitFor();
  const row=page.locator('[data-company-row][data-company="ATO.PA"]');await row.waitFor();assert.match(await row.innerText(),/Not enough history yet/);await capture('all-companies-short-history');await page.close();
 }
}finally{await browser.close();writeFileSync(out+'/flow.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify({screenshots:results.length,issues:results.flatMap(r=>r.issues)}));
