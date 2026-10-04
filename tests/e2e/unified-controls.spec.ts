import {test,expect} from '@playwright/test';
const routes=['/','/HA?q=2026Q2','/BRK','/MP','/value','/value?q=2026Q2','/value/year/2020','/s/UNIFYMISSING','/s/AAPL','/s/PLX.PA','/s/SPY','/value/method','/about','/newsletter','/privacy','/unify-missing-page','/value/forward','/unsubscribe','/munger','/newsletter/2026-q2'];
const order=['GigaInvestors','GigaValue','Search /','Method','Newsletter','Agent API','Contact'];
for(const size of [{width:1728,height:970},{width:2056,height:1180},{width:1440,height:800},{width:390,height:844}]){
 test.describe(`${size.width}×${size.height}`,()=>{
  test.use({viewport:size});
  for(const route of routes)test(`${route}: shared ordered chrome, no cut or overlap`,async({page})=>{
   await page.goto(route);const bar=page.getByRole('navigation',{name:'Site tools',exact:true});await expect(bar).toHaveCount(1);
   await expect(bar).toBeVisible();
   const controls=bar.locator('.dock-tools > a,.dock-tools > button');
   const labels=(await controls.allTextContents()).map(s=>s.replace(/\s+/g,' ').trim());
   expect(labels).toEqual(order.filter(x=>labels.includes(x)));expect(labels).toContain('Search /');expect(labels).toContain('Contact');
   for(const control of await controls.all()){
    const s=await control.evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {font:s.fontSize,padding:s.padding,height:r.height,decoration:s.textDecorationLine,x:r.x,y:r.y,right:r.right,bottom:r.bottom};});
    expect(s.font).toBe('12px');expect(s.padding).toBe('4px 8px');expect(s.height).toBe(20);expect(s.decoration).toBe('none');
    expect(s.x).toBeGreaterThanOrEqual(0);expect(s.right).toBeLessThanOrEqual(size.width);expect(s.y).toBeGreaterThanOrEqual(0);expect(s.bottom).toBeLessThanOrEqual(size.height);
   }
   const boxes=await controls.evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
   for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
    const a=boxes[i],b=boxes[j];expect(Math.min(a.right,b.right)-Math.max(a.x,b.x)>0&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>0).toBe(false);
   }
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const timeline=bar.getByRole('slider');
   if(['/','/value','/value?q=2026Q2','/value/year/2020','/BRK','/HA?q=2026Q2'].includes(route)){
    await expect(timeline).toHaveCount(1);
    const thumb=await bar.locator('.house-track>div:last-of-type').boundingBox(),dock=await bar.boundingBox();
    expect(thumb!.y).toBeGreaterThanOrEqual(dock!.y);
   }else await expect(timeline).toHaveCount(0);
   if(route.startsWith('/HA')||route==='/BRK'){
    await expect(page.locator('.legacy-investor aside>a')).toHaveCSS('font-size','12px');
    const content=await page.locator('.legacy-investor .locks-scroll').boundingBox();expect(content?.height).toBe(size.height-(size.width<640?84:48));
   }
  });
 });
}
test('search opens from every product and editorial context and Escape restores focus',async({page})=>{
 for(const route of ['/','/HA','/value','/s/AAPL','/about']){
  await page.goto(route);const trigger=page.getByRole('navigation',{name:'Site tools'}).getByRole('button',{name:'Search'});await trigger.click();
  await expect(page.getByRole('combobox',{name:/Search investor/})).toBeFocused();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
 }
});
