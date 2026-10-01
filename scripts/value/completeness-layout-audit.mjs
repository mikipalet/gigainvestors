// Focused regression checks for complete-data dossiers, including extreme chart labels.
import {chromium} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {audit} from './design-audit.mjs';
const base=process.env.BASE_URL??'http://localhost:3013',out=process.env.AUDIT_OUT??'test-results/complete-1';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{
 for(const [width,height] of [[390,844],[768,1024],[1728,970]]){
  const p=await browser.newPage({viewport:{width,height}});
  for(const id of ['301217.she','2007.tw','inpp.lse','el8.au','race.mi','adbe.us']){
   await p.goto(base+'/'+id,{waitUntil:'networkidle'});
   const check=async surface=>{
    await p.waitForTimeout(120);const result=await p.evaluate(audit);
    const extra=await p.evaluate(()=>[...document.querySelectorAll('.panel-chart svg')].flatMap(svg=>{
     const box=svg.getBoundingClientRect();
     return [...svg.querySelectorAll('text')].flatMap(text=>{const b=text.getBoundingClientRect();return b.width&&(b.left<box.left-1||b.right>box.right+1)?[`Chart label outside plot: ${text.textContent}`]:[];});
    }));
    const text=await p.locator('body').innerText();
    if(/not enough (?:evidence|data)|not reported|unavailable|\bunclear\b|not tested|cannot judge/i.test(text))extra.push('Forbidden gap wording');
    results.push({id,width,surface,...result,issues:[...result.issues,...extra]});
   };
   await check('page');if(width===768)await p.screenshot({path:`${out}/tablet-${id}.png`});
   for(const key of ['understandable','moat','economics','management','accounting']){
    await p.getByTestId('tile-'+key).click();await p.getByRole('dialog').waitFor();await check(key+' Answer');
    if(id==='el8.au'||id==='inpp.lse'&&key==='management'||id==='adbe.us'&&key==='moat')await p.screenshot({path:`${out}/${width}-${id}-${key}-final.png`});
    await p.getByRole('button',{name:'Close panel',exact:true}).click();
   }
  }
  await p.close();
 }
}finally{await browser.close();}
writeFileSync(`${out}/layout-final.json`,JSON.stringify(results,null,2));
const failures=results.filter(r=>r.issues.length);console.log(JSON.stringify({checks:results.length,failures}));assert.deepEqual(failures,[]);
