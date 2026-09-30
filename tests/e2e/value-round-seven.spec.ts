import { expect,test } from '@playwright/test';
import { valueFixtures } from './value-fixtures';
test.beforeEach(async({page})=>valueFixtures(page));
test('tooltips stay within 24px of three pointers and keyboard focus reveals the same detail',async({page})=>{
 await page.goto('/value',{waitUntil:'networkidle'});
 for(const index of [0,3,6]) {
  const tile=page.getByTestId('company-tile').nth(index);const box=(await tile.boundingBox())!;
  const point={x:box.x+box.width/2,y:box.y+box.height/2};await page.mouse.move(point.x,point.y);
  const tooltip=page.getByRole('tooltip');await expect(tooltip).toBeVisible();
  const t=(await tooltip.boundingBox())!;
  const dx=Math.max(t.x-point.x,0,point.x-t.x-t.width),dy=Math.max(t.y-point.y,0,point.y-t.y-t.height);
  expect(Math.hypot(dx,dy)).toBeLessThanOrEqual(24);
  expect(t.x).toBeGreaterThanOrEqual(0);expect(t.x+t.width).toBeLessThanOrEqual(1400);
 }
 await page.mouse.move(0,0);await page.getByTestId('company-tile').first().focus();await expect(page.getByRole('tooltip')).toContainText('quality');
});
test('time travel replaces quality and prices, restores URL state and never shows current rows on missing history',async({page})=>{
 await page.goto('/value',{waitUntil:'networkidle'});
 await page.getByRole('slider',{name:'Fiscal year'}).focus();await page.keyboard.press('Home');
 await expect(page).toHaveURL(/year=2016/);await expect(page.getByRole('heading',{level:1})).toContainText('In 2016');
 await expect(page.locator('.one-index')).toHaveAttribute('data-buy-count','5');
 await expect(page.getByTestId('company-tile').filter({hasText:'Coca-Cola'})).toHaveCount(0);
 await page.reload({waitUntil:'networkidle'});await expect(page.getByRole('slider')).toHaveAttribute('aria-valuetext','Fiscal year 2016');
 await page.getByRole('slider').focus();await page.keyboard.press('ArrowRight');await expect(page).toHaveURL(/year=2017/);
 await page.getByRole('slider').focus();await page.keyboard.press('End');await expect(page).not.toHaveURL(/year=/);
 await page.route('**/main/history/2018.json',r=>r.fulfill({status:404,body:'{}'}));await page.goto('/value?year=2018');
 await expect(page.getByRole('status')).toContainText('History is unavailable');await expect(page.getByTestId('company-tile')).toHaveCount(0);
});
test('custom select supports keyboard and filters do not lose the chosen year',async({page})=>{
 await page.goto('/value?year=2018',{waitUntil:'networkidle'});
 const country=page.getByRole('combobox',{name:'Country'});await country.focus();await country.press('End');await country.press('Enter');
 await expect(page).toHaveURL(/year=2018/);await expect(page).toHaveURL(/country=US/);
 await expect(page.locator('select')).toHaveCount(0);
});
test('new identity fields render and a broken logo has a readable fallback',async({page})=>{
 await page.route('**/api/value/logo?domain=coca-cola.com',r=>r.fulfill({status:204}));
 await page.goto('/value/ko.us',{waitUntil:'networkidle'});
 await expect(page.locator('.company-about')).toContainText('soft drinks');
 await expect(page.locator('.plain-verdict')).toContainText('Buy zone');
 await expect(page.locator('.company-logo')).toContainText('C');
 await expect(page.locator('.tile-sentence')).toHaveCount(6);
});
test('historical quality includes companies absent from today’s default index',async({page})=>{
 const fs=await import('node:fs/promises');
 const rows=JSON.parse(await fs.readFile('tests/fixtures/value/store/index/US.json','utf8'));
 const base=rows[0];
 await page.route('**/main/index/US.json',r=>r.fulfill({json:[...rows,{...base,id:'OLD.US',n:'Former Quality Business',nameEn:'Former Quality Business',t:'FFFFF'}]}));
 await page.route('**/main/history/2018.json',r=>r.fulfill({json:[['OLD.US','PPPPP',.5,true,1.4]]}));
 await page.goto('/value?year=2018',{waitUntil:'networkidle'});
 await expect(page.getByTestId('company-tile')).toHaveCount(1);
 await expect(page.getByTestId('company-tile')).toContainText('Former Quality Business');
 await page.getByRole('button',{name:'All companies ↗',exact:true}).click();
 await expect(page.getByRole('row',{name:/Former Quality/})).toContainText('50% below its estimated value');
 await expect(page.getByRole('row',{name:/Former Quality/})).toContainText('+140%');
});
test('rapid timeline changes write the URL once after settling',async({page})=>{
 await page.goto('/value',{waitUntil:'networkidle'});
 await page.evaluate(()=>{
  const win=window as typeof window&{timelineWrites:number};win.timelineWrites=0;
  // Next mirrors a native URL change into its router state; count our app writes, not that internal mirror.
  const original=window.history.replaceState.bind(window.history);
  window.history.replaceState=(...args)=>{if(args[0]===null&&String(args[2]).includes('year='))win.timelineWrites++;original(...args);};
 });
 const slider=page.getByRole('slider',{name:'Fiscal year'});await slider.focus();
 await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
 await expect(page).toHaveURL(/year=2018/);
 expect(await page.evaluate(()=>(window as typeof window&{timelineWrites:number}).timelineWrites)).toBe(1);
});
test('same-size filter changes replace main-view identities',async({page})=>{
 await page.goto('/value',{waitUntil:'networkidle'});
 for(const [query,name] of [['Coca','Coca-Cola'],['Pepsi','PepsiCo']]) {
  await page.getByRole('button',{name:'Search companies'}).click();
  await page.getByPlaceholder('investor, firm, ticker, company').fill(query);
  await page.getByRole('button',{name:`Filter this list: ${query}`}).click();
  await expect(page.getByTestId('company-tile')).toHaveCount(1);
  await expect(page.getByTestId('company-tile')).toBeVisible();
  await expect(page.getByTestId('company-tile')).toContainText(name);
 }
});
test('phone Method panel exposes all seven cumulative gates',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/value',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Method ↗'}).click();
 const gates=page.getByRole('group',{name:'Filter by cumulative gate'}).getByRole('button');
 await expect(gates).toHaveCount(7);
 for(let i=0;i<7;i++)await expect(gates.nth(i)).toBeVisible();
 await expect(page.getByRole('dialog')).toContainText('Today’s gate breakdown');
});
test('dense desktop maps offer all companies without dead overflow blocks',async({page})=>{
 const fs=await import('node:fs/promises');const row=JSON.parse(await fs.readFile('tests/fixtures/value/store/index/US.json','utf8'))[0];
 await page.route('**/main/index/US.json',r=>r.fulfill({json:Array.from({length:239},(_,i)=>({...row,id:`DENSE${i}.US`,nameEn:`Business ${i}`,mc:1e9,b:false}))}));
 await page.goto('/value?country=US',{waitUntil:'networkidle'});
 expect(await page.getByTestId('company-tile').count()).toBeLessThan(100);
 await page.getByRole('button',{name:/Show all 239/}).click();
 await expect(page.getByTestId('results-table')).toHaveAttribute('aria-rowcount','240');
});
