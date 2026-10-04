import {test,expect,chromium,webkit,devices,type Locator} from '@playwright/test';

async function centreHit(control:Locator){
 await control.scrollIntoViewIfNeeded();
 return control.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {ok:!!hit&&(el===hit||el.contains(hit)),hit:hit?.outerHTML.slice(0,200)};});
}
for(const [engine,type] of Object.entries({chromium,webkit}))for(const [width,height] of [[375,667],[390,664],[390,844],[414,896],[1440,900],[1728,970]]){
 test(`${engine} ${width}x${height}: shelf controls and immediate modal dismissal`,async()=>{
  const browser=await type.launch();
  const context=await browser.newContext({...(width<768?devices['iPhone 13']:{}),viewport:{width,height},hasTouch:true,isMobile:width<768});
  const page=await context.newPage();
  try{
   await page.goto(`${process.env.BASE_URL??'http://localhost:3000'}/value`,{waitUntil:'networkidle'});
   for(const selector of ['.main-buys>.main-more','.next-list-open','.main-rest>.main-more']){
    const control=page.locator(selector);if(!await control.count())continue;
    expect(await centreHit(control)).toMatchObject({ok:true});
    await control.tap();
    await expect(page.locator('dialog[open]')).toBeVisible();
    await page.locator('dialog .panel-content[aria-busy=false]').waitFor();
    const name=await page.locator('dialog[open]').getAttribute('aria-label');
    expect(name).toMatch(selector.includes('buys')?/Buy now/:selector.includes('next')?/Next closest/:/The rest/);
    // Inspect in the close click's next microtask, before an exit timer can expire.
    await page.evaluate((selector)=>{
     document.addEventListener('click',()=>queueMicrotask(()=>{
      const el=document.querySelector(selector)!,r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      (window as any).__released={modal:!!document.querySelector('dialog:modal'),hit:!!hit&&(el===hit||el.contains(hit))};
     }),{once:true});
    },selector);
    await page.getByRole('button',{name:'Close panel',exact:true}).tap();
    expect(await page.evaluate(()=>(window as any).__released)).toEqual({modal:false,hit:true});
    await control.tap();await expect(page.locator('dialog[open]')).toBeVisible();
    await page.keyboard.press('Escape');
    expect(await centreHit(control)).toMatchObject({ok:true});
   }
   await page.getByRole('button',{name:'Method',exact:true}).tap();
   const company=page.locator('.method-calibration a').filter({hasText:"Domino's"});
   expect(await centreHit(company)).toMatchObject({ok:true});
   await expect(company).toHaveAttribute('href','/s/DPZ');
   await company.tap();
   await expect(page).toHaveURL(/\/s\/DPZ$/);
   await expect(page.locator('.one-dossier')).toBeVisible();
   await page.goto(`${process.env.BASE_URL??'http://localhost:3000'}/s/ALL`,{waitUntil:'networkidle'});
   await page.getByRole('button',{name:'Open Honest profits evidence',exact:true}).tap();
   const filing=page.locator('dialog .filing-source');
   await expect(filing).toBeVisible();
   expect(await centreHit(filing)).toMatchObject({ok:true});
   await page.goto(`${process.env.BASE_URL??'http://localhost:3000'}/s/KO`,{waitUntil:'networkidle'});
   await page.getByRole('button',{name:/^Price story:/}).tap();
   expect(await centreHit(page.locator('dialog a').filter({hasText:'gross margin'}))).toMatchObject({ok:true});
  }finally{await context.close();await browser.close();}
 });
}
