const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const out=process.env.AUDIT_OUT||'/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/unify-1-evidence/states-before';const base=process.env.AUDIT_URL||'https://gigainvestors.com';
(async()=>{fs.mkdirSync(out,{recursive:true});const b=await chromium.launch();const p=await b.newPage();const rows=[];
async function snap(id){await p.waitForTimeout(200);await p.screenshot({path:path.join(out,id+'.png')});rows.push({id,focus:await p.evaluate(()=>({tag:document.activeElement?.tagName,label:document.activeElement?.getAttribute('aria-label'),text:document.activeElement?.textContent?.slice(0,80)}))});}
for(const width of [1728,390]){await p.setViewportSize({width,height:width===390?844:970});
 for(const [name,url]of [['ha','/HA?q=2026Q2'],['home','/'],['value','/value'],['company','/s/AAPL']]){
  await p.goto(base+url,{waitUntil:'networkidle'});await p.keyboard.press('/');const input=p.getByRole('combobox',{name:/Search investor/});await input.waitFor();await snap(`${name}-search-empty-${width}`);await input.fill('Apple');await p.waitForTimeout(1300);await snap(`${name}-search-results-${width}`);await input.fill('zzzxxyunifymissing');await p.waitForTimeout(1600);await snap(`${name}-search-no-results-${width}`);await p.keyboard.press('Escape');
  const contact=p.locator('a[href="mailto:hello@gigainvestors.com"]').last();if(await contact.isVisible()){await contact.hover();await snap(`${name}-hover-${width}`);await contact.focus();await snap(`${name}-focus-${width}`);}
 }
 await p.goto(base+'/value',{waitUntil:'networkidle'});
 if(width===390){await p.getByRole('button',{name:'Filters',exact:true}).click();await p.waitForTimeout(250);await p.locator('dialog .panel-content').evaluate(e=>e.scrollTop=e.scrollHeight);await snap(`filters-bottom-${width}`);await p.keyboard.press('Escape');}
 else {for(const label of ['Country','Sector']){const c=p.getByRole('combobox',{name:label,exact:true});await c.click();await snap(`${label.toLowerCase()}-options-${width}`);await p.keyboard.press('ArrowDown');await snap(`${label.toLowerCase()}-focus-${width}`);await p.keyboard.press('Escape');}}
}
fs.writeFileSync(path.join(out,'states.json'),JSON.stringify(rows,null,2));await b.close();})();
