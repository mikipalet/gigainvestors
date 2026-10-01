import {expect,test} from '@playwright/test';
test.skip(process.env.VALUE_DESIGN_14!=='1','Requires the live-data design-14 server.');
for(const [width,height] of [[1728,970],[2056,1180],[1440,800],[390,844],[430,932]]){
 test(`timeline click, keys, rapid scrub and Today at ${width}`,async({page})=>{
  await page.setViewportSize({width,height});await page.goto('/');
  const slider=page.getByRole('slider',{name:'Fiscal year'}),frame=page.locator('.main-view');
  await expect(slider).toBeVisible();await expect(page.getByRole('button',{name:/Play time travel/})).toHaveCount(0);await expect(page.locator('.value-header')).toHaveCount(0);
  await slider.press('Home');const first=(await slider.getAttribute('aria-valuetext'))!.replace('Fiscal year ','');await expect(frame).toHaveAttribute('data-frame',first);await expect(page).toHaveURL(new RegExp('year='+first));
  await slider.press('ArrowRight');await expect(frame).toHaveAttribute('data-frame',String(Number(first)+1));
  const b=(await slider.boundingBox())!;await page.mouse.click(b.x+b.width*.5,b.y+b.height/2);await expect(frame).not.toHaveAttribute('data-frame',String(Number(first)+1));
  await page.mouse.move(b.x+2,b.y+b.height/2);await page.mouse.down();for(const x of [.2,.8,.3,.6])await page.mouse.move(b.x+b.width*x,b.y+b.height/2);await page.mouse.up();
  await expect.poll(()=>frame.getAttribute('data-frame')).toBe(await slider.getAttribute('aria-valuetext').then(v=>v!.replace('Fiscal year ','')));
  await slider.press('End');await expect(frame).toHaveAttribute('data-frame','Today');await expect(page).not.toHaveURL(/year=/);
  expect(await slider.evaluate(e=>getComputedStyle(e).outlineStyle)).toBe('none');
 });
}
for(const [width,height] of [[390,844],[430,932]])test(`real touch drag updates before release at ${width}`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});const page=await context.newPage();await page.goto('/');const slider=page.getByRole('slider',{name:'Fiscal year'});await slider.waitFor();const b=(await slider.boundingBox())!,y=b.y+b.height/2,client=await context.newCDPSession(page);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+2,y}]});const first=(await slider.getAttribute('aria-valuetext'))!.replace('Fiscal year ','');await expect(page.locator('.main-view')).toHaveAttribute('data-frame',first);
 await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width*.6,y}]});await expect(page.locator('.main-view')).not.toHaveAttribute('data-frame',first);
 await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width-2,y}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(page.locator('.main-view')).toHaveAttribute('data-frame','Today');await context.close();
});
test('back and forward restore year and content',async({page})=>{await page.goto('/?year=2011');await expect(page.getByRole('slider',{name:'Fiscal year'})).toBeVisible();await expect(page.locator('.main-view')).toHaveAttribute('data-frame','2011');await page.evaluate(()=>{history.pushState(null,'','/?year=2018');dispatchEvent(new PopStateEvent('popstate'));});await expect(page.locator('.main-view')).toHaveAttribute('data-frame','2018');await page.goBack();await expect(page.locator('.main-view')).toHaveAttribute('data-frame','2011');await page.goForward();await expect(page.locator('.main-view')).toHaveAttribute('data-frame','2018');});
test('company charts hover and keyboard independently; drawers close and restore focus',async({page})=>{
 await page.goto('/wkl.as');await expect(page.locator('.company-about')).not.toContainText('…');
 for(const chart of await page.locator('.chart-hit-area').all()){await chart.hover();await expect(page.getByRole('tooltip')).toBeVisible();await chart.focus();await chart.press('End');await expect(page.getByRole('tooltip')).toBeVisible();await expect(page.locator('dialog')).toHaveCount(0);await chart.press('Escape');}
 for(const button of await page.locator('.tile-open').all()){await button.click();await expect(page.locator('dialog')).toBeVisible();await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);await page.getByRole('button',{name:'Close panel'}).click();await expect(page.locator('dialog')).toHaveCount(0);await expect(button).toBeFocused();}
});

test('settled timeline selections create useful browser history',async({page})=>{await page.goto('/');const slider=page.getByRole('slider',{name:'Fiscal year'});await slider.press('Home');await expect(page).toHaveURL(/year=/);const first=await page.locator('.main-view').getAttribute('data-frame');await slider.press('ArrowRight');await expect(page).not.toHaveURL(new RegExp('year='+first+'$'));await page.goBack();await expect(page.locator('.main-view')).toHaveAttribute('data-frame',first!);await page.goForward();await expect(page.locator('.main-view')).toHaveAttribute('data-frame',String(Number(first)+1));});
test('mobile chart tap and full-screen sheet swipe dismissal',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),page=await context.newPage();await page.goto('/acn.us');
 const chart=page.locator('.chart-hit-area').first();await chart.tap();await expect(page.getByRole('tooltip')).toBeVisible();await expect(page.locator('dialog')).toHaveCount(0);
 await page.locator('.tile-open').first().tap();const dialog=page.locator('dialog');await expect(dialog).toBeVisible();expect(await dialog.evaluate(e=>e.clientWidth)).toBe(390);
 const client=await context.newCDPSession(page);await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:18}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:195,y:130}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(dialog).toHaveCount(0);await context.close();
});
test('drawer Esc, backdrop and focus containment',async({page})=>{await page.goto('/wkl.as');const open=page.locator('.tile-open').first();await open.click();await page.keyboard.press('Shift+Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);await page.keyboard.press('Escape');await expect(page.locator('dialog')).toHaveCount(0);await expect(open).toBeFocused();await open.click();await page.mouse.click(10,400);await expect(page.locator('dialog')).toHaveCount(0);});

test('visible companies and returns change with the year and restore at Today',async({page})=>{
 await page.goto('/');
 const slider=page.getByRole('slider',{name:'Fiscal year'}),frame=page.locator('.main-view');
 const snapshot=()=>page.locator('.shelf-body .main-company').evaluateAll(nodes=>nodes.map(n=>[n.getAttribute('data-company'),n.getAttribute('data-return')]));
 await expect(slider).toBeVisible();await expect(frame).toHaveAttribute('aria-busy','false');
 const today=await snapshot();expect(today.length).toBeGreaterThan(0);
 await slider.press('Home');await expect(frame).not.toHaveAttribute('data-frame','Today');await expect(frame).toHaveAttribute('aria-busy','false');
 await expect.poll(snapshot).not.toEqual(today);
 await slider.press('End');await expect(frame).toHaveAttribute('data-frame','Today');await expect.poll(snapshot).toEqual(today);
});

test('Escape closes every drawer from an active chart and restores its opener',async({page})=>{
 await page.goto('/acn.us');
 for(const open of await page.locator('.tile-open').all()){
  await open.click();const dialog=page.locator('dialog');await expect(dialog).toBeVisible();
  const chart=dialog.locator('.chart-hit-area').first();
  if(await chart.count()){await chart.focus();await chart.press('End');await expect(page.getByRole('tooltip')).toBeVisible();}
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(open).toBeFocused();
 }
});

test('drawer chart renders one selected point through the shared interaction layer',async({page})=>{
 await page.goto('/acn.us');await page.locator('.tile-open').first().click();
 const chart=page.locator('dialog .chart-interaction').first();await chart.locator('.chart-hit-area').press('End');
 await expect(chart.locator('svg circle')).toHaveCount(1);
});
