// Scan every published dossier and rendered page text/accessible labels. No external writes.
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {chromium} from '@playwright/test';
const root=process.env.VALUE_STAGING_DIR,base=process.env.BASE_URL,out=process.env.AUDIT_OUT??'test-results/complete-1';
assert.ok(root,'VALUE_STAGING_DIR is required');mkdirSync(out,{recursive:true});
const forbidden=/not enough (?:evidence|data)|not reported|unavailable|\bunclear\b|not tested|cannot judge|evidence incomplete/i;
const failures=[],dossiers=[];
const scan=(v,loc)=>{
 if(typeof v==='string'&&forbidden.test(v))failures.push({loc,value:v});
 else if(v&&typeof v==='object')for(const [key,child] of Object.entries(v))scan(child,loc+'.'+key);
};
for(const file of readdirSync(path.join(root,'dossiers')).filter(f=>f.endsWith('.json'))){
 const data=JSON.parse(readFileSync(path.join(root,'dossiers',file),'utf8'));
 for(const d of Object.values(data)){scan(d,d.id);dossiers.push(d);}
}
const rows=readdirSync(path.join(root,'index')).filter(f=>f!== 'default.json').flatMap(f=>JSON.parse(readFileSync(path.join(root,'index',f),'utf8')));
assert.ok(rows.every(r=>/^[PF]{5}$/.test(r.t)),'Only decided companies may appear in indexes');
const indexed=new Set(rows.map(r=>r.id));
for(const file of readdirSync(path.join(root,'history')).filter(f=>/^\d{4}\.json$/.test(f))){
 const history=JSON.parse(readFileSync(path.join(root,'history',file),'utf8'));
 assert.ok(history.every(r=>indexed.has(r[0])&&/^[PF]{5}$/.test(r[1])),`Unresolved historical company in ${file}`);
}

for(const file of readdirSync(path.join(root,'search')).filter(f=>f!=='manifest.json')){
 const shard=JSON.parse(readFileSync(path.join(root,'search',file),'utf8'));
 for(const row of shard.rows??[])assert.ok(indexed.has(row[0]),`Search leaks ${row[0]}`);
}
const ui=[];
if(base){
 const browser=await chromium.launch();
 try{
  const before=JSON.parse(readFileSync(path.join(process.env.VALUE_CORPUS_DIR??path.join(os.homedir(),'value-corpus'),'completeness/before.json'),'utf8'));
  const formerly=new Set(before.companies.filter(a=>Object.values(a.results).includes('unclear')).map(a=>a.id));
  const ids=[...new Set(['HVID.CO','6048.JP','ADBE.US',...dossiers.filter(d=>indexed.has(d.id)&&formerly.has(d.id)).slice(0,12).map(d=>d.id)])].slice(0,12);
  assert.ok(ids.filter(id=>indexed.has(id)&&formerly.has(id)).length>=10,'At least ten formerly unresolved published dossiers are required');
  writeFileSync(path.join(out,'dossier-selection.json'),JSON.stringify(ids,null,2));
  for(const width of [390,1728]){
   const p=await browser.newPage({viewport:{width,height:970}});
   const inspect=async(label)=>{
    const text=await p.evaluate(()=>document.body.innerText+' '+[...document.querySelectorAll('[aria-label],[title]')].map(e=>(e.getAttribute('aria-label')??'')+' '+(e.getAttribute('title')??'')).join(' '));
    if(forbidden.test(text))failures.push({loc:`${p.url()} ${width} ${label}`,value:text.match(new RegExp('.{0,80}'+forbidden.source+'.{0,80}','i'))?.[0]});
    ui.push({url:p.url(),width,label,ok:!forbidden.test(text)});
   };
   for(const route of ['/', '/?markets=all','/?year=2018',...ids.map(id=>'/'+id.toLowerCase()),...dossiers.filter(d=>d.status==='insufficient_data').slice(0,1).map(d=>'/'+d.id.toLowerCase())]){
    const response=await p.goto(base+route,{waitUntil:'networkidle'});await inspect('page');
    if(route==='/hvid.co')assert.equal(response.status(),404,'HVID must remain private');
    if(route==='/'){
     await p.getByRole('button',{name:'Search companies',exact:true}).click();
     await p.getByRole('combobox',{name:'Search investor, firm, ticker, company'}).fill('coca');await p.waitForTimeout(400);await inspect('search');
     for(const query of ['HVID','LCID']){await p.getByRole('combobox',{name:'Search investor, firm, ticker, company'}).fill(query);await p.waitForTimeout(400);await p.waitForLoadState('networkidle');assert.equal(await p.getByRole('option').filter({hasText:new RegExp('\\b'+query+'\\b')}).count(),0,`${query} must not appear in search`);await inspect('excluded search');}
     await p.keyboard.press('Escape');
    }
    for(const tile of await p.locator('[data-testid^="tile-"]').all()){
     await tile.click();await p.getByRole('dialog').waitFor();await inspect('drawer');
     if(width===1728)await p.screenshot({path:path.join(out,`${route.slice(1)}-${await tile.getAttribute('data-testid')}-answer.png`)});
     for(const tab of await p.getByRole('tab').all()){
      await tab.click();await inspect(await tab.innerText());
      const select=p.locator('.data-series select');if(await select.count())for(const option of await select.locator('option').all()){await select.selectOption(await option.getAttribute('value')??await option.innerText());await inspect('series');}
      const next=p.getByRole('button',{name:'Next detail page'});
      for(let i=0;i<30&&await next.count()&&!await next.isDisabled();i++){await next.click();await inspect('detail page');}
     }
     if(width===1728&&route==='/adbe.us')await p.screenshot({path:path.join(out,`adbe-${await tile.getAttribute('data-testid')}.png`)});
     await p.getByRole('button',{name:'Close panel',exact:true}).click();
    }
   }
   await p.close();
  }
 }finally{await browser.close();}
}
writeFileSync(path.join(out,'gap-scan.json'),JSON.stringify({dossiers:dossiers.length,indexed:indexed.size,renderedChecks:ui.length,failures,ui},null,2));
console.log(JSON.stringify({dossiers:dossiers.length,indexed:indexed.size,renderedChecks:ui.length,failures:failures.length}));
assert.deepEqual(failures,[]);
