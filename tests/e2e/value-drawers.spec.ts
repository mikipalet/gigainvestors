import {test,expect} from '@playwright/test';
import {audit} from '../../scripts/value/design-audit.mjs';
test.skip(process.env.VALUE_DRAWERS!=='1','Requires the local live-data drawer server.');
for(const [width,height] of [[1728,970],[1440,800],[2056,1180],[390,844]])for(const path of ['/wkl.as','/jpm.us','/cbg.lse','/race.mi']){
 test(`${path} evidence fits ${width}x${height}`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width,height});await page.goto(path,{waitUntil:'networkidle'});
  for(const open of await page.locator('.tile-open').all()){
   await open.click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await page.waitForTimeout(280);
   await expect(dialog.getByRole('tab')).toHaveCount(0);await expect(dialog.getByRole('heading',{name:'Year by year',exact:false})).toBeVisible();await expect(dialog.getByRole('heading',{name:'From the filing'})).toBeAttached();
   await expect(dialog.locator('.filing-quotes blockquote')).not.toHaveCount(0);
   const chart=dialog.locator('.chart-hit-area').first();await chart.focus();await chart.press('End');await expect(dialog.getByRole('tooltip')).toBeVisible();await chart.evaluate(el=>(el as HTMLElement).blur());await page.mouse.move(0,0);
   expect((await page.evaluate(audit)).issues).toEqual([]);
   const geometry=await dialog.evaluate(el=>{const content=el.querySelector('.panel-content')!,r=el.getBoundingClientRect();let bottom=0;for(const child of el.querySelectorAll('*')){if(child.children.length||!child.checkVisibility())continue;const b=child.getBoundingClientRect();if(b.width>2&&b.height>2)bottom=Math.max(bottom,b.bottom-r.top);}return {empty:100*(1-bottom/r.height),overflow:content.scrollHeight-content.clientHeight,width:r.width,height:r.height};});
   if(width>767){expect(geometry.empty).toBeLessThan(8);expect(geometry.overflow).toBeLessThanOrEqual(1);}else{expect(geometry.width).toBe(width);expect(geometry.height).toBe(height);await dialog.locator('.panel-content').evaluate(el=>el.scrollTop=el.scrollHeight);await expect(dialog.locator('.filing-quotes a').first()).toBeInViewport();expect((await page.evaluate(audit)).issues).toEqual([]);}
   await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(open).toBeFocused();
  }
 });
}
test('negative retained earnings show signed window bars and the actual capital returned',async({page})=>{
 await page.goto('/wkl.as');await page.getByRole('button',{name:'Open Value created per $1 kept evidence'}).click();
 const values=JSON.parse((await page.locator('dialog [data-window]').getAttribute('data-window'))!);expect(values.retained).toBeLessThan(0);const bn=(n:number)=>Number((Math.abs(n)/1e9).toPrecision(3));await expect(page.locator('dialog .panel-answer')).toHaveText(`Returned EUR ${bn(values.retained)}bn more than it earned to owners while market value rose EUR ${bn(values.created)}bn: passes.`);
 await expect(page.locator('dialog .mini-dollar svg rect')).toHaveCount(2);
 await expect(page.locator('dialog')).not.toContainText('≥ EUR -1.35B');
});
