// node scripts/value/design-panel-qa.mjs http://localhost:3190 /tmp/claude-1000/value-shots/design-5/panels
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const [base,out]=process.argv.slice(2);
mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const report=[];
for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:width===390?844:900}});
 for(const id of ['ko.us','aapl.us','cb.us','dal.us','pool.us','azn.lse','7203.jp']){
  await page.goto(`${base}/${id}`,{waitUntil:'networkidle'});
  for(const [i,key] of ['understandable','moat','economics','management','accounting','price','valuation'].entries()){
   if(i<6)await page.getByTestId(`tile-${key}`).click();else await page.getByTestId('valuation-open').click();
   const dialog=page.getByRole('dialog');await dialog.waitFor();await page.waitForTimeout(250);
   const dimensions=await page.evaluate(()=>({height:document.documentElement.scrollHeight,viewport:innerHeight,width:document.documentElement.scrollWidth}));
   await page.screenshot({path:`${out}/${width}-${id}-${key}.png`});
   const content=dialog.locator('.panel-content');const max=await content.evaluate(el=>el.scrollHeight-el.clientHeight);
   // Capture every internal screen too, to inspect all evidence rather than only the panel heading.
   for(let pos=width===390?620:720,n=1;process.argv.includes('--deep')&&pos<max+700;pos+=width===390?620:720,n++){
    if(max<=0)break;
    await content.evaluate((el,pos)=>{el.scrollTop=pos;},pos);
    await page.screenshot({path:`${out}/${width}-${id}-${key}-${n}.png`});
    if(pos>=max)break;
   }
   const issues=await dialog.evaluate(el=>{
    const errors=[];const bounds=el.getBoundingClientRect();
    for(const svg of el.querySelectorAll('svg')){
     const labels=[...svg.querySelectorAll('text')].map(t=>({text:t.textContent,b:t.getBoundingClientRect()})).filter(t=>t.b.width>0);
     for(let a=0;a<labels.length;a++)for(let b=a+1;b<labels.length;b++){const x=labels[a].b,y=labels[b].b;if(x.left<y.right-1&&y.left<x.right-1&&x.top<y.bottom-1&&y.top<x.bottom-1)errors.push(`Labels overlap: ${labels[a].text} / ${labels[b].text}`);}
     for(const t of labels)if(t.b.right>bounds.right+1||t.b.left<bounds.left-1)errors.push(`Outside panel: ${t.text}`);
    }
    return errors;
   });
   if(dimensions.height!==dimensions.viewport||dimensions.width!==width)throw new Error(`Viewport overflow: ${id} ${key}`);
   report.push({id,width,panel:key,...dimensions,internalScroll:max,issues});
   await page.keyboard.press('Escape');
  }
 }
 await page.close();
}
writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();
