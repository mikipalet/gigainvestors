import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root=process.env.VALUE_STAGING_DIR;
const base=process.env.BASE_URL;
// A reused staging directory can also hold private calibration/QA artifacts.
// Scan precisely the publisher's output contract; verify private paths are not served below.
const published=/^(?:views\/[a-f0-9]{24}|index\/(?:[A-Z]{2}|default)|dossiers\/\d{3}|prices\/[A-Z]{2}|search\/(?:manifest|[a-z0-9][a-z0-9_&.\-]+)|history\/(?:index|companies|[0-9]{4})|aliases|meta|top)\.json$/;
// Do not confuse a bank's “checking accounts” or a chipmaker's verification
// products with operational work assigned to the reader.
const forbidden=/verify valuation|share count[^.\n]{0,100}(?:check|verif)|needs? verification|not yet verified|\bunverified\b|being checked|dataQualityFlags|^checking$/i;
test('published staging JSON contains no private share-review language',()=>{
  assert.ok(root,'Set VALUE_STAGING_DIR to the published local staging output');
  const failures=[];
  function scan(directory){
    for(const entry of readdirSync(directory,{withFileTypes:true})){
      const file=path.join(directory,entry.name);
      if(entry.isDirectory())scan(file);
      else if(published.test(path.relative(root,file))){
        const inspect=value=>{
          if(typeof value==='string'&&forbidden.test(value))failures.push(`${path.relative(root,file)}: ${value}`);
          else if(value&&typeof value==='object')for(const [key,child] of Object.entries(value)){
            if(key==='dataQualityFlags')failures.push(`${path.relative(root,file)}: ${key}`);
            inspect(child);
          }
        };
        inspect(JSON.parse(readFileSync(file,'utf8')));
      }
    }
  }
  scan(root);
  assert.deepEqual(failures,[]);
});
test('rendered home, historical view, dossiers and every drawer tab contain no private language',async()=>{
  assert.ok(base,'Set BASE_URL to a local production server');
  for(const file of ['buffett-check/purchases.json','buy-audit.json'])assert.equal((await fetch(base+'/api/value/data/'+file)).status,404);
  const browser=await chromium.launch();
  try {
    for(const width of [390,1728]){
      const page=await browser.newPage({viewport:{width,height:970}});
      const inspect=async()=>{
        const text=await page.evaluate(()=>document.body.innerText+' '+[...document.querySelectorAll('[aria-label],[title]')].map(e=>(e.getAttribute('aria-label')??'')+' '+(e.getAttribute('title')??'')).join(' '));
        assert.doesNotMatch(text,forbidden,`${page.url()} width=${width}`);
      };
      for(const route of ['/', '/?year=2018','/ko.us','/adbe.us','/v.us','/dnp.war','/race.mi','/infy.us','/hsy.us']){
        await page.goto(base+route,{waitUntil:'networkidle'});await inspect();
        if(route==='/'){
          await page.getByRole('button',{name:'Search companies',exact:true}).click();
          await page.getByRole('combobox',{name:'Search investor, firm, ticker, company'}).fill('coca');
          await page.locator('#search-results [role=option]').first().waitFor();await inspect();
          await page.keyboard.press('Escape');
        }
        for(const tile of await page.locator('[data-testid^="tile-"]').all()){
          await tile.click();await page.getByRole('dialog').waitFor();await inspect();
          for(const tab of await page.getByRole('tab').all()){await tab.click();await inspect();}
          await page.getByRole('button',{name:'Close panel',exact:true}).click();
        }
      }
      await page.close();
    }
  } finally {await browser.close();}
});
